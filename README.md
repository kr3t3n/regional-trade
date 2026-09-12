# Regional Trade — solo browser v1

Playable one-loop prototype: **harvest local → travel → trade with NPC → craft Workbench**.

Constants match `/workspace/games/REGIONAL-TRADE.md` (V1 constants). No invented mechanics.

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

1. Spawn in **Vale**. Click **grain** (and optionally fibre). Energy: 30 clicks, regen 1 / 2s. Idle +0.2/s per node level while in-region.
2. Stock ~22+ grain (20 cargo + 2 fee). Set cargo grain to 20, fee good grain, destination **Ridge**, **Depart** (25s). Idle pauses in transit.
3. At Ridge, **sell** grain to NPC (buys foreign export at 1.05P), **buy** ore (sells foreign at 1.15P).
4. Depart back to Vale with ore in cargo (fee: 2 ore or timber).
5. In Vale, craft **Workbench** (20 grain + 20 ore). Grain left at home + ore brought back.

Honesty checks baked in: cannot craft Workbench without travelling (ore is foreign in Vale); idle pauses in transit; NPC is not Travian 1:1.

## Files

| Path | Role |
|------|------|
| `src/config.ts` | All V1 numbers (regions, harvest, energy, travel, NPC spreads, Workbench) |
| `src/game.ts` | State + tick + actions |
| `src/main.ts` | One-screen UI |
| `PLAN.md` | Path to multiplayer + AI regional agents |

## Out of v1

Player books, chat, PvP, world map chrome, offline catch-up, prestige — see notebook.
