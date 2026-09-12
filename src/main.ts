import './style.css';
import {
  createInitialState,
  tick,
  harvestClick,
  canHarvest,
  depart,
  canDepart,
  cancelTravel,
  sellToNpc,
  buyFromNpc,
  craftWorkbench,
  canCraftWorkbench,
  upgradeNode,
  nodeUpgradeCost,
  nodeLevel,
  GOODS,
  GOOD_LABEL,
  REGION_IDS,
  REGIONS,
  HARVEST,
  TRAVEL,
  WORKBENCH_COST,
  TICK_HZ,
  npcBuyPrice,
  npcSellPrice,
  npcTradeTotal,
  travelSeconds,
  type GameState,
  type Good,
  type RegionId,
  type Inventory,
} from './game';
import { loadGame, saveGame, resetGame } from './persist';

let state: GameState = loadGame() ?? createInitialState();
const cargoPick: Inventory = { grain: 0, ore: 0, timber: 0, fibre: 0 };
let feeGood: Good = 'grain';
let tradeAmount = 1;
let destPick: RegionId = 'ridge';
let dirty = true;
let persistAcc = 0;

const app = document.querySelector<HTMLDivElement>('#app')!;

function fmt(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toFixed(1);
}

const GOOD_GLYPH: Record<Good, string> = {
  grain: '🌾',
  ore: '🪨',
  timber: '🪵',
  fibre: '🧶',
};

function goodIcon(g: Good): string {
  return `<span class="ico ${g}" title="${GOOD_LABEL[g]}" aria-hidden="true">${GOOD_GLYPH[g]}</span>`;
}

function goodChip(g: Good): string {
  return `<span class="gchip">${goodIcon(g)}<span>${GOOD_LABEL[g]}</span></span>`;
}

function regionLabel(): string {
  if (state.travel) {
    const left = Math.max(0, state.travel.duration - state.travel.elapsed);
    return `${REGIONS[state.travel.from].name} → ${REGIONS[state.travel.to].name} · ${left.toFixed(1)}s`;
  }
  return state.region ? REGIONS[state.region].name : '—';
}

function persistNow() {
  saveGame(state);
}

function readForm() {
  app.querySelectorAll<HTMLInputElement>('[data-cargo]').forEach((el) => {
    const g = el.dataset.cargo as Good;
    cargoPick[g] = Math.max(0, Number(el.value) || 0);
  });
  const fee = app.querySelector<HTMLSelectElement>('#feeGood');
  if (fee) feeGood = fee.value as Good;
  const amt = app.querySelector<HTMLInputElement>('#tradeAmt');
  if (amt) tradeAmount = Math.max(1, Math.floor(Number(amt.value) || 1));
  const dest = app.querySelector<HTMLSelectElement>('#dest');
  if (dest) destPick = dest.value as RegionId;
}

function cargoTotalPick(): number {
  return GOODS.reduce((s, g) => s + cargoPick[g], 0);
}

function packMax(good: Good) {
  if (!state.region || state.travel) return;
  const stash = state.stashes[state.region];
  const reserved = good === feeGood ? TRAVEL.feeAmount : 0;
  const others = GOODS.reduce((s, g) => s + (g === good ? 0 : cargoPick[g]), 0);
  const room = Math.max(0, TRAVEL.cargoCap - others);
  const have = Math.max(0, stash[good] - reserved);
  cargoPick[good] = Math.floor(Math.min(room, have));
}

function elsewhere(good: Good): string {
  const bits = REGION_IDS.filter((id) => id !== state.region && state.stashes[id][good] > 0.05).map(
    (id) => `${fmt(state.stashes[id][good])} in ${REGIONS[id].name}`
  );
  return bits.length ? bits.join(', ') : '';
}

function goalBlock(): string {
  if (state.workbenchCrafted) {
    return `<div class="win">Workbench crafted</div>`;
  }
  const here = state.region ? state.stashes[state.region] : null;
  const parts = (Object.entries(WORKBENCH_COST) as [Good, number][]).map(([g, need]) => {
    const have = here ? here[g] : 0;
    const ok = have + 1e-9 >= need;
    const other = elsewhere(g);
    return `<span class="need ${ok ? 'ok' : ''}" data-goal="${g}">${goodIcon(g)} <span data-goal-have="${g}">${fmt(have)}</span>/${need}${
      !ok && other ? ` <em data-goal-else="${g}">(${other})</em>` : `<em data-goal-else="${g}" hidden></em>`
    }</span>`;
  });
  return `<div class="goal"><span class="lbl">Workbench</span> ${parts.join('')}</div>`;
}

function stashCard(id: RegionId): string {
  const r = REGIONS[id];
  const here = state.region === id && !state.travel;
  return `
    <article class="stash ${here ? 'here' : ''} ${id}">
      <header>
        <strong>${r.name}</strong>
        <span class="tag">${here ? 'You are here' : r.local.map((g) => GOOD_LABEL[g]).join(' · ')}</span>
      </header>
      <ul>
        ${GOODS.map((g) => {
          const local = r.local.includes(g);
          return `<li class="${local ? 'local' : 'foreign'}">
            ${goodChip(g)}
            <strong data-stash="${id}" data-inv="${g}">${fmt(state.stashes[id][g])}</strong>
          </li>`;
        }).join('')}
      </ul>
    </article>`;
}

function render() {
  const inRegion = !!state.region && !state.travel;
  const region = state.region ? REGIONS[state.region] : null;
  const stash = state.region ? state.stashes[state.region] : null;

  if (region && !region.local.includes(feeGood)) feeGood = region.local[0];
  if (region && destPick === region.id) {
    destPick = REGION_IDS.find((id) => id !== region.id) ?? 'ridge';
  }

  const craftErr = canCraftWorkbench(state);
  const destinations = REGION_IDS.filter((id) => id !== state.region);
  const destSecs = region ? travelSeconds(region.id, destPick) : 0;
  const energyPct = Math.min(100, (state.energy / HARVEST.energyCap) * 100);
  const travelPct = state.travel
    ? Math.min(100, (state.travel.elapsed / state.travel.duration) * 100)
    : 0;

  app.innerHTML = `
    <div class="wrap">
      <header class="top">
        <div>
          <h1>Regional Trade</h1>
          <p class="sub">Solo v1 — harvest local → travel → NPC trade → craft Workbench</p>
        </div>
        <button type="button" class="ghost" data-act="reset">Reset save</button>
      </header>

      <section class="status-bar">
        <div class="where ${state.travel ? 'transit' : (state.region ?? '')}">
          <span class="lbl">${state.travel ? 'In transit' : 'Region'}</span>
          <strong id="ui-region">${regionLabel()}</strong>
          ${
            state.travel
              ? `<div class="bar"><div class="fill" id="ui-bar" style="width:${travelPct}%"></div></div>`
              : ''
          }
        </div>
        <div class="stat">
          <span class="lbl">Energy</span>
          <strong><span id="ui-energy">${state.energy}</span> / ${HARVEST.energyCap}</strong>
          <div class="bar energy"><div class="fill" id="ui-energy-bar" style="width:${energyPct}%"></div></div>
        </div>
        <div class="stat">
          <span class="lbl">Coin</span>
          <strong id="ui-coin">${fmt(state.coin)}</strong>
        </div>
        ${goalBlock()}
      </section>

      ${
        state.travel
          ? `
        <section class="panel travel-live">
          <h2>Travel</h2>
          <p>Not in a region. Idle harvest paused. Cargo does not sit in a stash until you arrive.</p>
          <p class="cargo-line">Cargo ${fmt(GOODS.reduce((s, g) => s + state.travel!.cargo[g], 0))} / ${TRAVEL.cargoCap}
            ${GOODS.filter((g) => state.travel!.cargo[g] > 0)
              .map((g) => `${goodChip(g)} ${fmt(state.travel!.cargo[g])}`)
              .join(' ')}
          </p>
          <button type="button" class="sec" data-act="cancel">Cancel (lose fee, cargo returns to ${REGIONS[state.travel.from].name})</button>
        </section>`
          : ''
      }

      <section class="stashes" aria-label="Stashes by region">
        ${REGION_IDS.map(stashCard).join('')}
      </section>

      <div class="layout">
        ${
          inRegion && region && stash
            ? `
          <section class="panel harvest">
            <h2>Harvest <span class="muted">local only</span></h2>
            <p class="hint">Click +${HARVEST.clickAmount} · idle +${HARVEST.idlePerSecond}/s × node · pauses in transit. Energy regen 1 / ${HARVEST.energyRegenSeconds}s.</p>
            <div class="row">
              ${region.local
                .map((g) => {
                  const lv = nodeLevel(state, region.id, g);
                  const cost = nodeUpgradeCost(state, g);
                  const can = canHarvest(state, g);
                  return `
                  <div class="card">
                    <button type="button" data-act="harvest" data-good="${g}" ${can ? '' : 'disabled'}>
                      ${goodIcon(g)} Harvest ${GOOD_LABEL[g]}
                    </button>
                    <div class="meta">Node lv ${lv} · idle ${fmt(HARVEST.idlePerSecond * lv)}/s</div>
                    <button type="button" class="sec" data-act="upgrade" data-good="${g}" ${
                      cost !== null && stash[g] >= cost ? '' : 'disabled'
                    }>
                      Upgrade (${cost !== null ? fmt(cost) : '—'} ${GOOD_LABEL[g]})
                    </button>
                  </div>`;
                })
                .join('')}
            </div>
            <p class="hint foreign-note">${region.name} cannot harvest ${region.foreign.map((g) => GOOD_LABEL[g]).join(' or ')}.</p>
          </section>

          <section class="panel npc">
            <h2>NPC market <span class="muted">${region.name}</span></h2>
            <p class="hint">Coin only — sell for coin, buy with coin. No barter. Spreads from config: local buy 0.7P / sell 1.3P, foreign buy 1.05P / sell 1.15P (P=1). Ridge ore sells at <strong>1.3</strong>.</p>
            <div class="trade-amt">
              <label for="tradeAmt">Amount</label>
              <input type="number" id="tradeAmt" min="1" step="1" value="${tradeAmount}" />
              <p class="trade-live-hint">Totals = amount × unit price, live before confirm.</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Good</th>
                  <th>You sell <span class="th-sub">NPC pays you</span></th>
                  <th>You buy <span class="th-sub">you pay NPC</span></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${GOODS.map((g) => {
                  const buyP = npcBuyPrice(region.id, g);
                  const sellP = npcSellPrice(region.id, g);
                  const sellTotal = npcTradeTotal(buyP, tradeAmount);
                  const buyTotal = npcTradeTotal(sellP, tradeAmount);
                  const tag = region.local.includes(g) ? 'local' : 'foreign';
                  return `<tr class="${tag}">
                    <td>${goodChip(g)}</td>
                    <td class="price">
                      <span class="unit">${buyP.toFixed(2)} <span class="per">/ea</span></span>
                      <strong class="total" data-trade-total="sell" data-good="${g}" data-unit="${buyP}">${sellTotal.toFixed(2)}</strong>
                      <span class="coin-lbl">coin</span>
                    </td>
                    <td class="price">
                      <span class="unit">${sellP.toFixed(2)} <span class="per">/ea</span></span>
                      <strong class="total" data-trade-total="buy" data-good="${g}" data-unit="${sellP}">${buyTotal.toFixed(2)}</strong>
                      <span class="coin-lbl">coin</span>
                    </td>
                    <td class="acts">
                      <button type="button" data-act="sell" data-good="${g}">Sell</button>
                      <button type="button" data-act="buy" data-good="${g}">Buy</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </section>

          <section class="panel depart">
            <h2>Travel</h2>
            <p class="hint">Fee ${TRAVEL.feeAmount} of a <em>local</em> good. Cargo cap ${TRAVEL.cargoCap}. Idle pauses. Direct Vale↔Ridge ${travelSeconds('vale', 'ridge')}s. Two-hop Vale→Cross→Ridge ${travelSeconds('vale', 'cross')}s + ${travelSeconds('cross', 'ridge')}s (no new buildings).</p>
            <div class="routes" aria-label="Routes">
              <span>Vale ↔ Ridge ${travelSeconds('vale', 'ridge')}s</span>
              <span>Vale ↔ Cross ${travelSeconds('vale', 'cross')}s</span>
              <span>Cross ↔ Ridge ${travelSeconds('cross', 'ridge')}s</span>
            </div>
            <div class="row cargo">
              ${GOODS.map(
                (g) => `
                <label>${goodChip(g)}
                  <span class="pack">
                    <input type="number" min="0" step="1" data-cargo="${g}" value="${cargoPick[g]}" />
                    <button type="button" class="tiny" data-act="pack" data-good="${g}">max</button>
                  </span>
                </label>`
              ).join('')}
            </div>
            <div class="row">
              <label>Fee
                <select id="feeGood">
                  ${region.local
                    .map((g) => `<option value="${g}" ${g === feeGood ? 'selected' : ''}>${GOOD_LABEL[g]}</option>`)
                    .join('')}
                </select>
              </label>
              <label>Destination
                <select id="dest">
                  ${destinations
                    .map(
                      (id) =>
                        `<option value="${id}" ${id === destPick ? 'selected' : ''}>${REGIONS[id].name} (${travelSeconds(region.id, id)}s)</option>`
                    )
                    .join('')}
                </select>
              </label>
              <button type="button" data-act="depart">Depart (${destSecs}s)</button>
            </div>
            <p class="meta" id="ui-cargo-total">Cargo ${fmt(cargoTotalPick())} / ${TRAVEL.cargoCap}${
              destPick === 'cross' && region.id === 'vale'
                ? ' · Two-hop: after Cross, depart Ridge for the ore market (local sell 1.3P).'
                : destPick === 'ridge' && region.id === 'vale'
                  ? ' · Leave 20 grain in Vale for the craft.'
                  : ''
            }</p>
          </section>

          <section class="panel craft">
            <h2>Craft</h2>
            <p class="hint">Goods must be in <em>this</em> stash. Vale has no ore node — finish the Ridge (or Cross→Ridge) trip.</p>
            <button type="button" data-act="craft" ${craftErr ? 'disabled' : ''}>
              Craft Workbench (20 grain + 20 ore)
            </button>
            ${
              state.workbenchCrafted
                ? ''
                : `<p class="hint" id="ui-craft-err">${craftErr ?? ''}</p>`
            }
            ${state.workbenchCrafted ? '<p class="win">Loop complete.</p>' : ''}
          </section>
        `
            : `
          <section class="panel harvest muted-panel">
            <h2>Harvest</h2>
            <p class="hint">Paused in transit. No clicks, no idle.</p>
          </section>
          <section class="panel npc muted-panel">
            <h2>NPC market</h2>
            <p class="hint">You trade only while standing in a region.</p>
          </section>
        `
        }
      </div>

      <section class="panel log">
        <h2>Log</h2>
        <ul id="ui-log">${state.log.map((l) => `<li>${l}</li>`).join('')}</ul>
      </section>
    </div>
  `;
  dirty = false;
  paintTradePanel();
}

function paintLive() {
  const regionEl = document.getElementById('ui-region');
  if (regionEl) regionEl.textContent = regionLabel();
  const energyEl = document.getElementById('ui-energy');
  if (energyEl) energyEl.textContent = String(state.energy);
  const energyBar = document.getElementById('ui-energy-bar');
  if (energyBar) {
    energyBar.style.width = `${Math.min(100, (state.energy / HARVEST.energyCap) * 100)}%`;
  }
  const coinEl = document.getElementById('ui-coin');
  if (coinEl) coinEl.textContent = fmt(state.coin);
  for (const id of REGION_IDS) {
    const stash = state.stashes[id];
    for (const g of GOODS) {
      const el = document.querySelector(`[data-stash="${id}"][data-inv="${g}"]`);
      if (el) el.textContent = fmt(stash[g]);
    }
  }
  if (state.travel) {
    const bar = document.getElementById('ui-bar');
    if (bar) {
      bar.style.width = `${Math.min(100, (state.travel.elapsed / state.travel.duration) * 100)}%`;
    }
  }
  app.querySelectorAll<HTMLButtonElement>('button[data-act="harvest"]').forEach((btn) => {
    const g = btn.dataset.good as Good;
    btn.disabled = !canHarvest(state, g);
  });
  app.querySelectorAll<HTMLButtonElement>('button[data-act="upgrade"]').forEach((btn) => {
    const g = btn.dataset.good as Good;
    const cost = nodeUpgradeCost(state, g);
    const stash = state.region ? state.stashes[state.region] : null;
    btn.disabled = cost === null || !stash || stash[g] < cost;
  });

  const here = state.region && !state.travel ? state.stashes[state.region] : null;
  for (const [g, need] of Object.entries(WORKBENCH_COST) as [Good, number][]) {
    const have = here ? here[g] : 0;
    const haveEl = document.querySelector(`[data-goal-have="${g}"]`);
    if (haveEl) haveEl.textContent = fmt(have);
    const needEl = document.querySelector(`[data-goal="${g}"]`);
    if (needEl) needEl.classList.toggle('ok', have + 1e-9 >= need);
    const elseEl = document.querySelector<HTMLElement>(`[data-goal-else="${g}"]`);
    if (elseEl) {
      const other = elsewhere(g);
      if (other && have + 1e-9 < need) {
        elseEl.hidden = false;
        elseEl.textContent = `(${other})`;
      } else {
        elseEl.hidden = true;
        elseEl.textContent = '';
      }
    }
  }
  const craftBtn = app.querySelector<HTMLButtonElement>('button[data-act="craft"]');
  const craftErr = canCraftWorkbench(state);
  if (craftBtn) craftBtn.disabled = !!craftErr;
  const craftErrEl = document.getElementById('ui-craft-err');
  if (craftErrEl && !state.workbenchCrafted) {
    craftErrEl.textContent = craftErr ?? '';
  }
  paintTradePanel();
}

function paintTradePanel() {
  const region = state.region && !state.travel ? REGIONS[state.region] : null;
  const stash = state.region && !state.travel ? state.stashes[state.region] : null;
  app.querySelectorAll<HTMLElement>('[data-trade-total]').forEach((el) => {
    const unit = Number(el.dataset.unit);
    if (!Number.isFinite(unit)) return;
    const total = npcTradeTotal(unit, tradeAmount);
    el.textContent = total.toFixed(2);
    const good = el.dataset.good as Good | undefined;
    const side = el.dataset.tradeTotal;
    const cell = el.closest('td');
    if (!cell || !good || !stash) return;
    if (side === 'sell') {
      cell.classList.toggle('short', stash[good] + 1e-9 < tradeAmount);
    } else if (side === 'buy') {
      cell.classList.toggle('short', state.coin + 1e-9 < total);
    }
  });
  app.querySelectorAll<HTMLButtonElement>('button[data-act="sell"]').forEach((btn) => {
    const g = btn.dataset.good as Good;
    btn.disabled = !stash || stash[g] + 1e-9 < tradeAmount;
  });
  app.querySelectorAll<HTMLButtonElement>('button[data-act="buy"]').forEach((btn) => {
    const g = btn.dataset.good as Good;
    if (!region) {
      btn.disabled = true;
      return;
    }
    const total = npcTradeTotal(npcSellPrice(region.id, g), tradeAmount);
    btn.disabled = state.coin + 1e-9 < total;
  });
}

function afterAction(full: boolean) {
  persistNow();
  if (full) {
    dirty = true;
    render();
  } else {
    paintLive();
    const log = document.getElementById('ui-log');
    if (log) log.innerHTML = state.log.map((l) => `<li>${l}</li>`).join('');
  }
}

app.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
  if (!t) return;
  const act = t.dataset.act!;
  const good = t.dataset.good as Good | undefined;
  readForm();

  if (act === 'reset') {
    if (!confirm('Reset stash, nodes, coin, energy, and region? This clears localStorage.')) return;
    state = resetGame();
    GOODS.forEach((g) => (cargoPick[g] = 0));
    destPick = 'ridge';
    feeGood = 'grain';
    dirty = true;
    render();
    return;
  }

  const wasTravelling = !!state.travel;
  const wasRegion = state.region;

  if (act === 'harvest' && good) harvestClick(state, good);
  if (act === 'upgrade' && good) upgradeNode(state, good);
  if (act === 'sell' && good) sellToNpc(state, good, tradeAmount);
  if (act === 'buy' && good) buyFromNpc(state, good, tradeAmount);
  if (act === 'cancel') cancelTravel(state);
  if (act === 'craft') craftWorkbench(state);
  if (act === 'pack' && good) {
    packMax(good);
    const input = app.querySelector<HTMLInputElement>(`[data-cargo="${good}"]`);
    if (input) input.value = String(cargoPick[good]);
    const el = document.getElementById('ui-cargo-total');
    if (el) el.textContent = `Cargo ${fmt(cargoTotalPick())} / ${TRAVEL.cargoCap}`;
    return;
  }
  if (act === 'depart') {
    const cargo = { ...cargoPick };
    const err = canDepart(state, { to: destPick, cargo, feeGood });
    if (err) {
      state.log.unshift(err);
      if (state.log.length > 8) state.log.length = 8;
    } else {
      depart(state, { to: destPick, cargo, feeGood });
      GOODS.forEach((g) => (cargoPick[g] = 0));
    }
  }

  const structural =
    !!state.travel !== wasTravelling ||
    state.region !== wasRegion ||
    act === 'craft' ||
    act === 'upgrade' ||
    act === 'sell' ||
    act === 'buy' ||
    act === 'depart' ||
    act === 'cancel';
  afterAction(structural);
});

app.addEventListener('input', () => {
  readForm();
  const el = document.getElementById('ui-cargo-total');
  if (el) {
    el.textContent = `Cargo ${fmt(cargoTotalPick())} / ${TRAVEL.cargoCap}`;
  }
  paintTradePanel();
});

window.addEventListener('beforeunload', persistNow);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persistNow();
});

let last = performance.now();
let acc = 0;
const step = 1 / TICK_HZ;

function loop(now: number) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 1) dt = 1;
  acc += dt;
  persistAcc += dt;
  let arrived = false;
  while (acc >= step) {
    const travelling = !!state.travel;
    tick(state, step);
    if (travelling && !state.travel) arrived = true;
    acc -= step;
  }

  if (persistAcc >= 1) {
    persistNow();
    persistAcc = 0;
  }

  if (arrived || dirty) {
    dirty = true;
    render();
  } else {
    paintLive();
  }

  requestAnimationFrame(loop);
}

render();
requestAnimationFrame(loop);
