# Narrative pack v1

Voice and first-trip copy for Regional trade. Numbers stay in `src/config.ts` — this file is lore, mood, and chrome only.

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
| T8 Complete | Workbench built | Built. Next board still wants timber (foreign here) — another trip later. Field notes stay under Help. |

The old `createInitialState` route dump is gone. The log opens on the T0 one-liner; the driver moves the coach.

## Chrome

- Help / Hide help
- Eyebrow: Field notes
- Title: How this loop works
- Note: Short facts — not the first-trip walk. Toggle anytime.
- Market: Coin only. Sell for coin, buy with coin. No barter.
- Travel: Fee in a local good. Cargo cap holds. Idle waits at home.
- Craft locked: Ore is not local in Vale. Finish a Ridge trip (or Cross→Ridge), then craft here.
- Craft done: Workbench built. Next recipe board + cargo +5 or local craft speed (promised). Next recipe still spends timber — foreign in Vale.

Optional region labels: Vale Fields / Ridge Heights / Cross Way.

## Field notes

- **Harvest.** Click +1 local while you stand there. Idle +0.2/s × node in-region only — quiet on the road. Energy 30, regen 1 / 2s.
- **Travel.** Fee 2 local. Nowhere while moving. Vale↔Ridge 25s; via Cross 20s+20s. Cancel burns fee; cargo comes home. No teleport.
- **Cargo.** Cap 40. Leave 20 grain in Vale if Workbench still open.
- **NPC spreads.** Coin only; amount × unit. Local buy 0.7P / sell 1.3P. Foreign buy 1.05P / sell 1.15P. Ridge ore 1.3. No 1:1. No global board.
- **Coin.** Only from NPC sales.
- **Craft gates.** Workbench 20 grain + 20 ore in *this* stash. Next recipe still timber foreign in Vale.
- **Maps / boards.** Three region stashes are the map. You are the only one here.

## Log examples

- Left Vale for Ridge — 25s, fee paid.
- Ridge. Market open.
- Sold N grain.
- Bought N ore.
- Workbench stands in Vale.

Cancel: Turned back. Fee burned. Cargo returned to Vale.

## Hard constraints (unchanged)

No free travel. No global board. No 1:1 swap. V1 numbers stay in config. Live NPC totals stay amount × unit price.
