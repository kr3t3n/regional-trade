import {
  CARGO_UPGRADE,
  HARVEST,
  HELP_KEY,
  NPC,
  TRAVEL,
  WORKBENCH_COST,
  WORKBENCH_UNLOCK_CARGO,
} from './config';
import { FIELD_NOTES_CRAFT } from './mission';

/**
 * Missing pref stores off and stays closed. The first-trip walk owns
 * onboarding. Field notes never auto-reopen after that write.
 */
export function loadHelpOpen(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(HELP_KEY);
    if (raw === 'off') return false;
    if (raw === 'on') return true;
    saveHelpOpen(false);
    return false;
  } catch {
    return false;
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
      <p class="helper-note">Short facts — not the first-trip walk. Toggle anytime.</p>
      <dl>
        <div>
          <dt>Harvest</dt>
          <dd>Click +${HARVEST.clickAmount} local while you stand there. Idle +${HARVEST.idlePerSecond}/s × node in-region only — quiet on the road. Energy ${HARVEST.energyCap}, regen 1 / ${HARVEST.energyRegenSeconds}s.</dd>
        </div>
        <div>
          <dt>Travel</dt>
          <dd>Fee ${TRAVEL.feeAmount} local. Nowhere while moving. Vale↔Ridge 25s; via Cross 20s+20s. Cancel burns fee; cargo comes home. No teleport.</dd>
        </div>
        <div>
          <dt>Cargo</dt>
          <dd>Cap ${TRAVEL.cargoCap} until timber brace, then ${TRAVEL.cargoCap + WORKBENCH_UNLOCK_CARGO}. Paid upgrades add +${CARGO_UPGRADE.capPerTier} each on the current cap — coin plus a local good in this stash. Leave ${WORKBENCH_COST.grain} grain in Vale if Workbench still open.</dd>
        </div>
        <div>
          <dt>NPC spreads</dt>
          <dd>Coin only; amount × unit. Local buy ${NPC.localBuyMult}P / sell ${NPC.localSellMult}P. Foreign buy ${NPC.foreignBuyMult}P / sell ${NPC.foreignSellMult}P. Ridge ore 1.3. No 1:1. No global board.</dd>
        </div>
        <div>
          <dt>Coin</dt>
          <dd>Only from NPC sales.</dd>
        </div>
        <div>
          <dt>Craft gates</dt>
          <dd>${FIELD_NOTES_CRAFT}</dd>
        </div>
        <div>
          <dt>Maps / boards</dt>
          <dd>Three region stashes are the map. You are the only one here.</dd>
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
