import { TRAVEL, WORKBENCH_COST } from './config';
import type { GameState } from './game';

export type TutorialStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type TutorialEvent = 'harvest' | 'sell' | 'buy' | 'start' | 'dismiss';

export interface TutorialState {
  /** Intro splash still waiting for Start in Vale */
  splash: boolean;
  /** Got it — coach stays off until Reset save */
  dismissed: boolean;
  step: TutorialStep;
  harvested: boolean;
  sold: boolean;
  bought: boolean;
}

export const T0_LOG = 'Grain and fibre grow here. Ore does not. The Workbench wants both.';

export const TUTORIAL_STEPS: Record<
  TutorialStep,
  { kicker: string; html: string; target: string }
> = {
  0: {
    kicker: 'Arrive Vale',
    html: 'Grain and fibre grow here. Ore does not. The Workbench wants both.',
    target: 'vale',
  },
  1: {
    kicker: 'First harvest',
    html: 'Click while you stand here. Idle ticks only in-region. Energy refills slowly — burst, then wait.',
    target: 'harvest',
  },
  2: {
    kicker: 'Goal',
    html: 'Stack grain. Keep <strong>20</strong> in the Vale stash for the craft. Pack the rest for the road.',
    target: 'goal',
  },
  3: {
    kicker: 'Pack',
    html: 'Fee <strong>2</strong> grain. Cargo ~<strong>28</strong> grain (cap 40). Leave <strong>20</strong> home. Destination: <strong>Ridge</strong> (25s). Cross is a longer classroom, not required.',
    target: 'travel',
  },
  4: {
    kicker: 'Transit',
    html: 'On the road: no harvest. Cargo rides with you. Cancel returns cargo and burns the fee.',
    target: 'travel-live',
  },
  5: {
    kicker: 'Ridge',
    html: 'Sell grain for coin. Buy ore. Ridge grows ore — expect the local sell price. Totals = amount × each.',
    target: 'market',
  },
  6: {
    kicker: 'Return',
    html: 'Keep fee goods for the return. Carry <strong>20 ore</strong> back to Vale.',
    target: 'travel',
  },
  7: {
    kicker: 'Craft',
    html: 'Goods must sit in <em>this</em> stash. Craft the Workbench.',
    target: 'craft',
  },
  8: {
    kicker: 'Complete',
    html: 'Built. Next board still wants timber (foreign here) — another trip later. Field notes stay under Help.',
    target: 'craft',
  },
};

export function createTutorialState(): TutorialState {
  return {
    splash: true,
    dismissed: false,
    step: 0,
    harvested: false,
    sold: false,
    bought: false,
  };
}

export function tutorialActive(state: GameState): boolean {
  return !state.tutorial.splash && !state.tutorial.dismissed;
}

export function startTutorial(state: GameState): void {
  state.tutorial.splash = false;
}

export function dismissTutorial(state: GameState): void {
  state.tutorial.dismissed = true;
}

export function inferTutorialStep(state: GameState): TutorialStep {
  if (state.workbenchCrafted) return 8;

  const vale = state.stashes.vale;
  const here = state.region ? state.stashes[state.region] : null;
  const cargoOre = state.travel?.cargo.ore ?? 0;
  const craftOre = WORKBENCH_COST.ore ?? 20;
  const craftGrain = WORKBENCH_COST.grain ?? 20;
  const fee = TRAVEL.feeAmount;
  const oreHere = here ? here.ore : 0;

  if (state.region === 'vale' && !state.travel && vale.ore + 1e-9 >= craftOre) return 7;

  const headingHome = !!state.travel && state.travel.to === 'vale';
  const orePacked = cargoOre + 1e-9 >= craftOre;
  const oreAbroad =
    !!state.region &&
    state.region !== 'vale' &&
    (state.tutorial.bought || oreHere + 1e-9 >= craftOre);

  if (headingHome || orePacked || oreAbroad) return 6;
  if (state.region === 'ridge') return 5;
  if (state.travel) return 4;
  if (state.region === 'cross') return 3;

  if (vale.grain + 1e-9 >= craftGrain + fee) return 3;
  if (vale.grain + 1e-9 >= 5) return 2;
  if (state.tutorial.harvested || vale.grain + 1e-9 >= 1) return 1;
  return 0;
}

function noteEvent(state: GameState, event: TutorialEvent): void {
  if (event === 'harvest') state.tutorial.harvested = true;
  if (event === 'sell') state.tutorial.sold = true;
  if (event === 'buy') state.tutorial.bought = true;
  if (event === 'start') state.tutorial.splash = false;
  if (event === 'dismiss') state.tutorial.dismissed = true;
}

/** Advance or rewind the coach to match the board. Returns true when the step changed. */
export function syncTutorial(state: GameState, event?: TutorialEvent): boolean {
  if (event) noteEvent(state, event);
  const next = inferTutorialStep(state);
  if (next === state.tutorial.step) return false;
  state.tutorial.step = next;
  return true;
}

export function splashMarkup(): string {
  return `
    <div class="splash" role="dialog" aria-labelledby="splash-title" aria-modal="true">
      <div class="splash-card">
        <p class="lbl">Solo v1</p>
        <h1 id="splash-title">Regional trade</h1>
        <p class="splash-line">Harvest what grows here. Carry what does not. Coin from sales — no barter.</p>
        <button type="button" data-act="tutorial-start">Start in Vale</button>
        <p class="splash-mute">Help is Field notes — concepts, not this walk.</p>
      </div>
    </div>`;
}

export function coachMarkup(state: GameState): string {
  if (!tutorialActive(state)) return '';
  const step = TUTORIAL_STEPS[state.tutorial.step];
  return `
    <aside class="coach" data-step="t${state.tutorial.step}" role="status">
      <div>
        <p class="lbl">First trip · T${state.tutorial.step}</p>
        <p class="coach-kicker">${step.kicker}</p>
        <p class="coach-body">${step.html}</p>
      </div>
      <button type="button" class="ghost" data-act="tutorial-dismiss">Got it</button>
    </aside>`;
}

export function coachTarget(state: GameState): string {
  if (!tutorialActive(state)) return '';
  return TUTORIAL_STEPS[state.tutorial.step].target;
}

export function parseTutorial(raw: unknown, fallback: TutorialState): TutorialState {
  if (!raw || typeof raw !== 'object') return fallback;
  const t = raw as Record<string, unknown>;
  const step = t.step;
  if (typeof step !== 'number' || !Number.isInteger(step) || step < 0 || step > 8) return fallback;
  if (typeof t.splash !== 'boolean' || typeof t.dismissed !== 'boolean') return fallback;
  return {
    splash: t.splash,
    dismissed: t.dismissed,
    step: step as TutorialStep,
    harvested: t.harvested === true,
    sold: t.sold === true,
    bought: t.bought === true,
  };
}

export function tutorialFromLegacySave(opts: {
  workbenchCrafted: boolean;
  hasProgress: boolean;
}): TutorialState {
  if (opts.workbenchCrafted || opts.hasProgress) {
    return {
      splash: false,
      dismissed: true,
      step: opts.workbenchCrafted ? 8 : 0,
      harvested: opts.hasProgress,
      sold: false,
      bought: false,
    };
  }
  return createTutorialState();
}
