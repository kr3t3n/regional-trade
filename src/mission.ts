/**
 * Mission why-copy (Fable). Numbers stay in config.ts.
 * Voice: haul-and-wait. No honesty spoilers, no free travel / 1:1 / global board.
 */
import { TIMBER_BRACE_COST, WORKBENCH_COST, WORKBENCH_UNLOCK_CARGO, recipeLabel } from './config';

export const MISSION = {
  workbench: {
    label: 'Workbench',
    why: 'First reason to leave home — ore is not local here.',
    recipe: `${recipeLabel(WORKBENCH_COST)} in this stash`,
    completeTitle: 'Workbench built',
    completeBody: `Bench stands. Next board wants timber — foreign in Vale — so another trip. Cargo +${WORKBENCH_UNLOCK_CARGO} unlocks with that board.`,
    completeChip: 'Next: timber on the road',
  },
  timberBrace: {
    label: 'Timber brace',
    why: 'Keeps you on the road — timber does not grow in Vale.',
    recipe: `${recipeLabel(TIMBER_BRACE_COST)} in this stash`,
    completeTitle: 'Brace set',
    completeBody: `Foreign timber earned its place. Cargo +${WORKBENCH_UNLOCK_CARGO} is yours. More gates will ask for what home will not grow.`,
    completeChip: 'Cargo +5 is yours',
  },
} as const;

export const FIELD_NOTES_CRAFT = `Workbench: ${recipeLabel(WORKBENCH_COST)} in <em>this</em> stash. First reason to leave home — Vale cannot harvest ore. After it stands, the next recipe still spends timber (foreign in Vale), plus cargo +${WORKBENCH_UNLOCK_CARGO}. Next: timber brace — still a foreign spend in Vale. Workbench was the first haul; this one proves the loop.`;
