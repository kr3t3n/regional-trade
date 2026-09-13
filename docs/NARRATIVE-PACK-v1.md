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

One at a time. Coach mark plus the T0 log line. **Got it** dismisses the coach for this save.

| Step | When | Copy |
|---|---|---|
| T0 Arrive Vale | Fresh board, empty stash | Grain and fibre grow here. Ore does not. The Workbench wants both. |
| T1 First harvest | First click or first idle grain | Click while you stand here. Idle ticks only in-region. Energy refills slowly — burst, then wait. |
| T2 Goal | Grain stacking | Stack grain. Keep **20** in the Vale stash for the craft. Pack the rest for the road. |
| T3 Pack | Enough grain to leave 20 + fee | Fee **2** grain. Cargo ~**28** grain (cap 40). Leave **20** home. Destination: **Ridge** (25s). Cross is a longer classroom, not required. |
| T4 Transit | On the road | On the road: no harvest. Cargo rides with you. Cancel returns cargo and burns the fee. |
| T5 Ridge | Standing in Ridge | Sell grain for coin. Buy ore. Ridge grows ore — expect the local sell price. Totals = amount × each. |
| T6 Return | Ore bought or packed for home | Keep fee goods for the return. Carry **20 ore** back to Vale. |
| T7 Craft | 20 ore sitting in the Vale stash | Goods must sit in *this* stash. Craft the Workbench. |
| T8 Complete | Workbench built | Built. Next: timber brace — still a foreign spend here. Another trip later. Field notes stay under Help. |

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

## Field notes

- **Harvest.** Click +1 local while you stand there. Idle +0.2/s × node in-region only — quiet on the road. Energy 30, regen 1 / 2s.
- **Travel.** Fee 2 local. Nowhere while moving. Vale↔Ridge 25s; via Cross 20s+20s. Cancel burns fee; cargo comes home. No teleport.
- **Cargo.** Cap 40 until timber brace, then 45. Paid upgrades add +5 each on the current cap — coin plus a local good in this stash. Leave 20 grain in Vale if Workbench still open.
- **NPC spreads.** Coin only; amount × unit. Local buy 0.7P / sell 1.3P. Foreign buy 1.05P / sell 1.15P. Ridge ore 1.3. No 1:1. No global board.
- **Coin.** Only from NPC sales.
- **Craft gates.** Workbench: 20 grain + 20 ore in *this* stash. First reason to leave home — Vale cannot harvest ore. After it stands, the next recipe still spends timber (foreign in Vale), plus cargo +5. Next: timber brace — still a foreign spend in Vale. Workbench was the first haul; this one proves the loop.
- **Maps / boards.** Three region stashes are the map. You are the only one here.

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
