# Regional-trade clicker — mechanics notebook
12 Sep 2026. For #Games. Not a build. Not a pick.

Room constraint (Tools): solo-viable v1, fake markets / NPC traders, one loop: harvest local → missing resource → travel → trade → back. No world-map of features until that works in a browser.

Labels: [O] on a cited page. [I] derived / proposed v1 constant.

---

## What already works (observed)

### Local books, not a global AH
**Albion Online.** Each city/hideout marketplace is local. Prices are player-set. Listing setup fee 2.5%; sale tax 8% (4% with premium). Fast travel exists but **forbids tradable cargo** on some routes (wiki / player guides). Regional gathering + city refine/craft bonuses create persistent price gaps. [O] wiki.albiononline.com Marketplace, Local Economies.

Travel profit is only real after tax, time, and **volume**. Spreads with no buyers are fake. [O] lilmarket.io transport-arbitrage guide: `profit = sell × (1 − tax) − buy − transportRisk`; score uses √volume.

### Physical merchants, not teleporting stock
**Travian: Legends.** Merchants carry resources. One merchant per Marketplace level. Capacity + speed by tribe (e.g. 1×: Romans 500 @ 16 fields/h; Gauls 750 @ 24; Teutons 1000 @ 12). Away merchants cannot take another job. Travel time = distance / speed; preview before confirm. Offers can cap **max travel time**. Goods in transit cannot be stolen. [O] support.travian.com marketplace guide.

### Instant NPC 1:1 kills geography
Travian’s **NPC Merchant** swaps your own resources 1:1 instantly for gold. Official text: useful when you would otherwise overflow; it **bypasses finding a partner** and **does not travel**. [O] same guide. That is the anti-pattern for this game.

### Clicker math
Idle/clicker production vs exponential upgrade cost. Anthony Young, *The Math of Idle Games, Part I* (Gamedeveloper): costs `base × growth^owned`; production stays linear/polynomial so a wall appears. [O]

Browser loop that ships: click seeds the pot; ~10–20 ticks/s add idle; localStorage save; offline catch-up **capped**. [O] sorceress.games incremental tick-loop 2026.

Energy as a rate limit (Telegram-clicker pattern): cap + regen, tap spends 1. [O] merehead clicker writeup (example numbers 5k–7k cap, 2/s regen — those numbers are for coin-tap games, not this harvest loop).

### What dies at scale
- **Farming bots** raise supply faster than sinks → deflation of effort. [O] Irdeto/Denuvo bot-economy 2026; Castronova “What Killed the MMOG” (gold farmers maximize production, minimize consumption).
- **Travel/AH bots** flatten regional spreads. Same Irdeto piece.
- **Near-zero transfer tax** lets alts and loans fake liquidity. IdleMMO raised vendor values / trade tax (10–13% direct) for that reason. [O] galahadcreative.com IdleMMO economic changes; idle-mmo wiki Market/Trading.
- **Empty player books.** Albion guides: listing ≠ trade. A solo v1 with only player orders has nobody on the other side. Matches Tools: fake markets first.

---

## What kills *this* loop (logic)

A travel-to-trade clicker dies if any of these are true. [I]

1. **One market.** Instant global book. No trip.
2. **Travel cheaper than the spread.** Instant / free / weightless cargo. NPC prices equalized.
3. **Travel dearer than the spread.** Tax + time + fee > regional gap. Player stays home and clicks.
4. **Local harvest can make the missing resource.** Then “need” is fake.
5. **Progress spends only local goods.** No reason to leave.
6. **Idle while travelling prints more than the trade pays.** Clicker beats merchant.
7. **Travian-style instant NPC 1:1.** Geography becomes a skin.
8. **Perfect live arb board + instant travel** (later, with multiplayer): bots collapse routes to one meta.

---

## V1 constants (proposed, for scaffold)

Three regions, four goods, one cargo, one NPC book per region. No PvP, no player orders, no world map chrome.

### Goods
`grain` `ore` `timber` `fibre`

### Regions (each has two **local** goods you can harvest; the other two are **foreign**)
| Region | Local (click + idle) | Foreign (must trade) |
|---|---|---|
| Vale | grain, fibre | ore, timber |
| Ridge | ore, timber | grain, fibre |
| Cross | grain, ore | timber, fibre |

Cross exists so there is a two-hop later; v1 only needs Vale ↔ Ridge. [I]

### Harvest [I]
- Click: **+1** of a local good (must be standing in that region).
- Idle: **+0.2/s** per unlocked local node while the tab is open **and** you are in that region. Idle **pauses in transit**.
- Energy: **30** clicks, regen **1 / 2s**. Stops infinite click-print before the first trip.
- Offline: none in v1 (or cap 5 min). Offline + travel is how bots win.
- Node upgrade cost: `10 × 1.15^n` of **that** local good. Classic idle curve. [O] Young.

### Why you leave [I]
First craft / stall upgrade: **Workbench**, cost `20 grain + 20 ore`.
- Vale can click grain, cannot click ore.
- Ridge the reverse.
That is the only gate. No other buildings until this craft completes once.

### Travel [I]
- Vale ↔ Ridge: **25s**. Vale/Ridge ↔ Cross: **20s**. Direct Vale–Ridge is the first trip.
- Cargo cap: **40** units total (any mix).
- Fee: **2** of a local good to depart (or 2 coin if you already minted). Enough to feel, not enough to block the first trip.
- You are **not** in a region while moving: no harvest.
- Cancel-in-transit: lose the fee, cargo returns. No teleport.

25s is longer than a click burst (~energy empty ≈ 60s if you dump 30 clicks) and shorter than a tea. If harvest idle stayed on during travel, 25s × 0.2 = 5 local — trip still wins if you carry 20+ foreign-needed.

### NPC market (fake liquidity) [I]
Each region posts a buy and a sell for every good. No player book.

Spread **30%** around a hidden fair `P`.
- Local goods: NPC **buys cheap** (0.7P), **sells expensive** (1.3P) — you do not buy your own output.
- Foreign goods: NPC **sells** the missing good at **1.15P**, **buys** your local export at **1.05P**.

First trip math (Vale, P=1 coin):
- Click 20 grain (plus a bit extra for fee).
- Pay 2 grain to leave, carry 20 grain.
- Ridge NPC buys grain at 1.05 → 21 coin; sells ore at 1.15 → 18 ore for 20.7 coin, leftover dust.
- Home. Craft workbench with 20 grain (left at home) + 18–20 ore.

If NPC bought and sold at the same P in every town, the trip is a waste. If spread ≥ 50% and cargo is 40, one trip cannot fund the craft.

Coin is a **sink and a buffer**, not a harvestable. Only from NPC sales.

### Tick
10 Hz client tick. Server (later) is the clock. v1 can be one HTML file + localStorage. [I] from the idle-loop pattern.

### Explicitly out of v1
Player-to-player books, chat, ganking, weight classes, weather, 12 biomes, prestige, ads, RMT, real-time map of other people.

---

## Scale (when multiplayer is added)

Do not add player orders until the solo loop is fun. Then:

- Keep **per-region books**. [O] Albion.
- Keep **travel time + cargo cap**. [O] Travian merchants.
- Put a **tax on every fill** (Albion 4–8%; IdleMMO 10–15% on orders). Zero-fee books get botted.
- Do **not** add an instant NPC 1:1 (Travian gold). Soften dry books with a **wide** NPC spread, not a flat swap.
- Hide or delay a global arb table; or tax it. Spreads that are public and instant are a script.
- Energy + server-side harvest. Client-only clicks will be scripted. [O] merehead; Irdeto.

---

## Later: real multi + AI traders (not v1)

Georgi asked for this. Tools: later plan, not the scaffold. [O] room, 12 Sep 2026.

Two different counterparties:

1. **Humans.** Per-region books, travel time, cargo cap, fill tax. Same rules as Scale above. Empty regions still need a floor or the first visitors find nothing to buy. [O] Albion empty-book problem.

2. **AI traders.** These are **not** harvest bots and **not** perfect arbitrage scripts. Irdeto: farm bots flood supply; travel/AH bots flatten regional spreads. [O] If an AI can click, travel, and restock faster than a human, it is that bot.

Constraints that keep AI from killing the loop [I]:

- Same travel time, cargo cap, energy, and tax as a player. No teleport restock.
- Act on a **delay** (e.g. decide every 20–40s), not every tick.
- Hold a **region bias**: an AI “lives” in one town and mostly buys that town’s surplus / sells that town’s shortage. A few slow route-runners, not a global optimiser.
- Inventory and coin **caps**. Cannot print stock.
- Noise: quote around the hidden fair `P` with jitter, not the exact leftover spread.
- Never harvest. They are merchants, not clickers. Harvest stays human (and later, other humans).
- Server-side only. Client AIs will be inspected and cloned.

Staging [I]:

- **v1 (now):** static NPC bid/ask per region (already specified).
- **v1.5:** those NPC quotes drift with recent volume (inventory that depletes / restocks slowly). Still one player.
- **v2:** several named AI merchants visible in a town, same physics, so the book moves while you travel. Still one human.
- **v3:** real multi. AI stay as the dry-book floor. Humans do not replace them on day one.

Honest test for AI: after an hour of only AI traders, Vale ore is still expensive and Ridge grain is still expensive. If prices equalize, the AIs are arb bots.

---

## Test that the notebook is honest

The v1 is wrong if a tester can finish the Workbench **without travelling**, or can finish it **without harvesting**, or if sitting still and idling for the same wall-clock as one return trip yields more of the missing good than the trip.

Sources: Albion wiki Marketplace / Local Economies; Travian Legends marketplace support article; lilmarket transport guide; Young 2016 idle math; sorceress.games 2026 tick loop; Irdeto bot-economy; IdleMMO tax notes; Castronova Gamedeveloper MMOG essay.
