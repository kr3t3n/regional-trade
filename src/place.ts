/**
 * Place scene, region map stub, and Timber brace travel fork.
 * Voice: dry, practical, weather-bitten. Numbers stay in config.ts.
 */
import {
  REGIONS,
  TIMBER_BRACE_COST,
  TRAVEL,
  npcBuyPrice,
  npcSellPrice,
  travelSeconds,
  type RegionId,
} from './config';
import type { GameState } from './game';
import { regionCrest } from './icons';

export type DeskId = 'none' | 'trade' | 'travel' | 'craft';

export const PLACE: Record<
  RegionId,
  { title: string; mood: string; voice: string; harvestNode: string; marketNode: string }
> = {
  vale: {
    title: 'Vale Fields',
    mood: 'Low fields. Soft fibre. Grain underfoot.',
    voice: 'Wind in the grain. Burst, then wait. Haul what does not grow here.',
    harvestNode: 'Fields',
    marketNode: 'Stall',
  },
  ridge: {
    title: 'Ridge Heights',
    mood: 'Stone and sawdust. Heights, not a market hall.',
    voice: 'Ore in the cut. Timber where the saw left it. Coin from sales.',
    harvestNode: 'Cut',
    marketNode: 'Stall',
  },
  cross: {
    title: 'Cross Way',
    mood: 'A way-station, not a capital.',
    voice: 'Two roads, one wait. Pack and move. This is not a seat of trade.',
    harvestNode: 'Yard',
    marketNode: 'Stall',
  },
};

export const ROAD_VOICE = 'On the road: no harvest. Cargo rides with you.';

export type MapNode = 'harvest' | 'market' | 'road';

export function youMapNode(state: GameState, desk: DeskId): MapNode {
  if (state.travel) return 'road';
  if (desk === 'trade') return 'market';
  if (desk === 'travel') return 'road';
  return 'harvest';
}

export function showTimberFork(state: GameState): boolean {
  return (
    state.workbenchCrafted &&
    !state.timberBraceCrafted &&
    !state.travel &&
    state.region === 'vale'
  );
}

export function deskForTarget(target: string): DeskId | null {
  if (target === 'market') return 'trade';
  if (target === 'travel') return 'travel';
  if (target === 'craft') return 'craft';
  return null;
}

export function fmtPrice(n: number): string {
  const s = n.toFixed(2);
  if (s.endsWith('00')) return String(Math.round(n));
  if (s.endsWith('0')) return n.toFixed(1);
  return s;
}

export interface TimberForkLeg {
  id: 'ridge' | 'cross';
  name: string;
  place: string;
  seconds: number;
  sellGrain: number;
  buyTimber: number;
  grainCargo: number;
  timberNeed: number;
  spend: 'grain' | 'time';
}

/** Grain to raise the brace timber at this market, plus the local fee. */
export function timberForkGrainCargo(
  region: RegionId,
  timberNeed = TIMBER_BRACE_COST.timber ?? 20
): number {
  const sell = npcBuyPrice(region, 'grain');
  const buy = npcSellPrice(region, 'timber');
  return Math.round((timberNeed * buy) / sell + TRAVEL.feeAmount);
}

export function timberForkLeg(id: 'ridge' | 'cross'): TimberForkLeg {
  const timberNeed = TIMBER_BRACE_COST.timber ?? 20;
  return {
    id,
    name: REGIONS[id].name,
    place: REGIONS[id].place,
    seconds: travelSeconds('vale', id),
    sellGrain: npcBuyPrice(id, 'grain'),
    buyTimber: npcSellPrice(id, 'timber'),
    grainCargo: timberForkGrainCargo(id, timberNeed),
    timberNeed,
    spend: id === 'ridge' ? 'time' : 'grain',
  };
}

export function timberForkLegs(): [TimberForkLeg, TimberForkLeg] {
  return [timberForkLeg('ridge'), timberForkLeg('cross')];
}

function forkSpendLine(leg: TimberForkLeg): string {
  if (leg.spend === 'time') {
    return 'Spends time. Better grain sale, dear timber, longer road.';
  }
  return 'Spends grain. Cheap timber, thin grain sale, shorter wait.';
}

export function timberForkMarkup(destPick: RegionId): string {
  const legs = timberForkLegs();
  return `
    <div class="fork" role="group" aria-label="Ridge or Cross for timber">
      ${legs
        .map((leg) => {
          const on = destPick === leg.id;
          return `
        <button type="button" class="fork-card ${leg.id}${on ? ' pick' : ''}" data-act="dest" data-dest="${leg.id}" aria-pressed="${on}">
          <span class="lbl">${leg.place}</span>
          <strong>${leg.name}</strong>
          <span class="fork-time">${leg.seconds}s</span>
          <p>Sell grain ${fmtPrice(leg.sellGrain)} · buy timber ${fmtPrice(leg.buyTimber)}</p>
          <p>~${leg.grainCargo} grain cargo for ${leg.timberNeed} timber</p>
          <p class="muted">${forkSpendLine(leg)}</p>
        </button>`;
        })
        .join('')}
    </div>
    <p class="fork-sum">Same ${TIMBER_BRACE_COST.timber ?? 20} timber. One spends grain, the other spends time.</p>`;
}

function travelerSvg(): string {
  return `<svg class="traveler-svg" viewBox="0 0 56 88" aria-hidden="true">
    <path fill="currentColor" d="M28 8c4.2 0 7.4 3.4 7.4 7.6S32.2 23 28 23s-7.4-3.2-7.4-7.4S23.8 8 28 8Z"/>
    <path fill="currentColor" d="M18.2 26.2c4.4-2.2 15.2-2.2 19.8.4 2.2 1.2 3.4 3.8 2.8 6.4L37.4 52.6h-5.2l-1.2 22.8h-5.8L24 52.6h-5.4l-3.2-19.2c-.8-2.8.4-5.6 2.8-7.2Z"/>
    <path fill="currentColor" d="M16.6 34.4c-4.6 1-8.2 4.2-8.4 7.2-.2 2.2 1.2 3.2 2.8 2.6l7.2-3.2-1.6-6.6Z"/>
    <path fill="currentColor" d="M34.8 54.2 32 75.4h6.4l5.6-16.8c1-3.2-.6-5.2-3.4-5.6l-5.8 1.2Z"/>
    <path fill="currentColor" opacity=".85" d="M39.2 24.8c2.4-.2 6.6 2.4 7.2 6.2.6 3.2-1 5.4-3.2 6.2l-5.4 1.4.8-12.2 0.6-1.6Z"/>
  </svg>`;
}

function sceneArt(kind: RegionId | 'transit'): string {
  if (kind === 'vale') {
    return `<svg class="scene-svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="640" height="240" fill="#8aa8b4"/>
      <rect y="0" width="640" height="118" fill="#9eb6c0"/>
      <ellipse cx="520" cy="42" rx="38" ry="38" fill="#f3ead0" opacity=".55"/>
      <path fill="#6d8a3c" d="M0 128c70-28 140-22 210-8 80 16 150-10 230-6 70 4 130 22 200 8v118H0V128Z"/>
      <path fill="#7d9a48" d="M0 152c90-18 170 8 250 4 90-4 160-24 250-10 60 8 100 16 140 6v88H0V152Z"/>
      <path fill="#c4a35a" opacity=".55" d="M40 186 48 152h4l8 34h-6l-4-18-4 18zm24 0 6-30h3.5l7 30h-5l-3.2-16-3.3 16zm22 0 7-32h4l8 32h-5.5l-4-17-3.5 17zm26 0 5-28h3l6 28h-5l-2.5-14-2.5 14z"/>
      <path fill="#c4a35a" opacity=".45" d="M320 194 328 158h4l9 36h-6l-4.5-19-4.5 19zm28 0 7-32h3.5l8 32h-5.5l-3.5-16-3.5 16zm24 0 6-30h4l7 30h-5l-3-15-3 15z"/>
      <path fill="#8aa85a" d="M118 200c8-14 22-16 28-6 6-12 18-14 24-2 4-10 14-12 18 0v18H118v-10Z"/>
      <path fill="#6f8a42" d="M470 198c10-16 26-18 34-6 8-14 22-16 28 0v20H470v-14Z"/>
    </svg>`;
  }
  if (kind === 'ridge') {
    return `<svg class="scene-svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="640" height="240" fill="#c4a07a"/>
      <rect y="0" width="640" height="110" fill="#d4b48c"/>
      <path fill="#8a5a38" d="M0 150 120 62l70 52 90-78 80 70 110-64 170 86v114H0Z"/>
      <path fill="#6e4630" d="M0 176 90 118l60 36 86-58 74 50 130-46 200 76v64H0Z"/>
      <path fill="#a36a34" d="M48 198h92v18H48zm12-16h68v16H60z"/>
      <path fill="#c0894a" d="M52 198h84v6H52z"/>
      <circle cx="210" cy="188" r="1.6" fill="#e6d0b4" opacity=".7"/>
      <circle cx="248" cy="202" r="1.2" fill="#e6d0b4" opacity=".55"/>
      <circle cx="400" cy="194" r="1.4" fill="#e6d0b4" opacity=".6"/>
      <circle cx="520" cy="208" r="1.1" fill="#e6d0b4" opacity=".5"/>
    </svg>`;
  }
  if (kind === 'cross') {
    return `<svg class="scene-svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="640" height="240" fill="#9aa3a8"/>
      <rect y="0" width="640" height="108" fill="#aeb6b4"/>
      <rect y="108" width="640" height="132" fill="#8a8070"/>
      <path fill="#6e6758" d="M-20 210 220 40l36 20L40 230z"/>
      <path fill="#6e6758" d="M660 36 360 220l-34-18L630 20z"/>
      <path fill="#b9a27a" d="M268 148h72v44h-72z"/>
      <path fill="#8a6a3c" d="M258 136h92l-12 14H270z"/>
      <rect x="300" y="166" width="14" height="26" fill="#5c4a32"/>
    </svg>`;
  }
  return `<svg class="scene-svg" viewBox="0 0 640 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="640" height="240" fill="#3d4d6e"/>
    <rect y="0" width="640" height="100" fill="#4a5a78"/>
    <path fill="#2a3348" d="M0 150h640v90H0z"/>
    <path fill="#5a4a32" d="M0 168h640l-40 36H40z"/>
    <path fill="#3d3428" d="M0 200h640v20H0z"/>
  </svg>`;
}

export function regionMapMarkup(state: GameState, desk: DeskId): string {
  const region = state.travel ? state.travel.to : state.region;
  const place = region ? PLACE[region] : PLACE.vale;
  const you = youMapNode(state, desk);
  const nodes: { id: MapNode; label: string; x: number; y: number }[] = [
    { id: 'harvest', label: place.harvestNode, x: 36, y: 42 },
    { id: 'market', label: place.marketNode, x: 164, y: 42 },
    { id: 'road', label: 'Road', x: 100, y: 96 },
  ];
  return `
    <figure class="region-map" aria-label="Region map">
      <svg viewBox="0 0 200 128" role="img" aria-label="${place.title} map. You are the only one here.">
        <path class="map-edge" d="M36 42h128M36 42 100 96M164 42 100 96"/>
        ${nodes
          .map(
            (n) => `
          <g class="map-node ${n.id}${you === n.id ? ' you' : ''}">
            <circle cx="${n.x}" cy="${n.y}" r="11"/>
            <text x="${n.x}" y="${n.y + 28}">${n.label}</text>
          </g>`
          )
          .join('')}
        ${nodes
          .filter((n) => n.id === you)
          .map(
            (n) => `
          <g class="map-you">
            <circle cx="${n.x}" cy="${n.y}" r="5"/>
            <text x="${n.x}" y="${n.y - 16}">You</text>
          </g>`
          )
          .join('')}
      </svg>
      <figcaption>You are the only one here.</figcaption>
    </figure>`;
}

export function placeHereLabel(state: GameState): string {
  if (state.travel) {
    return `${REGIONS[state.travel.from].place} → ${REGIONS[state.travel.to].place}`;
  }
  return state.region ? PLACE[state.region].title : 'The road';
}

export function placeMood(state: GameState): string {
  if (state.travel) return ROAD_VOICE;
  return state.region ? PLACE[state.region].mood : ROAD_VOICE;
}

export function placeVoice(state: GameState): string {
  if (state.travel) return ROAD_VOICE;
  return state.region ? PLACE[state.region].voice : ROAD_VOICE;
}

export function placeKind(state: GameState): RegionId | 'transit' {
  if (state.travel) return 'transit';
  return state.region ?? 'vale';
}

export function placeEnergyLine(energy: number, cap: number, pct: number): string {
  return `<div class="place-energy">
    <span class="lbl">Energy</span>
    <strong><span id="ui-energy">${energy}</span> / ${cap}</strong>
    <div class="bar energy"><div class="fill" id="ui-energy-bar" style="width:${pct}%"></div></div>
  </div>`;
}

export function placeSceneMarkup(
  state: GameState,
  opts: {
    desk: DeskId;
    energyHtml: string;
    goalHtml: string;
    harvestHtml: string;
    coachVale: boolean;
  }
): string {
  const kind = placeKind(state);
  const hereId = state.region && !state.travel ? state.region : '';
  const here = !!hereId;
  return `
    <section class="place ${kind}${hereId ? ` ${hereId}` : ''}${
      opts.coachVale ? ' coach-target' : ''
    }" data-place="${kind}" data-region="${hereId || 'road'}">
      <div class="place-art" aria-hidden="true">
        ${sceneArt(kind)}
        <div class="traveler ${state.travel ? 'walk' : 'stand'}">${travelerSvg()}</div>
      </div>
      <div class="place-copy">
        <p class="lbl">${state.travel ? 'In transit' : 'You stand in'}</p>
        <h2 class="place-title">${regionCrest(state.travel ? state.travel.to : (state.region ?? 'vale'))}${placeHereLabel(state)}</h2>
        <p class="place-mood">${placeMood(state)}</p>
        <p class="place-voice">${placeVoice(state)}</p>
        ${opts.energyHtml}
      </div>
      ${regionMapMarkup(state, opts.desk)}
      ${opts.goalHtml}
      ${here ? opts.harvestHtml : ''}
    </section>`;
}

export function deskBarMarkup(desk: DeskId, travelling: boolean): string {
  if (travelling) return '';
  const btn = (id: DeskId, label: string) =>
    `<button type="button" class="desk-btn${desk === id ? ' on' : ''}" data-act="desk" data-desk="${id}" aria-pressed="${desk === id}">${label}</button>`;
  return `
    <nav class="desk-bar" aria-label="Open trade or craft">
      ${btn('trade', 'Trade at the stall')}
      ${btn('travel', 'Pack the road')}
      ${btn('craft', 'The bench')}
      <span class="desk-hint muted">Numbers wait in the stall and on the road — not the field.</span>
    </nav>`;
}

export function placeCopyHasForbidden(): string[] {
  const blob = [
    ...Object.values(PLACE).flatMap((p) => [p.mood, p.voice, p.title]),
    ROAD_VOICE,
    'Same timber. One spends grain, the other spends time.',
  ].join(' ');
  const errors: string[] = [];
  if (/honesty|free travel|global board|1:1/i.test(blob)) {
    errors.push('place copy must not spoil honesty suite');
  }
  return errors;
}
