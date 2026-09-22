# Narrative pack v1

Voice and first-trip copy for Regional trade. Numbers stay in `src/config.ts` — this file is lore, mood, and chrome only. Mission why-copy (goal chip / complete / Field notes craft) also lives in `docs/MISSION-WHY-v1.md`.

Tone: dry, practical, weather-bitten. Prefer haul / wait verbs. Coin from sales — no barter. Do not say “honesty.” Do not promise free travel, a global board, or a 1:1 swap.

## Intro splash (once, dismissible)

- Title: Regional trade
- Line: Harvest what grows here. Carry what does not. Coin from sales — no barter.
- Button: Start in Vale
- Muted: Help is Field notes — concepts, not this walk.

Reset save shows the splash again. It does not touch the `regional-trade-helper` preference. Field notes never auto-reopen after the first close.

## Soft steps T0–T8

Directed first haul. Spotlight the next verb. Short beat on the scene — not a tip dump. Celebrate depart / arrive / sell / buy / craft. **Got it** dismisses the walk for this save. First tap still harvests. Auto-pack Ridge (leave 20, fee 2, ~28 cargo) once the grain is there. The 25s road still runs.

| Step | When | Copy |
|---|---|---|
| T0 Arrive Vale | Fresh board, empty stash | Beat: Grain grows. Ore does not. |
| T1 First harvest | First click or first idle grain | Beat: Burst the grain. |
| T2 Goal | Grain stacking | Beat: Stack for the road. |
| T3 Pack | Enough grain to leave 20 + fee + 28 cargo | Beat: Pack for Ridge. Verb: Haul to Ridge · 25s (auto-pack). |
| T4 Transit | On the road | Beat: The road takes its time. |
| T5 Ridge | Standing in Ridge | Beat: Sell. Buy ore. One confirm each. |
| T6 Return | Ore bought or packed for home | Beat: Carry ore home. |
| T7 Craft | 20 ore sitting in the Vale stash | Beat: Craft the bench. |
| T8 Complete | Workbench built | Beat: Built. Timber later. |

The old `createInitialState` route dump is gone. The log opens on the T0 one-liner; the driver moves the coach.

## Chrome

- Help / Hide help
- Eyebrow: Field notes
- Title: How this loop works
- Note: Short facts — not the first-trip walk. Toggle anytime.
- Market: Coin only. Sell for coin, buy with coin. No barter.
- Travel: Fee in a local good. Cargo cap holds. Idle waits at home.
- Craft locked: Ore is not local in Vale. Finish a Ridge trip (or Cross→Ridge), then craft here.
- Workbench why: First reason to leave home — ore is not local here.
- Craft done: Workbench built. Bench stands. Next board wants timber — foreign in Vale — so another trip. Cargo +5 unlocks with that board. Chip muted: Next: timber on the road.
- Second craft: Timber brace. Why: Keeps you on the road — timber does not grow in Vale. Complete: Brace set. Foreign timber earned its place. Cargo +5 is yours. More gates will ask for what home will not grow.

Optional region labels: Vale Fields / Ridge Heights / Cross Way.

Place scene (first paint, especially phone-width): standing in the region, not a ledger. Full-bleed Vale Fields + one verb. Map marker and goal chip overlay the scene. Trade / Pack / Bench stay closed. Mood — Vale: Low fields. Soft fibre. Grain underfoot. Ridge: Stone and sawdust. Heights, not a market hall. Cross: A way-station, not a capital. Market, cargo amounts, and coin wait in Trade / Pack / Craft drawers. Region map stub marks you; no one else stands here.

## Field notes

- **Harvest.** Click +1 × node level while you stand there. Idle +0.2/s × level, in-region only — quiet on the road. Upgrade spends 10 × 1.15^level of that local good. Energy 30, regen 1 / 2s.
- **Travel.** Fee 2 local. Nowhere while moving. Vale↔Ridge 25s; via Cross 20s+20s. Cancel burns fee; cargo comes home. No teleport.
- **Cargo.** Cap 40 until timber brace, then 45. Paid upgrades add +5 each on the current cap — coin plus a local good in this stash. Leave 20 grain in Vale if Workbench still open.
- **NPC spreads.** Coin only; amount × unit. Local buy 0.7P / sell 1.3P. Foreign buy 1.05P / sell 1.15P. Ridge ore 1.3. No 1:1. No global board.
- **Coin.** Only from NPC sales.
- **Craft gates.** Workbench: 20 grain + 20 ore in *this* stash. First reason to leave home — Vale cannot harvest ore. After it stands, the next recipe still spends timber (foreign in Vale), plus cargo +5. Next: timber brace — still a foreign spend in Vale. Workbench was the first haul; this one proves the loop.
- **Maps / boards.** This region's map marks you. You are the only one here. Three stashes still hold the goods. No global board.

## Log examples

- Left Vale for Ridge — 25s, fee paid.
- Ridge. Market open.
- Sold N grain.
- Bought N ore.
- Workbench stands in Vale.
- Timber brace set in Vale.
- Cart holds 50.

Cancel: Turned back. Fee burned. Cargo returned to Vale.

## Hard constraints (unchanged)

No free travel. No global board. No 1:1 swap. V1 numbers stay in config. Live NPC totals stay amount × unit price.
