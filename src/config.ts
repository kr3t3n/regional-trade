/**
 * V1 constants — EXACTLY from REGIONAL-TRADE.md "V1 constants" section.
 * Do not invent mechanics that contradict the notebook.
 */

export type Good = 'grain' | 'ore' | 'timber' | 'fibre';
export type RegionId = 'vale' | 'ridge' | 'cross';

export const GOODS: Good[] = ['grain', 'ore', 'timber', 'fibre'];

export const REGION_IDS: RegionId[] = ['vale', 'ridge', 'cross'];

export const GOOD_LABEL: Record<Good, string> = {
  grain: 'Grain',
  ore: 'Ore',
  timber: 'Timber',
  fibre: 'Fibre',
};

export const REGIONS: Record<
  RegionId,
  { id: RegionId; name: string; local: Good[]; foreign: Good[] }
> = {
  vale: {
    id: 'vale',
    name: 'Vale',
    local: ['grain', 'fibre'],
    foreign: ['ore', 'timber'],
  },
  ridge: {
    id: 'ridge',
    name: 'Ridge',
    local: ['ore', 'timber'],
    foreign: ['grain', 'fibre'],
  },
  cross: {
    id: 'cross',
    name: 'Cross',
    local: ['grain', 'ore'],
    foreign: ['timber', 'fibre'],
  },
};

/** Harvest */
export const HARVEST = {
  clickAmount: 1,
  idlePerSecond: 0.2,
  energyCap: 30,
  /** 1 energy every 2 seconds */
  energyRegenSeconds: 2,
  /** Node upgrade cost: 10 × 1.15^n of that local good */
  nodeUpgradeBase: 10,
  nodeUpgradeGrowth: 1.15,
} as const;

/** Travel times in seconds */
export const TRAVEL_SECONDS: Record<string, number> = {
  'vale-ridge': 25,
  'ridge-vale': 25,
  'vale-cross': 20,
  'cross-vale': 20,
  'ridge-cross': 20,
  'cross-ridge': 20,
};

export const TRAVEL = {
  cargoCap: 40,
  /** Fee: 2 of a local good to depart */
  feeAmount: 2,
} as const;

/** Workbench — first craft gate */
export const WORKBENCH_COST: Partial<Record<Good, number>> = {
  grain: 20,
  ore: 20,
};

/**
 * NPC market — hidden fair P = 1 coin for all goods in v1.
 * Spread 30% around P.
 * Local: NPC buys at 0.7P, sells at 1.3P
 * Foreign: NPC sells missing at 1.15P, buys export at 1.05P
 */
export const NPC = {
  fairPrice: 1,
  localBuyMult: 0.7,
  localSellMult: 1.3,
  foreignBuyMult: 1.05,
  foreignSellMult: 1.15,
} as const;

/** Client tick rate */
export const TICK_HZ = 10;

/** localStorage key for solo persist */
export const SAVE_KEY = 'regional-trade-v1';

/** Helper overlay preference (not the game save). */
export const HELP_KEY = 'regional-trade-helper';

/**
 * Promised after Workbench — copy only until #7 ships the real unlock.
 * Does not change TRAVEL.cargoCap (still 40). Next recipe must spend a
 * Vale-foreign good so the second trip stays honest.
 */
export const NEXT_RECIPE_NEEDS: Good = 'timber';
export const WORKBENCH_UNLOCK_CARGO = 5;

/**
 * Offline catch-up seconds. 0 = off (notebook: none in v1, or cap 5 min).
 * Do not invent generous catch-up — idle + travel while the tab is closed is how bots win.
 */
export const OFFLINE_CATCHUP_SECONDS = 0;

export function travelKey(from: RegionId, to: RegionId): string {
  return `${from}-${to}`;
}

export function travelSeconds(from: RegionId, to: RegionId): number {
  return TRAVEL_SECONDS[travelKey(from, to)] ?? 25;
}

/** NPC buy price (what NPC pays YOU when you sell to them) */
export function npcBuyPrice(regionId: RegionId, good: Good): number {
  const region = REGIONS[regionId];
  const P = NPC.fairPrice;
  if (region.local.includes(good)) return P * NPC.localBuyMult;
  return P * NPC.foreignBuyMult;
}

/** NPC sell price (what YOU pay to buy FROM NPC) */
export function npcSellPrice(regionId: RegionId, good: Good): number {
  const region = REGIONS[regionId];
  const P = NPC.fairPrice;
  if (region.local.includes(good)) return P * NPC.localSellMult;
  return P * NPC.foreignSellMult;
}

/**
 * Coin total for a coin-only NPC fill (no barter).
 * Confirm and the live trade UI both use amount × per-unit price.
 */
export function npcTradeTotal(unitPrice: number, amount: number): number {
  return unitPrice * amount;
}
