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
  craftCurrent,
  canCraftCurrent,
  currentRecipeCost,
  cargoCap,
  cargoUpgradeCost,
  canBuyCargoUpgrade,
  buyCargoUpgrade,
  upgradeNode,
  nodeUpgradeCost,
  nodeLevel,
  nodeClickAmount,
  nodeIdlePerSecond,
  GOODS,
  GOOD_LABEL,
  REGION_IDS,
  REGIONS,
  HARVEST,
  TRAVEL,
  CARGO_UPGRADE,
  WORKBENCH_UNLOCK_CARGO,
  WORKBENCH_COST,
  TIMBER_BRACE_COST,
  recipeNeeds,
  recipeLabel,
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
import { applyHelp, loadHelpOpen, mountHelper, saveHelpOpen } from './help';
import { goodChip, goodIcon, panelMark, regionCrest } from './icons';
import {
  coachMarkup,
  coachTarget,
  dismissTutorial,
  splashMarkup,
  startTutorial,
  syncTutorial,
} from './tutorial';
import { MISSION } from './mission';
import {
  deskBarMarkup,
  harvestNodesMarkup,
  placeEnergyLine,
  placeSceneMarkup,
  showTimberFork,
  timberForkMarkup,
  type DeskId,
} from './place';
import {
  HAUL_CHEER,
  altHarvestGood,
  arriveCheer,
  cheerMarkup,
  nextVerb,
  ridgeHaulPlan,
  ridgeBuyOreAmount,
  ridgeSellAmount,
  roadHudMarkup,
  roadProgress,
  valeReturnPlan,
  verbMarkup,
  type CheerKind,
} from './haul';

let state: GameState = loadGame() ?? createInitialState();
const cargoPick: Inventory = { grain: 0, ore: 0, timber: 0, fibre: 0 };
let feeGood: Good = 'grain';
let upgradeGood: Good = 'grain';
let tradeAmount = 1;
let destPick: RegionId = 'ridge';
let desk: DeskId = 'none';
let helpOpen = loadHelpOpen();
let dirty = true;
let persistAcc = 0;
let cheer: CheerKind | null = null;
let cheerLine: string | null = null;
let cheerTimer = 0;

const app = document.querySelector<HTMLDivElement>('#app')!;
mountHelper();

function fmt(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toFixed(1);
}

/** Upgrade prices follow 10 × 1.15^n and are not always one decimal. */
function fmtCost(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return String(rounded);
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

function paintHelp() {
  applyHelp(helpOpen && !state.tutorial.splash);
}

function paintPlaceChrome() {
  document.body.classList.remove('place-vale', 'place-ridge', 'place-cross', 'place-transit');
  if (state.travel) document.body.classList.add('place-transit');
  else if (state.region) document.body.classList.add(`place-${state.region}`);
}

function celebrate(kind: CheerKind, line?: string) {
  cheer = kind;
  cheerLine = line ?? (kind === 'arrive' ? arriveCheer(state) : HAUL_CHEER[kind]);
  window.clearTimeout(cheerTimer);
  cheerTimer = window.setTimeout(() => {
    cheer = null;
    cheerLine = null;
    dirty = true;
  }, 1650);
}

function readForm() {
  app.querySelectorAll<HTMLInputElement>('[data-cargo]').forEach((el) => {
    const g = el.dataset.cargo as Good;
    cargoPick[g] = Math.max(0, Number(el.value) || 0);
  });
  const fee = app.querySelector<HTMLSelectElement>('#feeGood');
  if (fee) feeGood = fee.value as Good;
  const pay = app.querySelector<HTMLSelectElement>('#upgradeGood');
  if (pay) upgradeGood = pay.value as Good;
  const amt = app.querySelector<HTMLInputElement>('#tradeAmt');
  if (amt) tradeAmount = Math.max(1, Math.floor(Number(amt.value) || 1));
  const dest = app.querySelector<HTMLSelectElement>('#dest');
  if (dest) destPick = dest.value as RegionId;
}

function cargoTotalPick(): number {
  return GOODS.reduce((s, g) => s + cargoPick[g], 0);
}

function cargoHint(): string {
  if (!state.region || state.travel) return '';
  if (destPick === 'cross' && state.region === 'vale') {
    return ' · Two-hop: after Cross, depart Ridge for the ore market (local sell 1.3P).';
  }
  if (destPick === 'ridge' && state.region === 'vale' && !state.workbenchCrafted) {
    return ` · Leave ${WORKBENCH_COST.grain} grain in Vale for the craft.`;
  }
  if (destPick === 'ridge' && state.region === 'vale' && !state.timberBraceCrafted) {
    return ` · Leave ${TIMBER_BRACE_COST.grain} grain in Vale for the brace.`;
  }
  return '';
}

function cargoCapBreakdown(): string {
  const bits = [`${TRAVEL.cargoCap} base`];
  if (state.timberBraceCrafted) bits.push(`+${WORKBENCH_UNLOCK_CARGO} brace`);
  if (state.cargoUpgrades > 0) {
    bits.push(`+${state.cargoUpgrades * CARGO_UPGRADE.capPerTier} paid`);
  }
  return `Cap ${cargoCap(state)} (${bits.join(' ')})`;
}

function writeCargoTotal() {
  const el = document.getElementById('ui-cargo-total');
  if (el) {
    el.textContent = `Cargo ${fmt(cargoTotalPick())} / ${cargoCap(state)}${cargoHint()}`;
  }
  const capEl = document.getElementById('ui-cargo-cap');
  if (capEl) capEl.textContent = cargoCapBreakdown();
}

function cargoUpgradePanel(region: (typeof REGIONS)[RegionId]): string {
  const next = cargoUpgradeCost(state.cargoUpgrades);
  const err = canBuyCargoUpgrade(state, upgradeGood);
  return `
            <div class="cargo-upgrade">
              <p class="lbl">Cart</p>
              <p class="cargo-upgrade-now" id="ui-cargo-cap">${cargoCapBreakdown()}</p>
              <p class="meta" id="ui-cargo-upgrade-cost">Next +${CARGO_UPGRADE.capPerTier} · ${fmt(next.coin)} coin + ${fmt(next.goodAmount)} ${GOOD_LABEL[upgradeGood]}</p>
              <div class="row">
                <label>Pay with
                  <select id="upgradeGood">
                    ${region.local
                      .map(
                        (g) =>
                          `<option value="${g}" ${g === upgradeGood ? 'selected' : ''}>${GOOD_LABEL[g]}</option>`
                      )
                      .join('')}
                  </select>
                </label>
                <button type="button" data-act="cargo-upgrade" ${err ? 'disabled' : ''}>
                  Buy cargo +${CARGO_UPGRADE.capPerTier}
                </button>
              </div>
              <p class="hint" id="ui-cargo-upgrade-err">${err ?? ''}</p>
            </div>`;
}

function packMax(good: Good) {
  if (!state.region || state.travel) return;
  const stash = state.stashes[state.region];
  const reserved = good === feeGood ? TRAVEL.feeAmount : 0;
  const others = GOODS.reduce((s, g) => s + (g === good ? 0 : cargoPick[g]), 0);
  const room = Math.max(0, cargoCap(state) - others);
  const have = Math.max(0, stash[good] - reserved);
  cargoPick[good] = Math.floor(Math.min(room, have));
}

function elsewhere(good: Good): string {
  const bits = REGION_IDS.filter((id) => id !== state.region && state.stashes[id][good] > 0.05).map(
    (id) => `${fmt(state.stashes[id][good])} in ${REGIONS[id].name}`
  );
  return bits.length ? bits.join(', ') : '';
}

function recipeChips(cost: Partial<Record<Good, number>>): string {
  const here = state.region ? state.stashes[state.region] : null;
  return recipeNeeds(cost)
    .map(([g, need]) => {
      const have = here ? here[g] : 0;
      const ok = have + 1e-9 >= need;
      const other = elsewhere(g);
      return `<span class="need ${ok ? 'ok' : ''}" data-goal="${g}">${goodIcon(g)} <span data-goal-have="${g}">${fmt(have)}</span>/${need}${
        !ok && other ? ` <em data-goal-else="${g}">(${other})</em>` : `<em data-goal-else="${g}" hidden></em>`
      }</span>`;
    })
    .join('');
}

function goalBlock(): string {
  const mark = coachTarget(state);
  if (state.timberBraceCrafted) {
    return `<div class="win complete-chip"><span class="lbl">${MISSION.timberBrace.label}</span><strong>Set</strong><span class="muted">${MISSION.timberBrace.completeChip}</span></div>`;
  }
  if (state.workbenchCrafted) {
    return `<div class="goal${mark === 'goal' ? ' coach-target' : ''}"><span class="lbl">${MISSION.timberBrace.label}</span> ${recipeChips(TIMBER_BRACE_COST)}<span class="muted goal-why">${MISSION.timberBrace.why}</span></div>`;
  }
  return `<div class="goal${mark === 'goal' ? ' coach-target' : ''}"><span class="lbl">${MISSION.workbench.label}</span> ${recipeChips(WORKBENCH_COST)}<span class="muted goal-why">${MISSION.workbench.why}</span></div>`;
}

function craftPanel(): string {
  const mark = coachTarget(state);
  const craftErr = canCraftCurrent(state);
  if (state.timberBraceCrafted) {
    return `
          <section class="panel craft${mark === 'craft' ? ' coach-target' : ''}">
            <h2>${panelMark('craft')} Craft</h2>
            <div class="complete" id="ui-complete">
              <p class="complete-kicker">Second gate</p>
              <h3>${MISSION.timberBrace.completeTitle}</h3>
              <p>${MISSION.timberBrace.completeBody}</p>
            </div>
          </section>`;
  }
  if (state.workbenchCrafted) {
    return `
          <section class="panel craft${mark === 'craft' ? ' coach-target' : ''}">
            <h2>${panelMark('craft')} Craft</h2>
            <div class="complete" id="ui-complete">
              <p class="complete-kicker">First gate</p>
              <h3>${MISSION.workbench.completeTitle}</h3>
              <p>${MISSION.workbench.completeBody}</p>
              <p class="muted">${MISSION.workbench.completeChip}</p>
            </div>
            <p class="hint">Timber is not local in Vale. Haul it home, then craft here.</p>
            <button type="button" data-act="craft" ${craftErr ? 'disabled' : ''}>
              Craft ${MISSION.timberBrace.label} (${recipeLabel(TIMBER_BRACE_COST)})
            </button>
            <p class="hint" id="ui-craft-err">${craftErr ?? ''}</p>
          </section>`;
  }
  return `
          <section class="panel craft${mark === 'craft' ? ' coach-target' : ''}">
            <h2>${panelMark('craft')} Craft</h2>
            <p class="hint">Ore is not local in Vale. Finish a Ridge trip (or Cross→Ridge), then craft here.</p>
            <button type="button" data-act="craft" ${craftErr ? 'disabled' : ''}>
              Craft ${MISSION.workbench.label} (${recipeLabel(WORKBENCH_COST)})
            </button>
            <p class="hint" id="ui-craft-err">${craftErr ?? ''}</p>
          </section>`;
}

function regionRail(): string {
  return `<div class="region-rail" aria-label="Regions">
    ${REGION_IDS.map((id, i) => {
      const on = state.region === id && !state.travel;
      const leg = !!state.travel && (state.travel.from === id || state.travel.to === id);
      return `${i ? '<span class="edge" aria-hidden="true"></span>' : ''}
        <span class="node ${id}${on ? ' here' : ''}${leg ? ' leg' : ''}">${regionCrest(id)}${REGIONS[id].name}</span>`;
    }).join('')}
  </div>`;
}

function stashCard(id: RegionId): string {
  const r = REGIONS[id];
  const here = state.region === id && !state.travel;
  return `
    <article class="stash ${here ? 'here' : ''} ${id}${coachTarget(state) === id ? ' coach-target' : ''}">
      <header>
        <div class="who">
          ${regionCrest(id)}
          <div>
            <strong>${r.name}</strong>
            <span class="tag">${r.place}${here ? ' · You are here' : ''}</span>
          </div>
        </div>
        <span class="locals">${r.local.map((g) => goodIcon(g)).join('')}</span>
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

function destPicker(region: (typeof REGIONS)[RegionId], destinations: RegionId[]): string {
  if (showTimberFork(state)) {
    return `
            ${timberForkMarkup(destPick)}
            <input type="hidden" id="dest" value="${destPick}" />`;
  }
  return `
            <label>Destination
              <select id="dest">
                ${destinations
                  .map(
                    (id) =>
                      `<option value="${id}" ${id === destPick ? 'selected' : ''}>${REGIONS[id].name} (${travelSeconds(region.id, id)}s)</option>`
                  )
                  .join('')}
              </select>
            </label>`;
}

function harvestStrip(region: (typeof REGIONS)[RegionId], stash: Inventory): string {
  return harvestNodesMarkup(
    region.name,
    region.foreign.map((g) => GOOD_LABEL[g]).join(' or '),
    region.local.map((g) => {
      const level = nodeLevel(state, region.id, g);
      const cost = nodeUpgradeCost(state, g);
      return {
        good: g,
        regionId: region.id,
        have: fmt(stash[g]),
        level,
        click: fmt(nodeClickAmount(level)),
        idle: fmt(nodeIdlePerSecond(level)),
        cost: cost === null ? '—' : fmtCost(cost),
        afford: cost !== null && stash[g] + 1e-9 >= cost,
      };
    })
  );
}

function tradeDrawer(region: (typeof REGIONS)[RegionId], mark: string): string {
  return `
          <section class="panel npc desk-panel${mark === 'market' ? ' coach-target' : ''}">
            <h2>${panelMark('market')} NPC market <span class="muted">${region.name}</span></h2>
            <div class="desk-coin">
              <span class="lbl">Coin</span>
              <strong id="ui-coin">${fmt(state.coin)}</strong>
              <span class="muted">from sales — no barter</span>
            </div>
            <p class="hint">Coin only. Sell for coin, buy with coin. No barter.</p>
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
            <section class="stashes in-desk" aria-label="Stashes by region">
              ${REGION_IDS.map(stashCard).join('')}
            </section>
          </section>`;
}

function travelDrawer(region: (typeof REGIONS)[RegionId], mark: string): string {
  const destinations = REGION_IDS.filter((id) => id !== state.region);
  const destSecs = travelSeconds(region.id, destPick);
  return `
          <section class="panel depart desk-panel${mark === 'travel' ? ' coach-target' : ''}">
            <h2>${panelMark('travel')} Travel</h2>
            <p class="hint">Fee in a local good. Cargo cap holds. Idle waits at home.</p>
            ${
              showTimberFork(state)
                ? ''
                : `<div class="routes" aria-label="Routes">
              <span>Vale ↔ Ridge ${travelSeconds('vale', 'ridge')}s</span>
              <span>Vale ↔ Cross ${travelSeconds('vale', 'cross')}s</span>
              <span>Cross ↔ Ridge ${travelSeconds('cross', 'ridge')}s</span>
            </div>`
            }
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
              ${destPicker(region, destinations)}
              <button type="button" data-act="depart">Depart ${REGIONS[destPick].name} (${destSecs}s)</button>
            </div>
            <p class="meta" id="ui-cargo-total">Cargo ${fmt(cargoTotalPick())} / ${cargoCap(state)}${cargoHint()}</p>
            ${cargoUpgradePanel(region)}
            <section class="stashes in-desk" aria-label="Stashes by region">
              ${REGION_IDS.map(stashCard).join('')}
            </section>
          </section>`;
}

function render() {
  const inRegion = !!state.region && !state.travel;
  const region = state.region ? REGIONS[state.region] : null;
  const stash = state.region ? state.stashes[state.region] : null;

  if (region && !region.local.includes(feeGood)) feeGood = region.local[0];
  if (region && !region.local.includes(upgradeGood)) upgradeGood = region.local[0];
  if (region && destPick === region.id) {
    destPick = REGION_IDS.find((id) => id !== region.id) ?? 'ridge';
  }

  const energyPct = Math.min(100, (state.energy / HARVEST.energyCap) * 100);
  const travelPct = state.travel
    ? Math.min(100, (state.travel.elapsed / state.travel.duration) * 100)
    : 0;

  const mark = coachTarget(state);

  app.innerHTML = `
    <div class="wrap${desk === 'none' ? ' drawers-shut' : ''}">
      <header class="top">
        <div>
          <h1>Regional trade</h1>
          <p class="sub">Harvest what grows here. Carry what does not.</p>
        </div>
        <div class="top-actions">
          <button type="button" class="ghost" data-act="help" data-help-toggle aria-pressed="${helpOpen}">${
            helpOpen ? 'Hide help' : 'Help'
          }</button>
          <button type="button" class="ghost" data-act="reset">Reset save</button>
        </div>
      </header>

      ${regionRail()}

      ${placeSceneMarkup(state, {
        desk,
        energyHtml: placeEnergyLine(state.energy, HARVEST.energyCap, energyPct),
        goalHtml: goalBlock(),
        harvestHtml: inRegion && region && stash ? harvestStrip(region, stash) : '',
        coachVale: mark === 'vale',
        verbHtml: state.tutorial.splash ? '' : verbMarkup(state),
        beatHtml: coachMarkup(state),
        cheerHtml: cheerMarkup(cheer, cheerLine),
        travelHudHtml: roadHudMarkup(state, travelPct, regionLabel()),
        road: roadProgress(state),
      })}

      ${state.travel ? '' : `<p class="visually-hidden" id="ui-region">${regionLabel()}</p>`}

      ${deskBarMarkup(desk, !!state.travel)}

      ${inRegion && region && desk === 'trade' ? tradeDrawer(region, mark) : ''}
      ${inRegion && region && desk === 'travel' ? travelDrawer(region, mark) : ''}
      ${inRegion && desk === 'craft' ? `<div class="desk-panel">${craftPanel()}</div>` : ''}

      <details class="panel log log-fold">
        <summary>${panelMark('log')} Log</summary>
        <ul id="ui-log">${state.log.map((l) => `<li>${l}</li>`).join('')}</ul>
      </details>
      ${state.tutorial.splash ? splashMarkup() : ''}
    </div>
  `;
  dirty = false;
  paintTradePanel();
  paintHelp();
  paintPlaceChrome();
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
      document.querySelectorAll(`[data-stash="${id}"][data-inv="${g}"]`).forEach((el) => {
        el.textContent = fmt(stash[g]);
      });
    }
  }
  paintPlaceChrome();
  const traveler = document.getElementById('ui-traveler');
  if (traveler) traveler.style.setProperty('--road', String(roadProgress(state)));
  const verbNow = nextVerb(state);
  const verbBar = app.querySelector('[data-verb]');
  if (verbBar && verbBar.getAttribute('data-verb') !== verbNow.id) {
    dirty = true;
  } else {
    const verbBtn = app.querySelector<HTMLButtonElement>('.verb');
    if (verbBtn) {
      verbBtn.textContent = verbNow.label;
      verbBtn.disabled = !verbNow.ready;
    }
    const alt = altHarvestGood(state);
    const altBtn = app.querySelector<HTMLButtonElement>('.verb-alt');
    if (altBtn && alt) {
      altBtn.disabled = !canHarvest(state, alt);
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
    const afford = cost !== null && !!stash && stash[g] + 1e-9 >= cost;
    btn.disabled = !afford;
    btn.closest('.node-card')?.classList.toggle('ready', afford);
  });
  const cargoUpBtn = app.querySelector<HTMLButtonElement>('button[data-act="cargo-upgrade"]');
  const cargoUpErr = canBuyCargoUpgrade(state, upgradeGood);
  if (cargoUpBtn) cargoUpBtn.disabled = !!cargoUpErr;
  const cargoUpErrEl = document.getElementById('ui-cargo-upgrade-err');
  if (cargoUpErrEl) cargoUpErrEl.textContent = cargoUpErr ?? '';
  const cargoUpCostEl = document.getElementById('ui-cargo-upgrade-cost');
  if (cargoUpCostEl) {
    const next = cargoUpgradeCost(state.cargoUpgrades);
    cargoUpCostEl.textContent = `Next +${CARGO_UPGRADE.capPerTier} · ${fmt(next.coin)} coin + ${fmt(next.goodAmount)} ${GOOD_LABEL[upgradeGood]}`;
  }
  writeCargoTotal();

  const here = state.region && !state.travel ? state.stashes[state.region] : null;
  const liveCost = currentRecipeCost(state);
  if (liveCost) {
    for (const [g, need] of recipeNeeds(liveCost)) {
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
  }
  const craftBtn = app.querySelector<HTMLButtonElement>('button[data-act="craft"]');
  const craftErr = canCraftCurrent(state);
  if (craftBtn) craftBtn.disabled = !!craftErr;
  const craftErrEl = document.getElementById('ui-craft-err');
  if (craftErrEl && currentRecipeCost(state)) {
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

function toggleHelp() {
  if (state.tutorial.splash) return;
  helpOpen = !helpOpen;
  saveHelpOpen(helpOpen);
  paintHelp();
}

document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!t || (!app.contains(t) && !t.closest('#helper') && !t.classList.contains('helper-backdrop'))) return;
  const act = t.dataset.act!;
  if (act === 'help') {
    toggleHelp();
    return;
  }
  if (!(t instanceof HTMLButtonElement) || !app.contains(t)) return;
  const good = t.dataset.good as Good | undefined;
  readForm();

  if (act === 'desk') {
    const next = t.dataset.desk as DeskId;
    desk = desk === next ? 'none' : next;
    persistNow();
    dirty = true;
    render();
    return;
  }
  if (act === 'dest') {
    const next = t.dataset.dest as RegionId;
    if (next && next !== state.region) destPick = next;
    persistNow();
    dirty = true;
    render();
    return;
  }

  if (act === 'tutorial-start') {
    startTutorial(state);
    syncTutorial(state, 'start');
    persistNow();
    dirty = true;
    render();
    return;
  }
  if (act === 'tutorial-dismiss') {
    dismissTutorial(state);
    persistNow();
    dirty = true;
    render();
    return;
  }

  if (act === 'reset') {
    if (!confirm('Reset stash, nodes, coin, energy, and region? This clears the game save and restarts the first-trip walk, not the Help preference.')) return;
    state = resetGame();
    GOODS.forEach((g) => (cargoPick[g] = 0));
    destPick = 'ridge';
    feeGood = 'grain';
    upgradeGood = 'grain';
    desk = 'none';
    cheer = null;
    cheerLine = null;
    window.clearTimeout(cheerTimer);
    dirty = true;
    render();
    return;
  }

  const wasTravelling = !!state.travel;
  const wasRegion = state.region;
  let stepped = false;

  if (act === 'harvest' && good) {
    harvestClick(state, good);
    if (syncTutorial(state, 'harvest')) stepped = true;
  }
  if (act === 'upgrade' && good) upgradeNode(state, good);
  if (act === 'cargo-upgrade') buyCargoUpgrade(state, upgradeGood);
  if (act === 'sell' && good) {
    if (sellToNpc(state, good, tradeAmount)) celebrate('sell');
    if (syncTutorial(state, 'sell')) stepped = true;
  }
  if (act === 'buy' && good) {
    if (buyFromNpc(state, good, tradeAmount)) celebrate('buy');
    if (syncTutorial(state, 'buy')) stepped = true;
  }
  if (act === 'haul-sell') {
    const n = ridgeSellAmount(state);
    if (n > 0 && sellToNpc(state, 'grain', n)) celebrate('sell');
    if (syncTutorial(state, 'sell')) stepped = true;
  }
  if (act === 'haul-buy') {
    const n = ridgeBuyOreAmount(state);
    if (n > 0 && buyFromNpc(state, 'ore', n)) celebrate('buy');
    if (syncTutorial(state, 'buy')) stepped = true;
  }
  if (act === 'cancel') cancelTravel(state);
  if (act === 'craft') {
    const beforeBench = state.workbenchCrafted;
    const beforeBrace = state.timberBraceCrafted;
    craftCurrent(state);
    if (state.workbenchCrafted !== beforeBench || state.timberBraceCrafted !== beforeBrace) {
      celebrate('craft');
    }
  }
  if (act === 'pack' && good) {
    packMax(good);
    const input = app.querySelector<HTMLInputElement>(`[data-cargo="${good}"]`);
    if (input) input.value = String(cargoPick[good]);
    writeCargoTotal();
    return;
  }
  if (act === 'haul-depart') {
    const plan = ridgeHaulPlan();
    destPick = plan.to;
    feeGood = plan.feeGood;
    const err = canDepart(state, plan);
    if (err) {
      state.log.unshift(err);
      if (state.log.length > 8) state.log.length = 8;
    } else {
      depart(state, plan);
      GOODS.forEach((g) => (cargoPick[g] = 0));
      desk = 'none';
      celebrate('depart');
    }
  }
  if (act === 'haul-return') {
    const plan = valeReturnPlan();
    destPick = plan.to;
    feeGood = plan.feeGood;
    const err = canDepart(state, plan);
    if (err) {
      state.log.unshift(err);
      if (state.log.length > 8) state.log.length = 8;
    } else {
      depart(state, plan);
      GOODS.forEach((g) => (cargoPick[g] = 0));
      desk = 'none';
      celebrate('depart', 'Homeward.');
    }
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
      desk = 'none';
      celebrate('depart');
    }
  }

  if (syncTutorial(state)) stepped = true;
  const structural =
    !!state.travel !== wasTravelling ||
    state.region !== wasRegion ||
    stepped ||
    act === 'craft' ||
    act === 'upgrade' ||
    act === 'cargo-upgrade' ||
    act === 'sell' ||
    act === 'buy' ||
    act === 'depart' ||
    act === 'haul-depart' ||
    act === 'haul-return' ||
    act === 'haul-sell' ||
    act === 'haul-buy' ||
    act === 'cancel';
  afterAction(structural);
});

app.addEventListener('input', () => {
  const prevDest = destPick;
  readForm();
  writeCargoTotal();
  if (destPick !== prevDest) {
    dirty = true;
    render();
    return;
  }
  paintLive();
  paintTradePanel();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && helpOpen && !state.tutorial.splash) {
    helpOpen = false;
    saveHelpOpen(false);
    paintHelp();
  }
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
  let stepped = false;
  while (acc >= step) {
    if (state.tutorial.splash) {
      acc -= step;
      continue;
    }
    const travelling = !!state.travel;
    tick(state, step);
    if (travelling && !state.travel) {
      arrived = true;
      celebrate('arrive');
    }
    if (syncTutorial(state)) stepped = true;
    acc -= step;
  }

  if (persistAcc >= 1) {
    persistNow();
    persistAcc = 0;
  }

  if (arrived || stepped || dirty) {
    dirty = true;
    render();
  } else {
    paintLive();
  }

  requestAnimationFrame(loop);
}

render();
requestAnimationFrame(loop);
