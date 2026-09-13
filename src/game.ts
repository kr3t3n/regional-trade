import {
  GOODS,
  GOOD_LABEL,
  REGION_IDS,
  REGIONS,
  HARVEST,
  TRAVEL,
  WORKBENCH_COST,
  TIMBER_BRACE_COST,
  NEXT_RECIPE_NEEDS,
  WORKBENCH_UNLOCK_CARGO,
  TICK_HZ,
  SAVE_KEY,
  OFFLINE_CATCHUP_SECONDS,
  recipeNeeds,
  recipeLabel,
  type Good,
  type RegionId,
  travelSeconds,
  npcBuyPrice,
  npcSellPrice,
  npcTradeTotal,
} from './config';
import { T0_LOG, createTutorialState, type TutorialState } from './tutorial';

export type Inventory = Record<Good, number>;

export interface TravelState {
  from: RegionId;
  to: RegionId;
  elapsed: number;
  duration: number;
  /** Cargo carried (removed from warehouse on depart) */
  cargo: Inventory;
  /** Fee paid (lost on cancel) */
  feeGood: Good;
  feeAmount: number;
}

export interface GameState {
  region: RegionId | null; // null while in transit
  warehouse: Inventory; // goods at current region / home stash conceptually one pool for solo v1
  /** Goods stored per region (you leave cargo behind when you travel unless in cargo) */
  stashes: Record<RegionId, Inventory>;
  coin: number;
  energy: number;
  energyRegenAcc: number;
  /** Node levels per region per local good (starts at 1 unlocked) */
  nodes: Record<RegionId, Partial<Record<Good, number>>>;
  travel: TravelState | null;
  workbenchCrafted: boolean;
  timberBraceCrafted: boolean;
  log: string[];
  tutorial: TutorialState;
}

export function emptyInv(): Inventory {
  return { grain: 0, ore: 0, timber: 0, fibre: 0 };
}

export function cloneInv(inv: Inventory): Inventory {
  return { ...inv };
}

function sumInv(inv: Inventory): number {
  return GOODS.reduce((s, g) => s + inv[g], 0);
}

export function createInitialState(): GameState {
  const stashes = Object.fromEntries(REGION_IDS.map((id) => [id, emptyInv()])) as Record<
    RegionId,
    Inventory
  >;
  const nodes: Record<RegionId, Partial<Record<Good, number>>> = {
    vale: { grain: 1, fibre: 1 },
    ridge: { ore: 1, timber: 1 },
    cross: { grain: 1, ore: 1 },
  };
  return {
    region: 'vale',
    warehouse: emptyInv(), // unused; stashes hold goods per region
    stashes,
    coin: 0,
    energy: HARVEST.energyCap,
    energyRegenAcc: 0,
    nodes,
    travel: null,
    workbenchCrafted: false,
    timberBraceCrafted: false,
    log: [T0_LOG],
    tutorial: createTutorialState(),
  };
}

/** Live cargo cap. Base 40 until Timber brace; then +5. Not a #6 paid upgrade. */
export function cargoCap(state: Pick<GameState, 'timberBraceCrafted'>): number {
  return TRAVEL.cargoCap + (state.timberBraceCrafted ? WORKBENCH_UNLOCK_CARGO : 0);
}

function pushLog(state: GameState, msg: string) {
  state.log.unshift(msg);
  if (state.log.length > 8) state.log.length = 8;
}

export function currentStash(state: GameState): Inventory | null {
  if (!state.region) return null;
  return state.stashes[state.region];
}

export function canHarvest(state: GameState, good: Good): boolean {
  if (!state.region || state.travel) return false;
  const region = REGIONS[state.region];
  if (!region.local.includes(good)) return false;
  if (state.energy < 1) return false;
  return true;
}

export function harvestClick(state: GameState, good: Good): boolean {
  if (!canHarvest(state, good)) return false;
  const stash = currentStash(state)!;
  stash[good] += HARVEST.clickAmount;
  state.energy -= 1;
  return true;
}

export function nodeLevel(state: GameState, regionId: RegionId, good: Good): number {
  return state.nodes[regionId][good] ?? 0;
}

export function nodeUpgradeCost(state: GameState, good: Good): number | null {
  if (!state.region || state.travel) return null;
  const region = REGIONS[state.region];
  if (!region.local.includes(good)) return null;
  const n = nodeLevel(state, state.region, good);
  // cost for next level: 10 × 1.15^n where n is current owned/level
  return HARVEST.nodeUpgradeBase * Math.pow(HARVEST.nodeUpgradeGrowth, n);
}

export function upgradeNode(state: GameState, good: Good): boolean {
  const cost = nodeUpgradeCost(state, good);
  if (cost === null || !state.region) return false;
  const stash = currentStash(state)!;
  if (stash[good] < cost) return false;
  stash[good] -= cost;
  state.nodes[state.region][good] = (state.nodes[state.region][good] ?? 0) + 1;
  pushLog(state, `Upgraded ${good} node in ${REGIONS[state.region].name} (lv ${state.nodes[state.region][good]}).`);
  return true;
}

/** Idle harvest: +0.2/s per unlocked local node while in region (not transit) */
export function tickIdle(state: GameState, dt: number) {
  if (!state.region || state.travel) return; // idle pauses in transit
  const region = REGIONS[state.region];
  const stash = state.stashes[state.region];
  for (const good of region.local) {
    const level = nodeLevel(state, state.region, good);
    if (level <= 0) continue;
    // each unlocked node at level contributes; notebook: +0.2/s per unlocked local node
    // level starts at 1; upgrades increase production proportionally
    stash[good] += HARVEST.idlePerSecond * level * dt;
  }
}

export function tickEnergy(state: GameState, dt: number) {
  if (state.energy >= HARVEST.energyCap) {
    state.energyRegenAcc = 0;
    return;
  }
  state.energyRegenAcc += dt;
  while (state.energyRegenAcc >= HARVEST.energyRegenSeconds && state.energy < HARVEST.energyCap) {
    state.energyRegenAcc -= HARVEST.energyRegenSeconds;
    state.energy += 1;
  }
}

export function tickTravel(state: GameState, dt: number) {
  if (!state.travel) return;
  state.travel.elapsed += dt;
  if (state.travel.elapsed >= state.travel.duration) {
    arrive(state);
  }
}

function arrive(state: GameState) {
  const t = state.travel!;
  const to = t.to;
  // Merge cargo into destination stash
  const stash = state.stashes[to];
  for (const g of GOODS) {
    stash[g] += t.cargo[g];
  }
  state.region = to;
  state.travel = null;
  if (to === 'ridge') pushLog(state, 'Ridge. Market open.');
  else if (to === 'vale') pushLog(state, 'Vale. Stash waiting.');
  else pushLog(state, 'Cross. Waypoint.');
}

export function tick(state: GameState, dt: number) {
  tickEnergy(state, dt);
  const wasTravelling = !!state.travel;
  let travelLeft = 0;
  if (state.travel) {
    travelLeft = Math.max(0, state.travel.duration - state.travel.elapsed);
  }
  tickTravel(state, dt);
  // Idle only while in a region; if we arrived mid-tick, idle for remainder only
  if (wasTravelling && !state.travel) {
    const rem = Math.max(0, dt - travelLeft);
    if (rem > 0) tickIdle(state, rem);
  } else {
    tickIdle(state, dt);
  }
}

export function cargoTotal(cargo: Inventory): number {
  return sumInv(cargo);
}

export interface DepartOptions {
  to: RegionId;
  cargo: Inventory;
  feeGood: Good;
}

export function canDepart(state: GameState, opts: DepartOptions): string | null {
  if (state.travel) return 'Already travelling.';
  if (!state.region) return 'Not in a region.';
  if (opts.to === state.region) return 'Already there.';
  const duration = travelSeconds(state.region, opts.to);
  if (!duration) return 'No route.';
  const stash = state.stashes[state.region];
  const fee = TRAVEL.feeAmount;
  if (!REGIONS[state.region].local.includes(opts.feeGood)) {
    return 'Fee must be a local good.';
  }
  // Need fee + cargo amounts in stash
  const need = cloneInv(opts.cargo);
  need[opts.feeGood] += fee;
  for (const g of GOODS) {
    if (stash[g] + 1e-9 < need[g]) return `Need ${need[g].toFixed(0)} ${g} (incl. fee).`;
  }
  const total = sumInv(opts.cargo);
  const cap = cargoCap(state);
  if (total > cap) return `Cargo over cap (${cap}).`;
  if (total < 0) return 'Invalid cargo.';
  return null;
}

export function depart(state: GameState, opts: DepartOptions): boolean {
  const err = canDepart(state, opts);
  if (err) {
    pushLog(state, err);
    return false;
  }
  const from = state.region!;
  const stash = state.stashes[from];
  const fee = TRAVEL.feeAmount;
  // Deduct fee + cargo
  stash[opts.feeGood] -= fee;
  for (const g of GOODS) {
    stash[g] -= opts.cargo[g];
  }
  state.travel = {
    from,
    to: opts.to,
    elapsed: 0,
    duration: travelSeconds(from, opts.to),
    cargo: cloneInv(opts.cargo),
    feeGood: opts.feeGood,
    feeAmount: fee,
  };
  state.region = null;
  pushLog(
    state,
    `Left ${REGIONS[from].name} for ${REGIONS[opts.to].name} — ${state.travel.duration}s, fee paid.`
  );
  return true;
}

/** Cancel in transit: lose fee, cargo returns to origin */
export function cancelTravel(state: GameState): boolean {
  if (!state.travel) return false;
  const t = state.travel;
  const stash = state.stashes[t.from];
  for (const g of GOODS) {
    stash[g] += t.cargo[g];
  }
  // fee already spent — lost
  state.region = t.from;
  state.travel = null;
  pushLog(state, `Turned back. Fee burned. Cargo returned to ${REGIONS[t.from].name}.`);
  return true;
}

/** Sell to NPC (NPC buys from you) */
export function sellToNpc(state: GameState, good: Good, amount: number): boolean {
  if (!state.region || state.travel) return false;
  if (amount <= 0) return false;
  const stash = state.stashes[state.region];
  if (stash[good] < amount) return false;
  const price = npcBuyPrice(state.region, good);
  const credit = npcTradeTotal(price, amount);
  stash[good] -= amount;
  state.coin += credit;
  pushLog(state, `Sold ${amount} ${good}.`);
  return true;
}

/** Buy from NPC (NPC sells to you) */
export function buyFromNpc(state: GameState, good: Good, amount: number): boolean {
  if (!state.region || state.travel) return false;
  if (amount <= 0) return false;
  const price = npcSellPrice(state.region, good);
  const cost = npcTradeTotal(price, amount);
  if (state.coin + 1e-9 < cost) {
    pushLog(state, `Need ${cost.toFixed(2)} coin to buy ${amount} ${good} (have ${state.coin.toFixed(2)}).`);
    return false;
  }
  const stash = state.stashes[state.region];
  state.coin -= cost;
  stash[good] += amount;
  pushLog(state, `Bought ${amount} ${good}.`);
  return true;
}

/**
 * Craft Workbench: 20 grain + 20 ore.
 * Honesty: cannot craft without travelling (ore not harvestable in Vale).
 * Goods must be in the SAME region's stash (you craft where you stand).
 */
function missingRecipe(state: GameState, cost: Partial<Record<Good, number>>): string | null {
  if (!state.region || state.travel) return 'Must be in a region.';
  const stash = state.stashes[state.region];
  for (const [g, need] of recipeNeeds(cost)) {
    if (stash[g] < need) return `Need ${need} ${g} here (have ${stash[g].toFixed(1)}).`;
  }
  return null;
}

function spendRecipe(state: GameState, cost: Partial<Record<Good, number>>) {
  const stash = currentStash(state)!;
  for (const [g, need] of recipeNeeds(cost)) {
    stash[g] -= need;
  }
}

export function canCraftWorkbench(state: GameState): string | null {
  if (state.workbenchCrafted) return 'Already crafted.';
  return missingRecipe(state, WORKBENCH_COST);
}

export function craftWorkbench(state: GameState): boolean {
  const err = canCraftWorkbench(state);
  if (err) {
    pushLog(state, err);
    return false;
  }
  spendRecipe(state, WORKBENCH_COST);
  state.workbenchCrafted = true;
  pushLog(state, `Workbench stands in ${REGIONS[state.region!].name}.`);
  return true;
}

/**
 * Craft Timber brace: timber (Vale-foreign) + a Vale-local good in this stash.
 * Honesty: cannot finish from Vale harvest alone.
 */
export function canCraftTimberBrace(state: GameState): string | null {
  if (!state.workbenchCrafted) return 'Craft the Workbench first.';
  if (state.timberBraceCrafted) return 'Already crafted.';
  return missingRecipe(state, TIMBER_BRACE_COST);
}

export function craftTimberBrace(state: GameState): boolean {
  const err = canCraftTimberBrace(state);
  if (err) {
    pushLog(state, err);
    return false;
  }
  spendRecipe(state, TIMBER_BRACE_COST);
  state.timberBraceCrafted = true;
  pushLog(state, `Timber brace set in ${REGIONS[state.region!].name}.`);
  return true;
}

export function canCraftCurrent(state: GameState): string | null {
  if (!state.workbenchCrafted) return canCraftWorkbench(state);
  if (!state.timberBraceCrafted) return canCraftTimberBrace(state);
  return 'Already crafted.';
}

export function craftCurrent(state: GameState): boolean {
  if (!state.workbenchCrafted) return craftWorkbench(state);
  if (!state.timberBraceCrafted) return craftTimberBrace(state);
  return false;
}

export function currentRecipeCost(state: GameState): Partial<Record<Good, number>> | null {
  if (!state.workbenchCrafted) return WORKBENCH_COST;
  if (!state.timberBraceCrafted) return TIMBER_BRACE_COST;
  return null;
}

export {
  GOODS,
  GOOD_LABEL,
  REGION_IDS,
  REGIONS,
  HARVEST,
  TRAVEL,
  WORKBENCH_COST,
  TIMBER_BRACE_COST,
  NEXT_RECIPE_NEEDS,
  WORKBENCH_UNLOCK_CARGO,
  recipeNeeds,
  recipeLabel,
  TICK_HZ,
  SAVE_KEY,
  OFFLINE_CATCHUP_SECONDS,
  npcBuyPrice,
  npcSellPrice,
  npcTradeTotal,
  travelSeconds,
};
export type { Good, RegionId };
