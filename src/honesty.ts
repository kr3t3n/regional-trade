/**
 * Honesty checks for the Workbench + Timber brace gates and paid cargo.
 * Run: npx tsx src/honesty.ts
 * Vale cannot harvest ore or timber; crafts need travel; NPC spreads stay in config.
 */
import {
  createInitialState,
  canHarvest,
  harvestClick,
  canCraftWorkbench,
  craftWorkbench,
  canCraftTimberBrace,
  craftTimberBrace,
  canDepart,
  cargoCap,
  cargoUpgradeCost,
  canBuyCargoUpgrade,
  buyCargoUpgrade,
  tick,
  depart,
  sellToNpc,
  buyFromNpc,
  npcSellPrice,
  npcBuyPrice,
  npcTradeTotal,
  REGIONS,
  HARVEST,
  TRAVEL,
  NEXT_RECIPE_NEEDS,
  WORKBENCH_UNLOCK_CARGO,
  CARGO_UPGRADE,
  TIMBER_BRACE_COST,
  recipeNeeds,
} from './game';
import { saveGame, loadGame, resetGame, clearSave } from './persist';
import { HELP_KEY, SAVE_KEY } from './config';
import { helperMarkup, loadHelpOpen, saveHelpOpen } from './help';
import { FIELD_NOTES_CRAFT, MISSION } from './mission';
import {
  T0_LOG,
  TUTORIAL_STEPS,
  dismissTutorial,
  inferTutorialStep,
  startTutorial,
  syncTutorial,
} from './tutorial';

function installMemoryStorage() {
  const store = new Map<string, string>();
  const memory = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memory,
  });
}

export function honestyReport(): string[] {
  const errors: string[] = [];

  const vale = createInitialState();
  if (vale.region !== 'vale') errors.push('spawn must be Vale');
  if (REGIONS.vale.local.includes('ore')) errors.push('Vale must not harvest ore');
  if (REGIONS.vale.foreign.includes('ore') === false) errors.push('ore must be foreign in Vale');
  if (canHarvest(vale, 'ore')) errors.push('canHarvest(ore) true in Vale');
  if (harvestClick(vale, 'ore')) errors.push('harvestClick(ore) succeeded in Vale');
  if (REGIONS.vale.local.includes('timber')) errors.push('Vale must not harvest timber');
  if (REGIONS.vale.foreign.includes('timber') === false) errors.push('timber must be foreign in Vale');
  if (canHarvest(vale, 'timber')) errors.push('canHarvest(timber) true in Vale');
  if (harvestClick(vale, 'timber')) errors.push('harvestClick(timber) succeeded in Vale');
  if (!REGIONS.ridge.local.includes('timber')) errors.push('Ridge must grow timber for the brace haul');

  vale.stashes.vale.grain = 99;
  vale.energy = HARVEST.energyCap;
  if (canCraftWorkbench(vale) === null) {
    errors.push('Workbench craftable in Vale with only grain (ore missing)');
  }
  vale.stashes.vale.ore = 20;
  if (canCraftWorkbench(vale) !== null) {
    errors.push(`Vale with 20/20 should craft, got: ${canCraftWorkbench(vale)}`);
  }

  const ridgeOreSell = npcSellPrice('ridge', 'ore');
  if (Math.abs(ridgeOreSell - 1.3) > 1e-9) {
    errors.push(`Ridge ore NPC sell must be 1.3P, got ${ridgeOreSell}`);
  }
  const ridgeGrainBuy = npcBuyPrice('ridge', 'grain');
  if (Math.abs(ridgeGrainBuy - 1.05) > 1e-9) {
    errors.push(`Ridge grain NPC buy must be 1.05P, got ${ridgeGrainBuy}`);
  }
  const valeOreSell = npcSellPrice('vale', 'ore');
  if (Math.abs(valeOreSell - 1.15) > 1e-9) {
    errors.push(`Vale ore NPC sell must be 1.15P (foreign), got ${valeOreSell}`);
  }

  // Arrival mid-tick: no full-dt idle credit
  const trip = createInitialState();
  trip.stashes.vale.grain = 30;
  const ok = depart(trip, {
    to: 'ridge',
    cargo: { grain: 20, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  if (!ok || !trip.travel) errors.push('depart Vale→Ridge failed');
  else {
    trip.travel.elapsed = trip.travel.duration - 0.01;
    const timberBefore = trip.stashes.ridge.timber;
    tick(trip, 1); // would grant 0.2 timber if full-dt idle applied on arrival
    if (trip.region !== 'ridge' || trip.travel) errors.push('should arrive Ridge this tick');
    const gained = trip.stashes.ridge.timber - timberBefore;
    // remainder idle ≤ ~0.99s × 0.2 = 0.198; full 1s idle = 0.2
    if (gained >= HARVEST.idlePerSecond * 0.995) {
      errors.push(`arrival tick granted full idle (${gained}); remainder only`);
    }
    if (gained < 0) errors.push('negative idle on arrival');
  }

  if (TRAVEL.cargoCap !== 40) errors.push(`cargo cap ${TRAVEL.cargoCap} ≠ 40`);
  if (HARVEST.energyCap !== 30) errors.push(`energy ${HARVEST.energyCap} ≠ 30`);

  const idleTrip = createInitialState();
  idleTrip.stashes.vale.grain = 10;
  depart(idleTrip, {
    to: 'ridge',
    cargo: { grain: 5, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  const g0 = idleTrip.stashes.vale.grain;
  tick(idleTrip, 2);
  if (idleTrip.stashes.vale.grain !== g0) {
    errors.push('idle ran while in transit');
  }

  const crafted = createInitialState();
  crafted.stashes.vale.grain = 20;
  crafted.stashes.vale.ore = 20;
  if (!craftWorkbench(crafted) || !crafted.workbenchCrafted) {
    errors.push('craft Workbench failed with 20/20 in Vale');
  }
  if (TRAVEL.cargoCap !== 40) errors.push(`cargo cap base ${TRAVEL.cargoCap} ≠ 40`);
  if (WORKBENCH_UNLOCK_CARGO !== 5) errors.push(`brace cargo unlock ${WORKBENCH_UNLOCK_CARGO} ≠ 5`);
  if (cargoCap(crafted) !== 40) {
    errors.push('Workbench must not apply cargo +5 (cap stays 40 until brace)');
  }
  if (!REGIONS.vale.foreign.includes(NEXT_RECIPE_NEEDS)) {
    errors.push('next recipe must still spend a Vale-foreign good');
  }
  if (!recipeNeeds(TIMBER_BRACE_COST).some(([g]) => g === NEXT_RECIPE_NEEDS)) {
    errors.push('Timber brace recipe must spend timber');
  }
  if (!recipeNeeds(TIMBER_BRACE_COST).some(([g]) => REGIONS.vale.local.includes(g))) {
    errors.push('Timber brace should also spend a Vale-local good in this stash');
  }
  if (canCraftTimberBrace(createInitialState()) === null) {
    errors.push('Timber brace craftable before Workbench');
  }
  const earlyBrace = createInitialState();
  earlyBrace.stashes.vale.grain = 15;
  earlyBrace.stashes.vale.timber = 20;
  if (canCraftTimberBrace(earlyBrace) === null) {
    errors.push('Timber brace craftable before Workbench with materials');
  }
  crafted.stashes.vale.grain = 99;
  crafted.stashes.vale.fibre = 99;
  if (canCraftTimberBrace(crafted) === null) {
    errors.push('Timber brace craftable in Vale with only local goods');
  }
  crafted.stashes.vale.grain = 15;
  crafted.stashes.vale.timber = 20;
  if (canCraftTimberBrace(crafted) !== null) {
    errors.push(`Vale with workbench + brace recipe should craft, got: ${canCraftTimberBrace(crafted)}`);
  }
  if (!craftTimberBrace(crafted) || !crafted.timberBraceCrafted) {
    errors.push('craft Timber brace failed with grain/timber in Vale');
  }
  if (cargoCap(crafted) !== 45) {
    errors.push(`Timber brace should raise cargo cap to 45, got ${cargoCap(crafted)}`);
  }
  if (TRAVEL.cargoCap !== 40) errors.push('TRAVEL.cargoCap must stay the base 40');

  const tight = createInitialState();
  tight.stashes.vale.grain = 50;
  const overBase = canDepart(tight, {
    to: 'ridge',
    cargo: { grain: 41, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  if (!overBase) errors.push('base cap 40 should reject 41 cargo');
  tight.timberBraceCrafted = true;
  const overBrace = canDepart(tight, {
    to: 'ridge',
    cargo: { grain: 41, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  if (overBrace) errors.push(`brace cap 45 should allow 41 cargo, got: ${overBrace}`);

  if (CARGO_UPGRADE.capPerTier !== 5) errors.push(`paid cargo tier ${CARGO_UPGRADE.capPerTier} ≠ 5`);
  const firstCost = cargoUpgradeCost(0);
  const secondCost = cargoUpgradeCost(1);
  if (firstCost.coin !== CARGO_UPGRADE.coinBase || firstCost.goodAmount !== CARGO_UPGRADE.goodBase) {
    errors.push('first cargo upgrade cost must match CARGO_UPGRADE bases');
  }
  if (secondCost.coin <= firstCost.coin || secondCost.goodAmount <= firstCost.goodAmount) {
    errors.push('cargo upgrade cost must rise each tier');
  }

  const cart = createInitialState();
  cart.stashes.vale.grain = 80;
  cart.coin = firstCost.coin;
  if (canBuyCargoUpgrade(cart, 'ore') === null) {
    errors.push('cargo upgrade should reject a Vale-foreign good');
  }
  if (canBuyCargoUpgrade(cart, 'grain') !== null) {
    errors.push(`Vale with coin + grain should buy first cart, got: ${canBuyCargoUpgrade(cart, 'grain')}`);
  }
  if (!buyCargoUpgrade(cart, 'grain') || cart.cargoUpgrades !== 1) {
    errors.push('first paid cargo upgrade failed');
  }
  if (cargoCap(cart) !== 45) {
    errors.push(`paid upgrade without brace should be 45, got ${cargoCap(cart)}`);
  }
  if (Math.abs(cart.coin) > 1e-9) errors.push('cargo upgrade must spend coin');
  if (Math.abs(cart.stashes.vale.grain - (80 - firstCost.goodAmount)) > 1e-9) {
    errors.push('cargo upgrade must spend the local good');
  }
  if (canBuyCargoUpgrade(cart, 'grain') === null) {
    errors.push('second cart should be blocked after spending first-tier coin');
  }
  cart.coin = secondCost.coin;
  cart.stashes.vale.grain = secondCost.goodAmount;
  if (!buyCargoUpgrade(cart, 'grain') || cargoCap(cart) !== 50) {
    errors.push(`second paid upgrade should raise cap to 50, got ${cargoCap(cart)}`);
  }

  const stacked = createInitialState();
  stacked.timberBraceCrafted = true;
  stacked.cargoUpgrades = 1;
  if (cargoCap(stacked) !== 50) {
    errors.push(`brace + one paid tier should be 50, got ${cargoCap(stacked)}`);
  }
  const paidThenBrace = createInitialState();
  paidThenBrace.cargoUpgrades = 1;
  if (cargoCap(paidThenBrace) !== 45) {
    errors.push(`one paid tier without brace should be 45, got ${cargoCap(paidThenBrace)}`);
  }
  paidThenBrace.timberBraceCrafted = true;
  if (cargoCap(paidThenBrace) !== 50) {
    errors.push(`paid then brace should stack to 50, got ${cargoCap(paidThenBrace)}`);
  }

  const roadCart = createInitialState();
  roadCart.stashes.vale.grain = 40;
  roadCart.coin = firstCost.coin;
  depart(roadCart, {
    to: 'ridge',
    cargo: { grain: 10, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  if (canBuyCargoUpgrade(roadCart, 'grain') === null) {
    errors.push('cargo upgrade must not buy in transit');
  }
  const feeStill = createInitialState();
  feeStill.cargoUpgrades = 2;
  feeStill.stashes.vale.grain = 1;
  const noFee = canDepart(feeStill, {
    to: 'ridge',
    cargo: { grain: 0, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  if (!noFee) errors.push('wider cart must still pay the local travel fee');
  const packedWide = createInitialState();
  packedWide.timberBraceCrafted = true;
  packedWide.cargoUpgrades = 1;
  packedWide.stashes.vale.grain = 60;
  const overPaid = canDepart(packedWide, {
    to: 'ridge',
    cargo: { grain: 51, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  if (!overPaid) errors.push('brace + paid cap 50 should reject 51 cargo');
  const atPaid = canDepart(packedWide, {
    to: 'ridge',
    cargo: { grain: 50, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  if (atPaid) errors.push(`brace + paid cap 50 should allow 50 cargo, got: ${atPaid}`);

  // Sell/buy spreads: not 1:1. Confirm = amount × unit (coin only, no barter).
  const m = createInitialState();
  m.region = 'ridge';
  m.stashes.ridge.grain = 10;
  sellToNpc(m, 'grain', 10);
  if (Math.abs(m.coin - 10.5) > 1e-9) errors.push(`Ridge grain sale coin ${m.coin} ≠ 10.5`);
  buyFromNpc(m, 'ore', 1);
  if (Math.abs(m.stashes.ridge.ore - 1) > 1e-9) errors.push('buy 1 ore failed');
  if (Math.abs(m.coin - (10.5 - 1.3)) > 1e-9) errors.push(`after ore buy coin ${m.coin} ≠ 9.2`);

  const bulkSellUnit = npcBuyPrice('ridge', 'grain');
  const bulkBuyUnit = npcSellPrice('ridge', 'ore');
  if (Math.abs(npcTradeTotal(bulkSellUnit, 4) - 4 * bulkSellUnit) > 1e-9) {
    errors.push('npcTradeTotal must be amount × unit price');
  }
  const bulk = createInitialState();
  bulk.region = 'ridge';
  bulk.stashes.ridge.grain = 4;
  sellToNpc(bulk, 'grain', 4);
  if (Math.abs(bulk.coin - npcTradeTotal(bulkSellUnit, 4)) > 1e-9) {
    errors.push(`sell confirm must credit amount × unit, got ${bulk.coin}`);
  }
  buyFromNpc(bulk, 'ore', 2);
  const afterBuy = npcTradeTotal(bulkSellUnit, 4) - npcTradeTotal(bulkBuyUnit, 2);
  if (Math.abs(bulk.coin - afterBuy) > 1e-9) {
    errors.push(`buy confirm must spend amount × unit, got ${bulk.coin}`);
  }

  if (vale.log[0] !== T0_LOG) errors.push('initial log must be the T0 one-liner');
  if (/1\.05|carry ~28|honesty/i.test(vale.log.join(' '))) {
    errors.push('initial log still dumps the old route recipe');
  }
  if (/honesty/i.test(TUTORIAL_STEPS[4].html)) {
    errors.push('T4 must not say honesty');
  }
  if (!/timber brace/i.test(TUTORIAL_STEPS[8].html)) {
    errors.push('T8 should point at timber brace');
  }
  if (/honesty|1:1|global board|free travel/i.test(TUTORIAL_STEPS[8].html)) {
    errors.push('T8 must not spoil honesty suite');
  }
  if (MISSION.workbench.why !== 'First reason to leave home — ore is not local here.') {
    errors.push('Workbench why-copy drifted from Fable');
  }
  if (MISSION.timberBrace.why !== 'Keeps you on the road — timber does not grow in Vale.') {
    errors.push('Timber brace why-copy drifted from Fable');
  }
  const notes = helperMarkup();
  if (!notes.includes('First reason to leave home')) {
    errors.push('Field notes craft missing Workbench why-copy');
  }
  if (!/timber brace/i.test(notes)) {
    errors.push('Field notes craft missing timber brace');
  }
  if (!/paid upgrade/i.test(notes)) {
    errors.push('Field notes cargo missing paid upgrades');
  }
  if (/honesty|free travel/i.test(FIELD_NOTES_CRAFT) || /honesty|free travel/i.test(notes)) {
    errors.push('Field notes must not spoil honesty suite');
  }

  const walk = createInitialState();
  if (!walk.tutorial.splash || walk.tutorial.step !== 0) {
    errors.push('fresh save must start on splash + T0');
  }
  startTutorial(walk);
  syncTutorial(walk, 'start');
  if (walk.tutorial.splash) errors.push('Start in Vale should close the splash');
  if (inferTutorialStep(walk) !== 0) errors.push('empty Vale should stay T0');

  walk.energy = HARVEST.energyCap;
  harvestClick(walk, 'grain');
  syncTutorial(walk, 'harvest');
  if (walk.tutorial.step !== 1) errors.push(`after first harvest expected T1, got T${walk.tutorial.step}`);

  walk.stashes.vale.grain = 8;
  syncTutorial(walk);
  if (walk.tutorial.step !== 2) errors.push(`stacking grain expected T2, got T${walk.tutorial.step}`);

  walk.stashes.vale.grain = 50;
  syncTutorial(walk);
  if (walk.tutorial.step !== 3) errors.push(`pack-ready expected T3, got T${walk.tutorial.step}`);

  const packed = depart(walk, {
    to: 'ridge',
    cargo: { grain: 28, ore: 0, timber: 0, fibre: 0 },
    feeGood: 'grain',
  });
  syncTutorial(walk);
  if (!packed || walk.tutorial.step !== 4) {
    errors.push(`depart Ridge expected T4, got T${walk.tutorial.step}`);
  }
  if (!walk.log[0].includes('Left Vale for Ridge')) {
    errors.push(`depart log should match Fable haul voice, got: ${walk.log[0]}`);
  }

  walk.travel!.elapsed = walk.travel!.duration;
  tick(walk, 0.05);
  syncTutorial(walk);
  if (walk.region !== 'ridge' || walk.tutorial.step !== 5) {
    errors.push(`Ridge arrival expected T5, got T${walk.tutorial.step} region=${walk.region}`);
  }
  if (walk.log[0] !== 'Ridge. Market open.') {
    errors.push(`Ridge log should be market-open, got: ${walk.log[0]}`);
  }

  sellToNpc(walk, 'grain', 28);
  syncTutorial(walk, 'sell');
  buyFromNpc(walk, 'ore', 22);
  syncTutorial(walk, 'buy');
  if (walk.tutorial.step !== 6) errors.push(`after ore buy expected T6, got T${walk.tutorial.step}`);
  if (!walk.log.some((l) => l === 'Sold 28 grain.')) errors.push('sell log should be Sold N grain');
  if (!walk.log.some((l) => l === 'Bought 22 ore.')) errors.push('buy log should be Bought N ore');

  const home = depart(walk, {
    to: 'vale',
    cargo: { grain: 0, ore: 20, timber: 0, fibre: 0 },
    feeGood: 'ore',
  });
  syncTutorial(walk);
  if (!home || walk.tutorial.step !== 6) errors.push('return trip should stay T6');
  walk.travel!.elapsed = walk.travel!.duration;
  tick(walk, 0.05);
  syncTutorial(walk);
  if (walk.tutorial.step !== 7) errors.push(`Vale with 20 ore expected T7, got T${walk.tutorial.step}`);

  if (!craftWorkbench(walk) || !walk.workbenchCrafted) {
    errors.push('first-trip walk failed to craft Workbench');
  }
  syncTutorial(walk);
  if (walk.tutorial.step !== 8) errors.push(`craft expected T8, got T${walk.tutorial.step}`);
  if (walk.log[0] !== 'Workbench stands in Vale.') {
    errors.push(`craft log should be Workbench stands in Vale, got: ${walk.log[0]}`);
  }
  if (cargoCap(walk) !== 40) errors.push('first-trip Workbench must leave cargo cap at 40');
  if (canCraftTimberBrace(walk) === null) {
    errors.push('Timber brace craftable after Workbench without timber');
  }
  walk.stashes.vale.grain = 15;
  walk.stashes.vale.timber = 20;
  if (!craftTimberBrace(walk) || !walk.timberBraceCrafted) {
    errors.push('second-trip walk failed to craft Timber brace');
  }
  if (walk.tutorial.step !== 8) errors.push('brace craft should leave T8 as complete');
  if (walk.log[0] !== 'Timber brace set in Vale.') {
    errors.push(`brace log should be Timber brace set in Vale, got: ${walk.log[0]}`);
  }
  if (cargoCap(walk) !== 45) errors.push('Timber brace must raise cargo cap to 45');

  dismissTutorial(walk);
  if (!walk.tutorial.dismissed) errors.push('Got it should dismiss the coach');

  installMemoryStorage();
  if (loadHelpOpen()) errors.push('helper should stay closed on first visit');
  if (loadHelpOpen()) errors.push('helper should stay closed after first-visit store');
  saveHelpOpen(true);
  if (!loadHelpOpen()) errors.push('helper on preference not remembered');
  saveHelpOpen(false);
  if (loadHelpOpen()) errors.push('helper off preference not remembered');
  saveHelpOpen(true);
  const helperBeforeReset = localStorage.getItem(HELP_KEY);

  const saved = createInitialState();
  saved.stashes.vale.grain = 17;
  saved.stashes.ridge.ore = 4;
  saved.coin = 3.5;
  saved.energy = 11;
  saved.nodes.vale.grain = 3;
  saved.workbenchCrafted = false;
  saved.tutorial.splash = false;
  saved.tutorial.dismissed = true;
  saved.tutorial.step = 3;
  saveGame(saved);
  const loaded = loadGame();
  if (!loaded) errors.push('loadGame returned null after save');
  else {
    if (loaded.stashes.vale.grain !== 17) errors.push('persist lost Vale grain');
    if (loaded.stashes.ridge.ore !== 4) errors.push('persist lost Ridge ore');
    if (loaded.coin !== 3.5) errors.push('persist lost coin');
    if (loaded.energy !== 11) errors.push('persist lost energy');
    if (loaded.nodes.vale.grain !== 3) errors.push('persist lost node level');
    if (loaded.region !== 'vale') errors.push('persist lost region');
    if (!loaded.tutorial.dismissed || loaded.tutorial.step !== 3) {
      errors.push('persist lost tutorial dismiss / step');
    }
    if (loaded.timberBraceCrafted) errors.push('persist invented timber brace');
    if (loaded.cargoUpgrades !== 0) errors.push('persist invented cargo upgrades');
  }
  const bracedSave = createInitialState();
  bracedSave.workbenchCrafted = true;
  bracedSave.timberBraceCrafted = true;
  bracedSave.tutorial.splash = false;
  bracedSave.tutorial.dismissed = true;
  bracedSave.tutorial.step = 8;
  saveGame(bracedSave);
  const bracedLoaded = loadGame();
  if (!bracedLoaded?.timberBraceCrafted || cargoCap(bracedLoaded) !== 45) {
    errors.push('persist lost timber brace / cargo +5');
  }
  if (bracedLoaded?.cargoUpgrades !== 0) errors.push('brace persist invented paid cargo tiers');
  const cartSave = createInitialState();
  cartSave.workbenchCrafted = true;
  cartSave.timberBraceCrafted = true;
  cartSave.cargoUpgrades = 2;
  cartSave.tutorial.splash = false;
  cartSave.tutorial.dismissed = true;
  cartSave.tutorial.step = 8;
  saveGame(cartSave);
  const cartLoaded = loadGame();
  if (!cartLoaded || cartLoaded.cargoUpgrades !== 2 || cargoCap(cartLoaded) !== 55) {
    errors.push('persist lost paid cargo upgrades / stacked cap');
  }
  const rawCart = localStorage.getItem(SAVE_KEY);
  if (rawCart) {
    const parsed = JSON.parse(rawCart) as { cargoUpgrades?: number };
    delete parsed.cargoUpgrades;
    localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
    const migratedCart = loadGame();
    if (migratedCart?.cargoUpgrades !== 0) {
      errors.push('legacy save without cargoUpgrades should load 0 paid tiers');
    }
  }
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as { timberBraceCrafted?: boolean };
    delete parsed.timberBraceCrafted;
    localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
    const migrated = loadGame();
    if (migrated?.timberBraceCrafted) {
      errors.push('legacy save without brace flag should load brace off');
    }
  }
  const reset = resetGame();
  if (reset.stashes.vale.grain !== 0 || reset.energy !== HARVEST.energyCap) {
    errors.push('resetGame did not restore initial stash/energy');
  }
  if (reset.cargoUpgrades !== 0 || cargoCap(reset) !== 40) {
    errors.push('reset must clear paid cargo upgrades back to cap 40');
  }
  if (!reset.tutorial.splash || reset.tutorial.step !== 0 || reset.tutorial.dismissed) {
    errors.push('reset must restart splash + T0–T8');
  }
  if (localStorage.getItem(HELP_KEY) !== helperBeforeReset) {
    errors.push('reset must not touch regional-trade-helper');
  }
  if (loadGame() !== null) errors.push('reset left a localStorage snapshot');
  clearSave();

  return errors;
}

const errors = honestyReport();
if (errors.length) {
  console.error('Honesty failed:\n' + errors.map((e) => ` - ${e}`).join('\n'));
  throw new Error('honesty');
}
console.log('Honesty ok: Vale cannot harvest ore or timber; Workbench then Timber brace; cargo +5 only after brace; paid cart stacks on current cap; Ridge ore 1.3P; no transit idle; no arrival full-tick credit.');
