/**
 * Honesty checks for the Workbench gate. Run: npx tsx src/honesty.ts
 * Vale cannot harvest ore; craft needs travel; NPC spreads stay in config.
 */
import {
  createInitialState,
  canHarvest,
  harvestClick,
  canCraftWorkbench,
  craftWorkbench,
  tick,
  depart,
  sellToNpc,
  buyFromNpc,
  npcSellPrice,
  npcBuyPrice,
  REGIONS,
  HARVEST,
  TRAVEL,
} from './game';
import { saveGame, loadGame, resetGame, clearSave } from './persist';

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

  // Sell/buy spreads: not 1:1
  const m = createInitialState();
  m.region = 'ridge';
  m.stashes.ridge.grain = 10;
  sellToNpc(m, 'grain', 10);
  if (Math.abs(m.coin - 10.5) > 1e-9) errors.push(`Ridge grain sale coin ${m.coin} ≠ 10.5`);
  buyFromNpc(m, 'ore', 1);
  if (Math.abs(m.stashes.ridge.ore - 1) > 1e-9) errors.push('buy 1 ore failed');
  if (Math.abs(m.coin - (10.5 - 1.3)) > 1e-9) errors.push(`after ore buy coin ${m.coin} ≠ 9.2`);

  installMemoryStorage();
  const saved = createInitialState();
  saved.stashes.vale.grain = 17;
  saved.stashes.ridge.ore = 4;
  saved.coin = 3.5;
  saved.energy = 11;
  saved.nodes.vale.grain = 3;
  saved.workbenchCrafted = false;
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
  }
  const reset = resetGame();
  if (reset.stashes.vale.grain !== 0 || reset.energy !== HARVEST.energyCap) {
    errors.push('resetGame did not restore initial stash/energy');
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
console.log('Honesty ok: Vale cannot harvest ore; Workbench needs travel; Ridge ore 1.3P; no transit idle; no arrival full-tick credit.');
