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
  REGIONS,
  HARVEST,
  TRAVEL,
  WORKBENCH_COST,
  TICK_HZ,
  npcBuyPrice,
  npcSellPrice,
  type GameState,
  type Good,
  type RegionId,
  type Inventory,
} from './game';

const state: GameState = createInitialState();
const cargoPick: Inventory = { grain: 0, ore: 0, timber: 0, fibre: 0 };
let feeGood: Good = 'grain';
let tradeAmount = 1;
let destPick: RegionId = 'ridge';
let dirty = true;

const app = document.querySelector<HTMLDivElement>('#app')!;

function fmt(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toFixed(1);
}

function regionLabel(): string {
  if (state.travel) {
    const left = Math.max(0, state.travel.duration - state.travel.elapsed);
    return `In transit: ${REGIONS[state.travel.from].name} → ${REGIONS[state.travel.to].name} (${left.toFixed(1)}s)`;
  }
  return state.region ? REGIONS[state.region].name : '—';
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

function render() {
  const inRegion = !!state.region && !state.travel;
  const region = state.region ? REGIONS[state.region] : null;
  const stash = state.region ? state.stashes[state.region] : null;

  if (region && !region.local.includes(feeGood)) feeGood = region.local[0];
  if (region && destPick === region.id) {
    destPick = (['vale', 'ridge', 'cross'] as RegionId[]).find((id) => id !== region.id)!;
  }

  const craftErr = canCraftWorkbench(state);
  const destinations = (['vale', 'ridge', 'cross'] as RegionId[]).filter(
    (id) => id !== state.region
  );

  app.innerHTML = `
    <div class="wrap">
      <header>
        <h1>Regional Trade</h1>
        <p class="sub">Solo v1 — harvest → travel → trade → craft</p>
      </header>

      <section class="panel status">
        <div><span class="lbl">Region</span> <strong id="ui-region">${regionLabel()}</strong></div>
        <div><span class="lbl">Energy</span> <strong id="ui-energy">${state.energy}</strong> / ${HARVEST.energyCap}</div>
        <div><span class="lbl">Coin</span> <strong id="ui-coin">${fmt(state.coin)}</strong></div>
        <div><span class="lbl">Cargo cap</span> <strong>${TRAVEL.cargoCap}</strong></div>
        ${
          state.workbenchCrafted
            ? '<div class="win">Workbench crafted ✓</div>'
            : `<div><span class="lbl">Goal</span> Workbench (${Object.entries(WORKBENCH_COST)
                .map(([g, n]) => `${n} ${g}`)
                .join(' + ')})</div>`
        }
      </section>

      ${
        state.travel
          ? `
        <section class="panel travel">
          <h2>Travel</h2>
          <p>Idle harvest paused. Not in a region.</p>
          <p>Cargo: ${GOODS.map((g) => `${fmt(state.travel!.cargo[g])} ${g}`).join(', ')}</p>
          <div class="bar"><div class="fill" id="ui-bar" style="width:${Math.min(100, (state.travel.elapsed / state.travel.duration) * 100)}%"></div></div>
          <button type="button" data-act="cancel">Cancel (lose fee, cargo returns)</button>
        </section>
      `
          : ''
      }

      ${
        inRegion && region && stash
          ? `
        <section class="panel inv">
          <h2>Inventory @ ${region.name}</h2>
          <ul class="goods" id="ui-inv">
            ${GOODS.map((g) => {
              const local = region.local.includes(g);
              return `<li class="${local ? 'local' : 'foreign'}">
                <span>${g}${local ? ' ★' : ''}</span>
                <strong data-inv="${g}">${fmt(stash[g])}</strong>
              </li>`;
            }).join('')}
          </ul>
        </section>

        <section class="panel harvest">
          <h2>Harvest (local only)</h2>
          <p class="hint">Click +1 · idle +${HARVEST.idlePerSecond}/s × node level · energy ${HARVEST.energyCap}, regen 1/${HARVEST.energyRegenSeconds}s</p>
          <div class="row">
            ${region.local
              .map((g) => {
                const lv = nodeLevel(state, region.id, g);
                const cost = nodeUpgradeCost(state, g);
                const can = canHarvest(state, g);
                return `
                <div class="card">
                  <button type="button" data-act="harvest" data-good="${g}" ${can ? '' : 'disabled'}>
                    Harvest ${g}
                  </button>
                  <div class="meta">Node lv ${lv} · idle ${fmt(HARVEST.idlePerSecond * lv)}/s</div>
                  <button type="button" class="sec" data-act="upgrade" data-good="${g}" ${
                    cost !== null && stash[g] >= cost ? '' : 'disabled'
                  }>
                    Upgrade (${cost !== null ? fmt(cost) : '—'} ${g})
                  </button>
                </div>`;
              })
              .join('')}
          </div>
        </section>

        <section class="panel npc">
          <h2>NPC market @ ${region.name}</h2>
          <p class="hint">No Travian 1:1. Local: buy 0.7P / sell 1.3P. Foreign: buy 1.05P / sell 1.15P. P=1.</p>
          <div class="trade-amt">
            Amount
            <input type="number" id="tradeAmt" min="1" step="1" value="${tradeAmount}" />
          </div>
          <table>
            <thead><tr><th>Good</th><th>NPC buys (you sell)</th><th>NPC sells (you buy)</th><th></th></tr></thead>
            <tbody>
              ${GOODS.map((g) => {
                const buyP = npcBuyPrice(region.id, g);
                const sellP = npcSellPrice(region.id, g);
                const tag = region.local.includes(g) ? 'local' : 'foreign';
                return `<tr class="${tag}">
                  <td>${g}</td>
                  <td>${buyP.toFixed(2)}</td>
                  <td>${sellP.toFixed(2)}</td>
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
          <p class="hint">Fee: ${TRAVEL.feeAmount} local good. Cargo cap ${TRAVEL.cargoCap}. Idle pauses in transit.</p>
          <div class="row cargo">
            ${GOODS.map(
              (g) => `
              <label>${g}
                <input type="number" min="0" step="1" data-cargo="${g}" value="${cargoPick[g]}" />
              </label>`
            ).join('')}
          </div>
          <div class="row">
            <label>Fee good
              <select id="feeGood">
                ${region.local
                  .map((g) => `<option value="${g}" ${g === feeGood ? 'selected' : ''}>${g}</option>`)
                  .join('')}
              </select>
            </label>
            <label>Destination
              <select id="dest">
                ${destinations
                  .map(
                    (id) =>
                      `<option value="${id}" ${id === destPick ? 'selected' : ''}>${REGIONS[id].name}</option>`
                  )
                  .join('')}
              </select>
            </label>
            <button type="button" data-act="depart">Depart</button>
          </div>
          <p class="meta" id="ui-cargo-total">Cargo total: ${fmt(GOODS.reduce((s, g) => s + cargoPick[g], 0))} / ${TRAVEL.cargoCap}</p>
        </section>

        <section class="panel craft">
          <h2>Craft</h2>
          <button type="button" data-act="craft" ${craftErr ? 'disabled' : ''}>
            Craft Workbench (20 grain + 20 ore)
          </button>
          ${craftErr && !state.workbenchCrafted ? `<p class="hint">${craftErr}</p>` : ''}
        </section>
      `
          : ''
      }

      <section class="panel log">
        <h2>Log</h2>
        <ul id="ui-log">${state.log.map((l) => `<li>${l}</li>`).join('')}</ul>
      </section>
    </div>
  `;
  dirty = false;
}

/** Lightweight live updates without wiping inputs */
function paintLive() {
  const regionEl = document.getElementById('ui-region');
  if (regionEl) regionEl.textContent = regionLabel();
  const energyEl = document.getElementById('ui-energy');
  if (energyEl) energyEl.textContent = String(state.energy);
  const coinEl = document.getElementById('ui-coin');
  if (coinEl) coinEl.textContent = fmt(state.coin);
  if (state.region) {
    const stash = state.stashes[state.region];
    for (const g of GOODS) {
      const el = document.querySelector(`[data-inv="${g}"]`);
      if (el) el.textContent = fmt(stash[g]);
    }
  }
  if (state.travel) {
    const bar = document.getElementById('ui-bar');
    if (bar) {
      bar.style.width = `${Math.min(100, (state.travel.elapsed / state.travel.duration) * 100)}%`;
    }
  }
  // harvest button enable/disable
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
}

app.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
  if (!t) return;
  const act = t.dataset.act!;
  const good = t.dataset.good as Good | undefined;
  readForm();

  const wasTravelling = !!state.travel;
  const wasRegion = state.region;

  if (act === 'harvest' && good) harvestClick(state, good);
  if (act === 'upgrade' && good) upgradeNode(state, good);
  if (act === 'sell' && good) sellToNpc(state, good, tradeAmount);
  if (act === 'buy' && good) buyFromNpc(state, good, tradeAmount);
  if (act === 'cancel') cancelTravel(state);
  if (act === 'craft') craftWorkbench(state);
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

  // Full re-render when travel/region/craft/structure changes
  if (
    !!state.travel !== wasTravelling ||
    state.region !== wasRegion ||
    act === 'craft' ||
    act === 'upgrade' ||
    act === 'sell' ||
    act === 'buy' ||
    act === 'depart' ||
    act === 'cancel'
  ) {
    dirty = true;
    render();
  } else {
    paintLive();
    const log = document.getElementById('ui-log');
    if (log) log.innerHTML = state.log.map((l) => `<li>${l}</li>`).join('');
  }
});

app.addEventListener('input', () => {
  readForm();
  const el = document.getElementById('ui-cargo-total');
  if (el) {
    el.textContent = `Cargo total: ${fmt(GOODS.reduce((s, g) => s + cargoPick[g], 0))} / ${TRAVEL.cargoCap}`;
  }
});

let last = performance.now();
let acc = 0;
const step = 1 / TICK_HZ;


function loop(now: number) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 1) dt = 1;
  acc += dt;
  let arrived = false;
  while (acc >= step) {
    const travelling = !!state.travel;
    tick(state, step);
    if (travelling && !state.travel) arrived = true;
    acc -= step;
  }

  if (arrived || dirty) {
    dirty = true;
    render();
  } else {
    paintLive();
  }

  // when travel starts/ends handled above; track for bar-only updates
  requestAnimationFrame(loop);
}

render();
requestAnimationFrame(loop);
