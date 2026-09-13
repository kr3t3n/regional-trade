/**
 * Solo persist. Restores the last snapshot; does not invent idle while away.
 * Offline catch-up is off (OFFLINE_CATCHUP_SECONDS = 0).
 */
import {
  GOODS,
  REGION_IDS,
  REGIONS,
  HARVEST,
  SAVE_KEY,
  OFFLINE_CATCHUP_SECONDS,
  type Good,
  type RegionId,
} from './config';
import {
  createInitialState,
  emptyInv,
  cloneInv,
  type GameState,
  type Inventory,
  type TravelState,
} from './game';
import {
  parseTutorial,
  tutorialFromLegacySave,
  type TutorialState,
} from './tutorial';

export const SAVE_VERSION = 1;

interface SaveV1 {
  version: number;
  savedAt: number;
  region: RegionId | null;
  stashes: Record<RegionId, Inventory>;
  coin: number;
  energy: number;
  energyRegenAcc: number;
  nodes: GameState['nodes'];
  travel: TravelState | null;
  workbenchCrafted: boolean;
  timberBraceCrafted?: boolean;
  cargoUpgrades?: number;
  log: string[];
  tutorial?: TutorialState;
}

function isGood(v: unknown): v is Good {
  return typeof v === 'string' && (GOODS as string[]).includes(v);
}

function isRegionId(v: unknown): v is RegionId {
  return typeof v === 'string' && (REGION_IDS as string[]).includes(v);
}

function finiteNonNeg(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function parseInv(raw: unknown): Inventory | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const inv = emptyInv();
  for (const g of GOODS) {
    const n = rec[g];
    if (!finiteNonNeg(n)) return null;
    inv[g] = n;
  }
  return inv;
}

function parseTravel(raw: unknown): TravelState | null | undefined {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object') return undefined;
  const t = raw as Record<string, unknown>;
  if (!isRegionId(t.from) || !isRegionId(t.to)) return undefined;
  if (t.from === t.to) return undefined;
  if (!finiteNonNeg(t.elapsed) || !finiteNonNeg(t.duration) || t.duration <= 0) return undefined;
  const cargo = parseInv(t.cargo);
  if (!cargo) return undefined;
  if (!isGood(t.feeGood) || !finiteNonNeg(t.feeAmount)) return undefined;
  return {
    from: t.from,
    to: t.to,
    elapsed: t.elapsed,
    duration: t.duration,
    cargo,
    feeGood: t.feeGood,
    feeAmount: t.feeAmount,
  };
}

function parseNodes(raw: unknown): GameState['nodes'] | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const nodes = createInitialState().nodes;
  for (const id of REGION_IDS) {
    const part = rec[id];
    if (!part || typeof part !== 'object') return null;
    const goods = part as Record<string, unknown>;
    const next: Partial<Record<Good, number>> = {};
    for (const g of REGIONS[id].local) {
      const n = goods[g];
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 1) return null;
      next[g] = n;
    }
    nodes[id] = next;
  }
  return nodes;
}

export function saveGame(state: GameState): void {
  if (typeof localStorage === 'undefined') return;
  const payload: SaveV1 = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    region: state.region,
    stashes: {
      vale: cloneInv(state.stashes.vale),
      ridge: cloneInv(state.stashes.ridge),
      cross: cloneInv(state.stashes.cross),
    },
    coin: state.coin,
    energy: state.energy,
    energyRegenAcc: state.energyRegenAcc,
    nodes: state.nodes,
    travel: state.travel
      ? {
          ...state.travel,
          cargo: cloneInv(state.travel.cargo),
        }
      : null,
    workbenchCrafted: state.workbenchCrafted,
    timberBraceCrafted: state.timberBraceCrafted,
    cargoUpgrades: state.cargoUpgrades,
    log: state.log.slice(0, 8),
    tutorial: { ...state.tutorial },
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Restore the last snapshot. Offline catch-up is off — no idle, energy, or
 * travel credit for time the tab was closed.
 */
export function loadGame(): GameState | null {
  if (typeof localStorage === 'undefined') return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<SaveV1>;
    if (data.version !== SAVE_VERSION) return null;
    // savedAt is recorded for future capped catch-up; v1 applies none.
    if (typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt)) return null;
    // OFFLINE_CATCHUP_SECONDS is the documented cap (0 = off). Do not tick it here.
    void OFFLINE_CATCHUP_SECONDS;

    const stashes = {} as Record<RegionId, Inventory>;
    if (!data.stashes || typeof data.stashes !== 'object') return null;
    for (const id of REGION_IDS) {
      const inv = parseInv(data.stashes[id]);
      if (!inv) return null;
      stashes[id] = inv;
    }

    if (!finiteNonNeg(data.coin)) return null;
    if (typeof data.energy !== 'number' || !Number.isFinite(data.energy)) return null;
    if (!finiteNonNeg(data.energyRegenAcc)) return null;
    const energy = Math.min(HARVEST.energyCap, Math.max(0, Math.floor(data.energy)));

    const nodes = parseNodes(data.nodes);
    if (!nodes) return null;

    const travel = parseTravel(data.travel);
    if (travel === undefined) return null;

    let region: RegionId | null;
    if (travel) {
      region = null;
    } else if (isRegionId(data.region)) {
      region = data.region;
    } else {
      return null;
    }

    if (typeof data.workbenchCrafted !== 'boolean') return null;

    const log = Array.isArray(data.log)
      ? data.log.filter((l): l is string => typeof l === 'string').slice(0, 8)
      : [];

    const timberBraceCrafted = data.timberBraceCrafted === true;
    if (data.cargoUpgrades !== undefined) {
      if (
        typeof data.cargoUpgrades !== 'number' ||
        !Number.isInteger(data.cargoUpgrades) ||
        data.cargoUpgrades < 0
      ) {
        return null;
      }
    }
    const cargoUpgrades = data.cargoUpgrades ?? 0;

    const hasProgress =
      data.workbenchCrafted ||
      timberBraceCrafted ||
      cargoUpgrades > 0 ||
      !!travel ||
      data.coin > 0 ||
      energy < HARVEST.energyCap ||
      REGION_IDS.some((id) => GOODS.some((g) => stashes[id][g] > 0.05)) ||
      REGION_IDS.some((id) =>
        Object.values(nodes[id]).some((n) => typeof n === 'number' && n > 1)
      );

    const tutorialFallback = tutorialFromLegacySave({
      workbenchCrafted: data.workbenchCrafted,
      hasProgress,
    });
    const tutorial = parseTutorial(data.tutorial, tutorialFallback);

    const fresh = createInitialState();
    return {
      ...fresh,
      region,
      stashes,
      coin: data.coin,
      energy,
      energyRegenAcc: data.energyRegenAcc,
      nodes,
      travel,
      workbenchCrafted: data.workbenchCrafted,
      timberBraceCrafted,
      cargoUpgrades,
      log: log.length ? log : fresh.log,
      tutorial,
    };
  } catch {
    return null;
  }
}

export function resetGame(): GameState {
  clearSave();
  return createInitialState();
}
