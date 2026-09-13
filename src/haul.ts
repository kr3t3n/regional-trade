/**
 * Directed first haul: one verb, auto-pack Ridge, one-confirm trade.
 * Numbers stay in config.ts. First tap still harvests — never mint grain.
 */
import {
  GOOD_LABEL,
  TIMBER_BRACE_COST,
  TRAVEL,
  WORKBENCH_COST,
  npcBuyPrice,
  npcSellPrice,
  travelSeconds,
  type Good,
  type RegionId,
} from './config';
import type { GameState, Inventory } from './game';
import type { DeskId } from './place';
import { showTimberFork } from './place';
import { tutorialActive } from './tutorial';

export type CheerKind = 'depart' | 'arrive' | 'sell' | 'buy' | 'craft';

export type HaulVerb =
  | { id: 'harvest'; good: Good; label: string; ready: boolean }
  | { id: 'haul-depart'; label: string; ready: boolean }
  | { id: 'haul-sell'; good: Good; amount: number; label: string; ready: boolean }
  | { id: 'haul-buy'; good: Good; amount: number; label: string; ready: boolean }
  | { id: 'haul-return'; label: string; ready: boolean }
  | { id: 'craft'; label: string; ready: boolean }
  | { id: 'open-desk'; desk: DeskId; label: string; ready: boolean }
  | { id: 'wait'; label: string; ready: false };

export const HAUL_CHEER: Record<CheerKind, string> = {
  depart: 'On the road.',
  arrive: 'Ridge.',
  sell: 'Coin in hand.',
  buy: 'Ore packed.',
  craft: 'The bench stands.',
};

export function arriveCheer(state: GameState): string {
  if (state.region === 'ridge') return HAUL_CHEER.arrive;
  if (state.region === 'vale') return 'Home.';
  return 'Cross.';
}

export function cheerCopyHasForbidden(): string[] {
  const blob = [...Object.values(HAUL_CHEER), 'Home.', 'Cross.'].join(' ');
  const errors: string[] = [];
  if (/honesty|free travel|global board|1:1/i.test(blob)) {
    errors.push('haul cheers must not spoil honesty suite');
  }
  return errors;
}

/** Grain to leave in Vale for Workbench. */
export function firstHaulLeaveHome(): number {
  return WORKBENCH_COST.grain ?? 20;
}

/** Ore to buy at Ridge: craft + return fee. */
export function firstHaulOreBuy(): number {
  return (WORKBENCH_COST.ore ?? 20) + TRAVEL.feeAmount;
}

/**
 * Grain cargo for the Ridge haul. Ceil so 22 ore at 1.3 still clears
 * after selling grain at the live Ridge export price (28 today).
 */
export function firstHaulGrainCargo(): number {
  const oreNeed = firstHaulOreBuy();
  const sell = npcBuyPrice('ridge', 'grain');
  const buy = npcSellPrice('ridge', 'ore');
  return Math.ceil((oreNeed * buy) / sell - 1e-9);
}

export function firstHaulNeedGrain(): number {
  return firstHaulLeaveHome() + TRAVEL.feeAmount + firstHaulGrainCargo();
}

export function emptyCargo(): Inventory {
  return { grain: 0, ore: 0, timber: 0, fibre: 0 };
}

export function ridgeHaulPlan(): { to: RegionId; cargo: Inventory; feeGood: Good } {
  const cargo = emptyCargo();
  cargo.grain = firstHaulGrainCargo();
  return { to: 'ridge', cargo, feeGood: 'grain' };
}

export function valeReturnPlan(): { to: RegionId; cargo: Inventory; feeGood: Good } {
  const cargo = emptyCargo();
  cargo.ore = WORKBENCH_COST.ore ?? 20;
  return { to: 'vale', cargo, feeGood: 'ore' };
}

export function firstHaulReady(state: GameState): boolean {
  if (state.workbenchCrafted || state.travel || state.region !== 'vale') return false;
  return state.stashes.vale.grain + 1e-9 >= firstHaulNeedGrain();
}

export function ridgeSellAmount(state: GameState): number {
  if (state.region !== 'ridge' || state.travel) return 0;
  return Math.floor(state.stashes.ridge.grain + 1e-9);
}

export function ridgeBuyOreAmount(state: GameState): number {
  if (state.region !== 'ridge' || state.travel) return 0;
  const unit = npcSellPrice('ridge', 'ore');
  if (unit <= 0) return 0;
  const afford = Math.floor((state.coin + 1e-9) / unit);
  return Math.min(firstHaulOreBuy(), afford);
}

export function roadProgress(state: GameState): number {
  if (!state.travel) return 0;
  return Math.min(1, state.travel.elapsed / state.travel.duration);
}

function localHarvestGood(state: GameState): Good {
  if (!state.region) return 'grain';
  if (state.region === 'vale') return 'grain';
  if (state.region === 'ridge') {
    return state.workbenchCrafted && !state.timberBraceCrafted ? 'timber' : 'ore';
  }
  return 'grain';
}

function harvestReady(state: GameState, good: Good): boolean {
  if (!state.region || state.travel) return false;
  if (state.energy < 1) return false;
  if (state.region === 'vale' && (good === 'ore' || good === 'timber')) return false;
  return true;
}

function harvestLabel(state: GameState, good: Good): string {
  const name = GOOD_LABEL[good];
  if (tutorialActive(state) && !state.workbenchCrafted && state.region === 'vale') {
    const have = Math.floor(state.stashes.vale.grain + 1e-9);
    const need = firstHaulNeedGrain();
    if (have < need) return `Harvest ${name.toLowerCase()} · ${have}/${need}`;
  }
  return `Harvest ${name.toLowerCase()}`;
}

function canReturnHome(state: GameState): boolean {
  if (state.region !== 'ridge' || state.travel) return false;
  const stash = state.stashes.ridge;
  const oreNeed = (WORKBENCH_COST.ore ?? 20) + TRAVEL.feeAmount;
  return stash.ore + 1e-9 >= oreNeed;
}

/** Next thumb verb. Drawers stay closed unless this is open-desk. */
export function nextVerb(state: GameState): HaulVerb {
  if (state.travel) {
    const left = Math.max(0, state.travel.duration - state.travel.elapsed);
    return { id: 'wait', label: `On the road · ${left.toFixed(0)}s`, ready: false };
  }

  if (state.timberBraceCrafted) {
    return harvestVerb(state);
  }

  if (state.workbenchCrafted) {
    if (!state.travel && state.region === 'vale' && canCraftHere(state)) {
      return { id: 'craft', label: 'Craft Timber brace', ready: true };
    }
    if (showTimberFork(state)) {
      return { id: 'open-desk', desk: 'travel', label: 'Pack the road', ready: true };
    }
    return harvestVerb(state);
  }

  if (state.region === 'vale' && canCraftHere(state)) {
    return { id: 'craft', label: 'Craft Workbench', ready: true };
  }

  if (state.region === 'ridge') {
    const sellN = ridgeSellAmount(state);
    if (sellN > 0 && !state.tutorial.sold) {
      return {
        id: 'haul-sell',
        good: 'grain',
        amount: sellN,
        label: `Sell ${sellN} grain`,
        ready: true,
      };
    }
    const buyN = ridgeBuyOreAmount(state);
    if (buyN > 0 && !state.tutorial.bought) {
      return {
        id: 'haul-buy',
        good: 'ore',
        amount: buyN,
        label: `Buy ${buyN} ore`,
        ready: true,
      };
    }
    if (canReturnHome(state) || state.tutorial.bought) {
      const ready = canReturnHome(state);
      return { id: 'haul-return', label: 'Return to Vale · 25s', ready };
    }
    return harvestVerb(state);
  }

  if (firstHaulReady(state)) {
    const secs = travelSeconds('vale', 'ridge');
    return { id: 'haul-depart', label: `Haul to Ridge · ${secs}s`, ready: true };
  }

  if (state.region === 'cross') {
    return { id: 'open-desk', desk: 'travel', label: 'Pack the road', ready: true };
  }

  return harvestVerb(state);
}

function canCraftHere(state: GameState): boolean {
  if (!state.region || state.travel) return false;
  const stash = state.stashes[state.region];
  if (!state.workbenchCrafted) {
    const grain = WORKBENCH_COST.grain ?? 20;
    const ore = WORKBENCH_COST.ore ?? 20;
    return stash.grain + 1e-9 >= grain && stash.ore + 1e-9 >= ore;
  }
  if (!state.timberBraceCrafted) {
    const grain = TIMBER_BRACE_COST.grain ?? 15;
    const timber = TIMBER_BRACE_COST.timber ?? 20;
    return stash.grain + 1e-9 >= grain && stash.timber + 1e-9 >= timber;
  }
  return false;
}

function harvestVerb(state: GameState): HaulVerb {
  const good = localHarvestGood(state);
  return {
    id: 'harvest',
    good,
    label: harvestLabel(state, good),
    ready: harvestReady(state, good),
  };
}

export function altHarvestGood(state: GameState): Good | null {
  if (!state.region || state.travel) return null;
  if (tutorialActive(state) && !state.workbenchCrafted) return null;
  if (state.region === 'vale') return 'fibre';
  if (state.region === 'ridge') return localHarvestGood(state) === 'timber' ? 'ore' : 'timber';
  if (state.region === 'cross') return 'ore';
  return null;
}

export function verbMarkup(state: GameState): string {
  const verb = nextVerb(state);
  const spot = tutorialActive(state) && verb.id !== 'wait' ? ' spot' : '';
  const alt = altHarvestGood(state);
  const act =
    verb.id === 'open-desk'
      ? `data-act="desk" data-desk="${verb.desk}"`
      : verb.id === 'harvest'
        ? `data-act="harvest" data-good="${verb.good}"`
        : verb.id === 'haul-sell'
          ? `data-act="haul-sell" data-good="${verb.good}" data-amount="${verb.amount}"`
          : verb.id === 'haul-buy'
            ? `data-act="haul-buy" data-good="${verb.good}" data-amount="${verb.amount}"`
            : `data-act="${verb.id}"`;
  const disabled = verb.ready ? '' : 'disabled';
  return `
    <div class="verb-bar" data-verb="${verb.id}">
      <button type="button" class="verb${spot}" ${act} ${disabled}>${verb.label}</button>
      ${
        alt
          ? `<button type="button" class="verb-alt" data-act="harvest" data-good="${alt}" ${
              harvestReady(state, alt) ? '' : 'disabled'
            }>${GOOD_LABEL[alt]}</button>`
          : ''
      }
    </div>`;
}

export function cheerMarkup(kind: CheerKind | null, line: string | null): string {
  if (!kind || !line) return '';
  return `<div class="haul-cheer on" data-cheer="${kind}" role="status">${line}</div>`;
}

export function roadHudMarkup(
  state: GameState,
  travelPct: number,
  regionLine: string
): string {
  if (!state.travel) return '';
  const secs = travelSeconds(state.travel.from, state.travel.to);
  return `
    <div class="road-hud">
      <p class="paused">Idle waits at home</p>
      <div class="bar"><div class="fill" id="ui-bar" style="width:${travelPct}%"></div></div>
      <p class="meta" id="ui-region">${regionLine}</p>
      <p class="road-note">${secs}s on this road. Cargo rides with you.</p>
      <button type="button" class="sec" data-act="cancel">Turn back · fee burned</button>
    </div>`;
}
