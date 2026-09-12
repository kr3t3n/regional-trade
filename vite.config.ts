import { defineConfig } from 'vite'

/** Normalize a Vite subdirectory base (`/foo/`). */
function normalizeBase(value: string): string {
  const trimmed = value.trim()
  if (trimmed === './' || trimmed === '.') return './'
  const withLead = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLead.endsWith('/') ? withLead : `${withLead}/`
}

/**
 * Dual deploy bases (override with VITE_BASE):
 * - pepelyankov.com → /games/trade/   (default)
 * - GitHub Pages    → /regional-trade/  (VITE_BASE or GITHUB_PAGES=1)
 */
function resolveBase(): string {
  const override = process.env.VITE_BASE?.trim()
  if (override) return normalizeBase(override)
  const pages = process.env.GITHUB_PAGES?.trim().toLowerCase()
  if (pages === '1' || pages === 'true') return '/regional-trade/'
  return '/games/trade/'
}

export default defineConfig({
  base: resolveBase(),
})
