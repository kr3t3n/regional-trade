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
  { id: RegionId; name: string; place: string; local: Good[]; foreign: Good[] }
> = {
  vale: {
    id: 'vale',
    name: 'Vale',
    place: 'Vale Fields',
    local: ['grain', 'fibre'],
    foreign: ['ore', 'timber'],
  },
  ridge: {
    id: 'ridge',
    name: 'Ridge',
    place: 'Ridge Heights',
    local: ['ore', 'timber'],
    foreign: ['grain', 'fibre'],
  },
  cross: {
    id: 'cross',
    name: 'Cross',
    place: 'Cross Way',
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
  /**
   * Node upgrade cost: 10 × 1.15^n of that local good.
   * n = current level (nodes start at 1). Young idle curve.
   */
  nodeUpgradeBase: 10,
  nodeUpgradeGrowth: 1.15,
} as const;

/** 10 × 1.15^n of that local good. n = current level. */
export function nodeUpgradeCostAmount(level: number): number {
  return HARVEST.nodeUpgradeBase * Math.pow(HARVEST.nodeUpgradeGrowth, level);
}

/** Click yield scales with node level. Level 1 stays +1. */
export function nodeClickAmount(level: number): number {
  return HARVEST.clickAmount * level;
}

/** Idle per second scales with node level. Level 1 stays +0.2/s. */
export function nodeIdlePerSecond(level: number): number {
  return HARVEST.idlePerSecond * level;
}

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
 * Timber brace — second craft gate. Timber is Vale-foreign, so the
 * stash spend cannot finish from Vale harvest alone (haul or buy abroad).
 */
export const TIMBER_BRACE_COST: Partial<Record<Good, number>> = {
  grain: 15,
  timber: 20,
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
 * Second recipe after Workbench. Must stay Vale-foreign so the brace
 * trip stays honest. Cargo +5 applies only after Timber brace crafts.
 * TRAVEL.cargoCap stays the base 40. Paid #6 upgrades stack on top.
 */
export const NEXT_RECIPE_NEEDS: Good = 'timber';
export const WORKBENCH_UNLOCK_CARGO = 5;

/**
 * Paid cargo upgrades (#6). Each tier adds capPerTier to the *current* cap.
 * Brace +5 and paid +5 are independent and stack:
 *   base 40 → brace 45 → first paid 50
 *   (or paid first 45, then brace 50).
 * Cost: coinBase × coinGrowth^n coin + goodBase × goodGrowth^n of a
 * local good in this stash. n = owned tiers. Must stand in a region;
 * travel still wants fee + packing. No max tier — cost is the wall.
 */
export const CARGO_UPGRADE = {
  capPerTier: 5,
  coinBase: 8,
  coinGrowth: 1.5,
  goodBase: 6,
  goodGrowth: 1.25,
} as const;

export function cargoUpgradeCoinCost(owned: number): number {
  return CARGO_UPGRADE.coinBase * Math.pow(CARGO_UPGRADE.coinGrowth, owned);
}

export function cargoUpgradeGoodCost(owned: number): number {
  return CARGO_UPGRADE.goodBase * Math.pow(CARGO_UPGRADE.goodGrowth, owned);
}

export function recipeNeeds(cost: Partial<Record<Good, number>>): [Good, number][] {
  return (Object.entries(cost) as [Good, number][]).filter(([, n]) => n > 0);
}

export function recipeLabel(cost: Partial<Record<Good, number>>): string {
  return recipeNeeds(cost)
    .map(([g, n]) => `${n} ${g}`)
    .join(' + ');
}

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
