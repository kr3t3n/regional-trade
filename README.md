# Regional Trade — solo browser v1

Playable one-loop prototype: **harvest local → travel → trade with NPC → craft Workbench**.

Constants match `REGIONAL-TRADE.md` (V1 constants). No invented mechanics.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Build:

```bash
npm run build
npm run preview
```

## Play loop (intended)

1. Spawn in **Vale**. Click **grain**. Energy: 30 clicks, regen 1 / 2s. Idle +0.2/s × node level while in-region (pauses in transit).
2. Stock ~50 grain: **leave 20 at home** for the craft, pay fee **2 grain**, carry **~28 grain** (cargo cap 40). Destination **Ridge**, **Depart** (25s).
3. At Ridge, **sell** grain to NPC (foreign buy **1.05P**). **Buy ore** — ore is local to Ridge so NPC sell is **1.3P** (not Travian 1:1; notebook trip sketch used 1.15 by mistake — constants win). 28 grain → 29.4 coin → 22 ore.
4. Idle a few seconds for **timber** if you want a non-ore fee, or keep 2 ore for the return fee. Depart Vale with **20 ore** in cargo.
5. In Vale, craft **Workbench** (20 grain left at home + 20 ore).

Honesty: cannot craft without travelling (ore is foreign in Vale); idle pauses in transit; NPC is not 1:1.

## Files

| Path | Role |
|------|------|
| `src/config.ts` | All V1 numbers (regions, harvest, energy, travel, NPC spreads, Workbench) |
| `src/game.ts` | State + tick + actions |
| `src/main.ts` | One-screen UI |
| `PLAN.md` | Path to multiplayer + AI regional agents |

## Out of v1

Player books, chat, PvP, world map chrome, offline catch-up, prestige — see notebook.
