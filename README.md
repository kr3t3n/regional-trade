# Regional Trade — solo browser v1

Playable one-loop prototype: **harvest local → travel → trade with NPC → craft Workbench**.

Constants match `REGIONAL-TRADE.md` (V1 constants). All numbers live in `src/config.ts`. No invented 1:1 NPC, no player books, no AI traders.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build    # tsc + vite → dist/
npm run preview  # serve dist/ locally
```

Progress (stash per region, nodes, coin, energy, region, in-transit cargo, Workbench) is saved to **localStorage** (`regional-trade-v1`). There is a **Reset save** button. Offline catch-up is **off**: closing the tab does not grant idle, energy, or travel credit.

## Deploy `dist/` as static files

This is a Vite SPA with no backend. Any static host works. A `*.pages.dev` URL is enough — do not buy a domain.

### Cloudflare Pages

1. `npm run build`
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Upload assets**, and upload the `dist/` folder.

Or connect the GitHub repo:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |

Cloudflare assigns a `https://<project>.pages.dev` URL. Custom domains are optional and unused here.

### Any other static host

Upload the contents of `dist/` (not the folder name itself — `index.html` at the site root). Examples: Netlify drop, GitHub Pages (`dist` as the published folder), `npx serve dist`, nginx `root` pointing at `dist`.

No server routes, no environment variables, no DNS changes required.

## Playtest the Workbench loop

1. Spawn in **Vale**. Click **Grain** (Vale cannot harvest ore). Energy: 30 clicks, regen 1 / 2s. Idle +0.2/s × node level while in-region (pauses in transit).
2. Stock ~50 grain: **leave 20 at home** for the craft, pay fee **2 grain**, carry **~28 grain** (cargo cap 40).
3. **Direct (intended):** destination **Ridge**, Depart (25s).  
   **Two-hop tutorial:** Vale → **Cross** (20s) → Ridge (20s). No extra buildings; Cross is only a waypoint.
4. At Ridge, **sell** grain to NPC (foreign buy **1.05P**). **Buy ore** — ore is local to Ridge so NPC sell is **1.3P** (not Travian 1:1). 28 grain → 29.4 coin → 22 ore.
5. Keep 2 ore (or timber) for the return fee. Depart Vale with **20 ore** in cargo.
6. In Vale, craft **Workbench** (20 grain left at home + 20 ore).

Honesty: cannot craft without leaving Vale (ore is foreign there); idle pauses in transit; arrival tick does not grant a full idle slice; NPC spreads stay in `src/config.ts`.

## Files

| Path | Role |
|---|---|
| `src/config.ts` | All V1 numbers (regions, harvest, energy, travel, NPC spreads, Workbench, save key) |
| `src/game.ts` | State + tick + actions |
| `src/persist.ts` | localStorage save/load/reset (no offline catch-up) |
| `src/main.ts` | One-screen UI |
| `PLAN.md` | Later path to multiplayer + AI regional agents — not in this build |

## Out of v1

Player books, chat, PvP, world map chrome, multiplayer, AI traders, prestige — see the notebook and `PLAN.md`.
