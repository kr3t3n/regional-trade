import { GOOD_LABEL, type Good, type RegionId } from './config';

const GOOD_SVG: Record<Good, string> = {
  grain: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#c49210" d="M12.8 21h-1.6V8.2c1.7.4 3.3 1.6 3.8 3.4.2.8-.4 1.2-1 1l-2.8-1.2V21Z"/><path fill="#e0b322" d="M12 3.2c1.2 1.4 1.5 3.2.7 4.6L12 8.2c-1.6-.5-2.8-1.8-3.2-3.4-.3-1.2.7-1.8 1.6-1.4L12 3.2Z"/><path fill="#d4a017" d="M7.2 8.1c1.6.2 3 .9 3.8 2.2l.2.4c-1.7.3-3.4-.3-4.6-1.6-.8-.9-.2-1.7.6-1Z"/><path fill="#c9a227" d="M16.8 8.1c-.8-.7-1.4.1-.6 1 1.2 1.3 2.9 1.9 4.6 1.6l-.2-.4c-.8-1.3-2.2-2-3.8-2.2Z"/></svg>`,
  ore: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#8b93a1" d="m12 3.2 6.4 4.2v8.8L12 20.8 5.6 16.2V7.4L12 3.2Z"/><path fill="#c5cad3" d="m12 3.2 6.4 4.2-6.4 3.6L5.6 7.4 12 3.2Z"/><path fill="#6d7582" d="M12 11 18.4 7.4v8.8L12 20.8V11Z"/></svg>`,
  timber: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.4" y="13.2" width="17.2" height="5.2" rx="2.4" fill="#8b5a2b"/><rect x="3.4" y="13.2" width="17.2" height="2.2" rx="1.2" fill="#c0894a"/><rect x="4.6" y="6.6" width="14.8" height="5" rx="2.3" fill="#a36a34"/><rect x="4.6" y="6.6" width="14.8" height="2" rx="1.1" fill="#d2a36a"/><circle cx="6.6" cy="15.8" r="1.05" fill="#5c3a1c"/><circle cx="7.6" cy="9.2" r=".9" fill="#6a431f"/></svg>`,
  fibre: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12.4" r="6.4" fill="#7a9a46"/><circle cx="12" cy="12.4" r="4.1" fill="#c5d89a"/><circle cx="12" cy="12.4" r="1.5" fill="#5d7534"/><path fill="#8e6b2a" d="M11.2 4.4h1.6v4.2h-1.6z"/><path fill="#c4a35a" d="M9.4 3.4h5.2v1.6H9.4z"/></svg>`,
};

const CREST_SVG: Record<RegionId, string> = {
  vale: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#2d6a3c" d="M12 4.2c2.8 2.4 6.6 4 8.2 4.6-1 5.8-4.2 9.4-8.2 11-4-1.6-7.2-5.2-8.2-11C5.4 8.2 9.2 6.6 12 4.2Z"/><path fill="#7dbe6c" d="M12 7.2c1.4 1.6 3.6 2.6 5.2 3-0.6 3.2-2.4 5.4-5.2 6.6V7.2Z"/></svg>`,
  ridge: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#9a4a1e" d="m3.2 16.8 5.2-8.2 3.4 5 3-4.6 6 7.8H3.2Z"/><path fill="#d08a4a" d="m8.4 8.6 2.4 3.6L12 10l3.2-2.2L18.6 12 12 6.4 8.4 8.6Z"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#2a5d7c" d="M10.6 3.4h2.8v17.2h-2.8z"/><path fill="#2a5d7c" d="M3.4 10.6h17.2v2.8H3.4z"/><circle cx="12" cy="12" r="2.1" fill="#7eb0d0"/></svg>`,
};

export function goodIcon(g: Good): string {
  return `<span class="ico ${g}" title="${GOOD_LABEL[g]}" aria-hidden="true">${GOOD_SVG[g]}</span>`;
}

export function goodChip(g: Good): string {
  return `<span class="gchip">${goodIcon(g)}<span>${GOOD_LABEL[g]}</span></span>`;
}

export function regionCrest(id: RegionId): string {
  return `<span class="crest ${id}" aria-hidden="true">${CREST_SVG[id]}</span>`;
}

export function panelMark(kind: 'harvest' | 'market' | 'travel' | 'craft' | 'log'): string {
  const svg =
    kind === 'harvest'
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 20.2 4.8 18l8.4-8.4 2.2 2.2L7 20.2Zm9.3-11.6 1.8-3.2 1.5 1.5-3.2 1.8-.1-.1ZM8.6 6.4c1.8-1.8 4.4-2 5.6-.8l-4.8 4.8c-1.2-1.2-1-3.8.8-5.6Z"/></svg>`
      : kind === 'market'
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 10.2h16v9.2H4v-9.2Zm1.6-5 2.2 3.6h8.4L18.4 5.2H5.6ZM6.2 12.4h4.2v5.4H6.2v-5.4Z"/></svg>`
        : kind === 'travel'
          ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 12.8h9.2l-1.6 4.6h2.2l3.4-8.2H4v3.6Zm13.4-6.2-2.2 1.2 4.2 2.2 2.2-1.2-4.2-2.2Z"/></svg>`
          : kind === 'craft'
            ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.2 14.6 4 18.8l1.2 1.2 4.2-4.2-1.2-1.2Zm8.9-9.3-1.5 1.5 1.6 1.6 1.5-1.5c.6-.6.6-1.5 0-2.1-.6-.6-1.5-.6-2.1 0Zm-6.2 6.2 5.1-5.1-1.6-1.6-5.1 5.1 1.6 1.6Z"/></svg>`
            : `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5.4h12v1.8H6V5.4Zm0 4.6h12v1.8H6V10Zm0 4.6h8v1.8H6v-1.8Z"/></svg>`;
  return `<span class="ph">${svg}</span>`;
}
