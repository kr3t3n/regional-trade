import {
  GOOD_LABEL,
  HARVEST,
  HELP_KEY,
  NEXT_RECIPE_NEEDS,
  NPC,
  TRAVEL,
  WORKBENCH_UNLOCK_CARGO,
} from './config';

/**
 * First visit (no stored pref) opens the helper, then stores off so later
 * visits stay closed unless the player toggles it on.
 */
export function loadHelpOpen(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    const raw = localStorage.getItem(HELP_KEY);
    if (raw === 'off') return false;
    if (raw === 'on') return true;
    saveHelpOpen(false);
    return true;
  } catch {
    return true;
  }
}

export function saveHelpOpen(open: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(HELP_KEY, open ? 'on' : 'off');
  } catch {
    /* quota / private mode */
  }
}

export function helperMarkup(): string {
  return `
    <button type="button" class="helper-backdrop" data-act="help" hidden aria-label="Hide help"></button>
    <aside id="helper" class="helper" hidden>
      <div class="helper-head">
        <div>
          <p class="lbl">Field notes</p>
          <h2>How this loop works</h2>
        </div>
        <button type="button" class="ghost" data-act="help">Close</button>
      </div>
      <p class="helper-note">Short facts, not a first-trip walkthrough. Toggle anytime.</p>
      <dl>
        <div>
          <dt>Harvest</dt>
          <dd>Click +${HARVEST.clickAmount} of a <em>local</em> good while you stand there. Idle +${HARVEST.idlePerSecond}/s × node in-region only — pauses in transit. Energy ${HARVEST.energyCap}, regen 1 / ${HARVEST.energyRegenSeconds}s.</dd>
        </div>
        <div>
          <dt>Travel</dt>
          <dd>Fee ${TRAVEL.feeAmount} of a local good. You are not in a region while moving. Vale↔Ridge 25s; via Cross 20s + 20s. Cancel loses the fee; cargo returns. No teleport.</dd>
        </div>
        <div>
          <dt>Cargo</dt>
          <dd>Cap ${TRAVEL.cargoCap} (any mix). Goods leave the stash on depart and land at the destination. Leave 20 grain in Vale if Workbench is still open.</dd>
        </div>
        <div>
          <dt>NPC spreads</dt>
          <dd>Coin only — totals are amount × unit price. Local buy ${NPC.localBuyMult}P / sell ${NPC.localSellMult}P. Foreign buy ${NPC.foreignBuyMult}P / sell ${NPC.foreignSellMult}P. P=${NPC.fairPrice}. Ridge ore sells at 1.3. No 1:1 swap. No global price board.</dd>
        </div>
        <div>
          <dt>Coin</dt>
          <dd>Only from NPC sales. Not harvestable. Spend it to buy the missing good.</dd>
        </div>
        <div>
          <dt>Craft gates</dt>
          <dd>Workbench: 20 grain + 20 ore in <em>this</em> stash. Vale cannot harvest ore. After that, the next recipe still spends ${GOOD_LABEL[NEXT_RECIPE_NEEDS]} (foreign in Vale) plus cargo +${WORKBENCH_UNLOCK_CARGO} or local craft speed — promised, not shipped.</dd>
        </div>
        <div>
          <dt>Maps / boards</dt>
          <dd>Three region stashes are the map. You are the only one here. No player books.</dd>
        </div>
      </dl>
    </aside>`;
}

export function mountHelper(): void {
  if (document.getElementById('helper')) return;
  document.body.insertAdjacentHTML('beforeend', helperMarkup());
}

export function applyHelp(open: boolean): void {
  const panel = document.getElementById('helper');
  const backdrop = document.querySelector<HTMLElement>('.helper-backdrop');
  const toggle = document.querySelector<HTMLElement>('[data-act="help"][data-help-toggle]');
  if (panel) {
    panel.hidden = !open;
    panel.classList.toggle('open', open);
  }
  if (backdrop) backdrop.hidden = !open;
  if (toggle) {
    toggle.setAttribute('aria-pressed', open ? 'true' : 'false');
    toggle.textContent = open ? 'Hide help' : 'Help';
  }
  document.body.classList.toggle('helper-open', open);
}
