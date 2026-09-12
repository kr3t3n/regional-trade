# Plan: solo v1 → multiplayer + AI regional agents

Source: `REGIONAL-TRADE.md` Scale section + room constraint (fake markets first).

## Gate

Do **not** add player orders until the solo loop is fun. Tester must need travel to finish Workbench; idling for one round-trip wall-clock must not beat the trip for the missing good.

## Keep from v1 (non-negotiable)

- **Per-region books** (Albion-style local markets), not one global AH.
- **Travel time + cargo cap** (Travian merchant physics). Goods in transit are not at a region; harvest paused.
- **Wide NPC spread** as dry-book softener — never Travian-style instant NPC 1:1.
- **Tax on every fill** when player books land (Albion 4–8%; IdleMMO 10–15% order tax). Zero-fee books get botted.
- **Energy + server-side harvest** — client-only clicks will be scripted.
- Hide or delay a global arb table; or tax it. Public instant spreads are a bot script.

## Phase A — harden solo

1. Persist stash/nodes/coin in localStorage (optional; offline catch-up still capped or off).
2. Cross region as two-hop tutorial (Vale → Cross → Ridge) without new buildings.
3. More crafts gated on foreign mixes so the trip is not a one-off.

## Phase B — authoritative clock

1. Server owns tick, energy, harvest, travel arrival, NPC fills.
2. Client is view + intent (click, depart, order).
3. Same region model: you are in at most one region or in transit.

## Phase C — player books (still regional)

1. Limit / market order book **per region per good**.
2. Fill only while both parties’ goods/coin are in that region (or escrow that travels).
3. Listing fee + sale tax on fill.
4. NPC remains as wide-spread backstop when the book is empty — never flat swap.

## Phase D — AI as same-rules regional agents

AI players are **not** oracles. They obey the same rules humans do:

| Constraint | AI behaviour |
|------------|----------------|
| Region + travel | Agent has a location; must pay fee, wait travel time, cargo cap |
| Local harvest only | Can only click/idle goods local to current region |
| NPC / books | Sees the same prices as a player in that region (no global live arb board unless humans get it too — and then taxed/delayed) |
| Energy | Same cap + regen; no burst beyond energy |
| Goals | Craft / upgrade targets that require foreign goods → must travel |

Implementation sketch:

1. **Agent brain** runs server-side on the same tick: state = `{region, stash, coin, energy, goal}`.
2. **Policy**: simple utility — if missing foreign for next craft, plan route (Vale↔Ridge or via Cross), harvest until cargo+fee, depart, trade, return, craft.
3. **Noise**: randomize depart timing and cargo mix so they do not lock one meta route.
4. **No privileged APIs**: agents call the same `harvest`, `depart`, `buy`, `sell`, `craft` handlers as clients.
5. Later: multiple agents with different home regions to seed both sides of books before real humans arrive.

## Phase E — anti-bot / economy health

- Server energy + rate limits on harvest intents.
- Transfer / fill tax; no near-zero alt loans.
- Avoid perfect live arb UI.
- Monitor regional spreads; if bots flatten them, widen NPC or raise travel cost — do not add 1:1 NPC.

## Success criteria (multiplayer)

- A human still profits from a thoughtful trip vs sitting on idle.
- Empty books do not soft-lock (NPC wide spread).
- AI agents can complete Workbench-equivalent crafts without cheating geography.
- Adding more AI increases liquidity without collapsing all regional gaps to zero.
