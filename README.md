> **Frozen** at `dcbdf65` — see [STATUS.md](./STATUS.md). Live: https://pepelyankov.com/games/trade/

# Regional Trade — solo browser v1

Playable one-loop prototype: **harvest local → travel → trade with NPC → craft Workbench → haul timber → craft Timber brace**.

First paint is the place you stand in (Vale Fields / Ridge Heights / Cross Way) — scene, traveler, and a region map that marks only you. On a phone, that scene + **one verb** (harvest / haul / sell / buy / craft) own the first screen; map and goal sit as overlays. Market quotes, cargo amounts, and coin live in **Trade at the stall**, **Pack the road**, and **The bench**, closed until tapped. When Timber brace is the open gate, Pack shows a Ridge vs Cross grain-vs-time fork (not a global board).

Constants match `REGIONAL-TRADE.md` (V1 constants). All numbers live in `src/config.ts`. No invented 1:1 NPC, no player books, no AI traders.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. With the default Vite `base` that is `http://localhost:5173/games/trade/`.

```bash
npm run build          # tsc + vite → dist/  (base /games/trade/)
npm run build:pages    # same, base /regional-trade/ for GitHub Pages
npm run preview        # serve dist/ locally
npm run check          # honesty: Workbench + Timber brace need travel; idle off in transit
```

### Vite base (dual deploy)

Asset URLs are prefixed by Vite `base` so they do not 404 on a subdirectory.

| Host | `VITE_BASE` | Play URL |
|---|---|---|
| pepelyankov.com (canonical) | `/games/trade/` (default) | https://pepelyankov.com/games/trade/ |
| GitHub Pages | `/regional-trade/` | https://kr3t3n.github.io/regional-trade/ |

Override either host with `VITE_BASE=/your/path/ npm run build`, or set `GITHUB_PAGES=1` to force `/regional-trade/`.

Progress (stash per region, nodes, coin, energy, region, in-transit cargo, Workbench, Timber brace, cargo upgrades) is saved to **localStorage** (`regional-trade-v1`). There is a **Reset save** button. Offline catch-up is **off**: closing the tab does not grant idle, energy, or travel credit.

**Help** is toggleable Field notes (concepts, not the first-trip walk). First visit stays closed and stores `regional-trade-helper=off`; it never auto-reopens after that. Reset save does not clear that preference.

A dismissible **first haul** (splash + T0–T8) takes a new player from Vale to Ridge and the Workbench: harvest for real, auto-pack once 50 grain is in, walk the 25s road, sell/buy with one confirm, craft. Spotlight the next verb. Short celebration beats. **Got it** dismisses the walk. Reset save restarts T0–T8. Copy lives in `docs/NARRATIVE-PACK-v1.md`.

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

1. Spawn in **Vale**. Click **Grain** (Vale cannot harvest ore or timber). Energy: 30 clicks, regen 1 / 2s. Idle +0.2/s × node level while in-region (pauses in transit). On the place, each local node shows its level and the next upgrade: **10 × 1.15^level** of that good. Click and idle scale with the new level. Spending grain on the node is the alternative to saving it for the fee and cargo.
2. Stock ~50 grain: **leave 20 at home** for the craft, pay fee **2 grain**, carry **~28 grain** (cargo cap 40).
3. **Direct (intended):** destination **Ridge**, Depart (25s).  
   **Two-hop tutorial:** Vale → **Cross** (20s) → Ridge (20s). No extra buildings; Cross is only a waypoint.
4. At Ridge, open **Trade at the stall**. Change **Amount** — each row’s sell/buy **total** updates live (`amount × /ea`). Confirm **Sell** / **Buy** uses that same total (coin only; no barter). Sell grain (foreign buy **1.05P**). Buy ore — ore is local to Ridge so NPC sell is **1.3P** (not Travian 1:1). 28 grain → 29.4 coin → 22 ore.
5. Keep 2 ore (or timber) for the return fee. Depart Vale with **20 ore** in cargo.
6. In Vale, craft **Workbench** (20 grain left at home + 20 ore). The complete screen says the bench stands and the next board wants timber — foreign in Vale. Cargo cap stays **40**.
7. Haul **20 timber** home (Ridge harvest or buy abroad). With Timber brace open, **Pack the road** compares Ridge (sell grain 1.05, buy timber 1.3, 25s, ~27 grain cargo) vs Cross (sell grain 0.7, buy timber 1.15, 20s, ~35 grain cargo) — same 20 timber; one spends grain, the other spends time. Leave **15 grain** in the Vale stash. Craft **Timber brace**. That spend cannot finish from Vale harvest. Cargo cap becomes **45**.
8. **Cargo upgrades** (Pack the road): current cap, next +5 cost (coin + a local good here), Buy. Paid tiers stack on the current cap — brace then paid → 50, or paid then brace → 50. Travel still wants fee + packing.

Honesty: cannot craft Workbench without leaving Vale (ore is foreign there); cannot craft Timber brace without timber (also foreign in Vale); idle pauses in transit; arrival tick does not grant a full idle slice; NPC spreads stay in `src/config.ts`.

## Files

| Path | Role |
|---|---|
| `src/config.ts` | All V1 numbers (regions, harvest, node upgrades, energy, travel, NPC spreads, Workbench, Timber brace, cargo upgrades, save key) |
| `src/game.ts` | State + tick + actions |
| `src/persist.ts` | localStorage save/load/reset (no offline catch-up) |
| `src/main.ts` | Place-first UI (NPC totals = amount × unit, live; numbers in drawers) |
| `src/place.ts` | Place mood, region map stub, Timber brace travel fork |
| `src/help.ts` | Toggleable Field notes + localStorage pref |
| `src/tutorial.ts` | Splash + T0–T8 first-haul beats |
| `src/haul.ts` | Directed first-haul verb, auto-pack, one-confirm trade |
| `src/mission.ts` | Workbench / Timber brace why-copy |
| `src/icons.ts` | SVG tiles for goods / regions / panels |
| `docs/NARRATIVE-PACK-v1.md` | Voice, splash, T0–T8, Field notes |
| `docs/MISSION-WHY-v1.md` | Mission why-copy (goal chip / complete / Field notes craft) |
| `vite.config.ts` | Dual `base`: `/games/trade/` or `/regional-trade/` |
| `PLAN.md` | Later path to multiplayer + AI regional agents — not in this build |

## Out of v1

Player books, chat, PvP, world map chrome, multiplayer, AI traders, prestige — see the notebook and `PLAN.md`.
