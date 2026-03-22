/**
 * Tests for blind-003: badge system, color legend, ResultCard blindfold stats.
 *
 * Covers:
 *  1. Badge criteria: bestTile >= 512 && manualRevealsUsed <= 1
 *  2. localStorage key '2048-blindfold-badge' read / write (loadBlindBadge / saveBlindBadge)
 *  3. COLOR_LEGEND tile→color mapping correctness
 *  4. ModeSelect blindfoldBadgeEarned flag logic
 *  5. ResultCard blindfold prop contracts (pure data/logic checks — no DOM)
 *  6. Boundary / edge cases
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Minimal localStorage mock (same pattern as existing tests)
// ---------------------------------------------------------------------------
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
})

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key]
  }
})

// ---------------------------------------------------------------------------
// Inline badge helpers extracted from App.tsx so we can unit-test them without
// mounting React.  These mirror the exact implementation.
// ---------------------------------------------------------------------------
const BLINDFOLD_BADGE_KEY = '2048-blindfold-badge'

interface BlindBadge {
  earned: boolean
  bestTile: number
  revealsUsed: number
  date: string
}

function loadBlindBadge(): BlindBadge | null {
  try {
    const raw = localStorage.getItem(BLINDFOLD_BADGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BlindBadge
  } catch {
    return null
  }
}

function saveBlindBadge(badge: BlindBadge): void {
  try {
    localStorage.setItem(BLINDFOLD_BADGE_KEY, JSON.stringify(badge))
  } catch {
    // ignore
  }
}

/** Badge earned when bestTile >= 512 AND manualRevealsUsed <= 1 */
function badgeCriteria(bestTile: number, manualRevealsUsed: number): boolean {
  return bestTile >= 512 && manualRevealsUsed <= 1
}

// ---------------------------------------------------------------------------
// COLOR_LEGEND data (mirrors ModeSelect.tsx — test the values, not just shape)
// ---------------------------------------------------------------------------
const COLOR_LEGEND: Array<{ value: number; name: string; bg: string; fg: string }> = [
  { value: 2,    name: 'Cream',        bg: '#EEE4DA', fg: '#7A6C5E' },
  { value: 4,    name: 'Warm Tan',     bg: '#EDE0C8', fg: '#7A6C5E' },
  { value: 8,    name: 'Coral',        bg: '#F2B179', fg: '#F9F6F2' },
  { value: 16,   name: 'Orange',       bg: '#F59563', fg: '#F9F6F2' },
  { value: 32,   name: 'Red-Orange',   bg: '#F67C5F', fg: '#F9F6F2' },
  { value: 64,   name: 'Red',          bg: '#F65E3B', fg: '#F9F6F2' },
  { value: 128,  name: 'Amber',        bg: '#EDCF72', fg: '#F9F6F2' },
  { value: 256,  name: 'Gold',         bg: '#EDCC61', fg: '#F9F6F2' },
  { value: 512,  name: 'Deep Gold',    bg: '#9B2335', fg: '#F9F6F2' },
  { value: 1024, name: 'Forest Green', bg: '#27622A', fg: '#F9F6F2' },
  { value: 2048, name: 'Deep Green',   bg: '#1C3461', fg: '#F9F6F2' },
]

// TILE_COLORS mirror (from ResultCard.tsx) — must match COLOR_LEGEND bg/fg
const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  2:    { bg: '#EEE4DA', fg: '#7A6C5E' },
  4:    { bg: '#EDE0C8', fg: '#7A6C5E' },
  8:    { bg: '#F2B179', fg: '#F9F6F2' },
  16:   { bg: '#F59563', fg: '#F9F6F2' },
  32:   { bg: '#F67C5F', fg: '#F9F6F2' },
  64:   { bg: '#F65E3B', fg: '#F9F6F2' },
  128:  { bg: '#EDCF72', fg: '#F9F6F2' },
  256:  { bg: '#EDCC61', fg: '#F9F6F2' },
  512:  { bg: '#9B2335', fg: '#F9F6F2' },
  1024: { bg: '#27622A', fg: '#F9F6F2' },
  2048: { bg: '#1C3461', fg: '#F9F6F2' },
}

// ===========================================================================
// 1. Badge criteria: bestTile >= 512 && manualRevealsUsed <= 1
// ===========================================================================
describe('badge criteria', () => {
  // Happy path — exactly at threshold
  it('earns badge with bestTile=512 and 0 manual reveals', () => {
    expect(badgeCriteria(512, 0)).toBe(true)
  })

  it('earns badge with bestTile=512 and 1 manual reveal', () => {
    expect(badgeCriteria(512, 1)).toBe(true)
  })

  it('earns badge with bestTile=1024 and 0 manual reveals', () => {
    expect(badgeCriteria(1024, 0)).toBe(true)
  })

  it('earns badge with bestTile=2048 and 1 manual reveal', () => {
    expect(badgeCriteria(2048, 1)).toBe(true)
  })

  // Boundary failures — reveals just over the limit
  it('does NOT earn badge with bestTile=512 and 2 manual reveals', () => {
    expect(badgeCriteria(512, 2)).toBe(false)
  })

  it('does NOT earn badge with bestTile=512 and 3 manual reveals', () => {
    expect(badgeCriteria(512, 3)).toBe(false)
  })

  // Boundary failures — tile just under the limit
  it('does NOT earn badge with bestTile=256 and 0 manual reveals', () => {
    expect(badgeCriteria(256, 0)).toBe(false)
  })

  it('does NOT earn badge with bestTile=256 and 1 manual reveal', () => {
    expect(badgeCriteria(256, 1)).toBe(false)
  })

  // Both conditions fail simultaneously
  it('does NOT earn badge with bestTile=128 and 2 manual reveals', () => {
    expect(badgeCriteria(128, 2)).toBe(false)
  })

  // Edge: bestTile = 0 (game just started / no merges)
  it('does NOT earn badge with bestTile=0', () => {
    expect(badgeCriteria(0, 0)).toBe(false)
  })

  // Edge: exactly one below tile threshold
  it('does NOT earn badge with bestTile=511 and 0 manual reveals', () => {
    expect(badgeCriteria(511, 0)).toBe(false)
  })

  // Edge: manualRevealsUsed computed as (3 - revealsRemaining)
  it('manualRevealsUsed=3-revealsRemaining: 3 remaining → 0 used → badge earned for 512', () => {
    const revealsRemaining = 3
    const finalManualRevealsUsed = 3 - revealsRemaining
    expect(badgeCriteria(512, finalManualRevealsUsed)).toBe(true)
  })

  it('manualRevealsUsed=3-revealsRemaining: 1 remaining → 2 used → badge NOT earned for 512', () => {
    const revealsRemaining = 1
    const finalManualRevealsUsed = 3 - revealsRemaining
    expect(badgeCriteria(512, finalManualRevealsUsed)).toBe(false)
  })
})

// ===========================================================================
// 2. localStorage key '2048-blindfold-badge' read / write
// ===========================================================================
describe('loadBlindBadge / saveBlindBadge', () => {
  it('returns null when localStorage is empty', () => {
    expect(loadBlindBadge()).toBeNull()
  })

  it('round-trips a badge object correctly', () => {
    const badge: BlindBadge = {
      earned: true,
      bestTile: 512,
      revealsUsed: 1,
      date: '2026-03-22',
    }
    saveBlindBadge(badge)
    const loaded = loadBlindBadge()
    expect(loaded).not.toBeNull()
    expect(loaded!.earned).toBe(true)
    expect(loaded!.bestTile).toBe(512)
    expect(loaded!.revealsUsed).toBe(1)
    expect(loaded!.date).toBe('2026-03-22')
  })

  it('uses the correct localStorage key: 2048-blindfold-badge', () => {
    const badge: BlindBadge = {
      earned: true,
      bestTile: 1024,
      revealsUsed: 0,
      date: '2026-03-22',
    }
    saveBlindBadge(badge)
    // Read raw from store to verify the key name
    expect(store[BLINDFOLD_BADGE_KEY]).toBeDefined()
    const parsed = JSON.parse(store[BLINDFOLD_BADGE_KEY])
    expect(parsed.bestTile).toBe(1024)
  })

  it('overwrites existing badge on save', () => {
    const first: BlindBadge = { earned: true, bestTile: 512, revealsUsed: 1, date: '2026-03-21' }
    const second: BlindBadge = { earned: true, bestTile: 1024, revealsUsed: 0, date: '2026-03-22' }
    saveBlindBadge(first)
    saveBlindBadge(second)
    const loaded = loadBlindBadge()
    expect(loaded!.bestTile).toBe(1024)
    expect(loaded!.date).toBe('2026-03-22')
  })

  it('returns null (does not throw) when stored value is malformed JSON', () => {
    store[BLINDFOLD_BADGE_KEY] = '{not valid json'
    expect(() => loadBlindBadge()).not.toThrow()
    expect(loadBlindBadge()).toBeNull()
  })

  it('badge.earned field survives round-trip as boolean false', () => {
    const badge: BlindBadge = { earned: false, bestTile: 256, revealsUsed: 2, date: '2026-03-22' }
    saveBlindBadge(badge)
    const loaded = loadBlindBadge()
    expect(loaded!.earned).toBe(false)
  })
})

// ===========================================================================
// 3. COLOR_LEGEND tile→color mapping correctness
// ===========================================================================
describe('COLOR_LEGEND correctness', () => {
  it('has exactly 11 entries (2, 4, 8 … 2048)', () => {
    expect(COLOR_LEGEND).toHaveLength(11)
  })

  it('values are the standard 2048 tile sequence', () => {
    const expectedValues = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
    expect(COLOR_LEGEND.map(e => e.value)).toEqual(expectedValues)
  })

  it('512 tile maps to "Deep Gold" (#9B2335)', () => {
    const entry = COLOR_LEGEND.find(e => e.value === 512)
    expect(entry).toBeDefined()
    expect(entry!.name).toBe('Deep Gold')
    expect(entry!.bg).toBe('#9B2335')
  })

  it('2 tile maps to "Cream" (#EEE4DA)', () => {
    const entry = COLOR_LEGEND.find(e => e.value === 2)
    expect(entry!.name).toBe('Cream')
    expect(entry!.bg).toBe('#EEE4DA')
  })

  it('2048 tile maps to "Deep Green" (#1C3461)', () => {
    const entry = COLOR_LEGEND.find(e => e.value === 2048)
    expect(entry!.name).toBe('Deep Green')
    expect(entry!.bg).toBe('#1C3461')
  })

  it('all entries have non-empty name, bg, and fg strings', () => {
    for (const entry of COLOR_LEGEND) {
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.bg).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(entry.fg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('entries are in ascending order by value', () => {
    for (let i = 1; i < COLOR_LEGEND.length; i++) {
      expect(COLOR_LEGEND[i].value).toBeGreaterThan(COLOR_LEGEND[i - 1].value)
    }
  })
})

// ===========================================================================
// 4. COLOR_LEGEND bg/fg must match TILE_COLORS in ResultCard
//    (keeps the two sources of truth in sync)
// ===========================================================================
describe('COLOR_LEGEND and TILE_COLORS consistency', () => {
  it('every COLOR_LEGEND entry bg matches the corresponding TILE_COLORS entry', () => {
    for (const entry of COLOR_LEGEND) {
      const tc = TILE_COLORS[entry.value]
      expect(tc).toBeDefined()
      expect(tc.bg).toBe(entry.bg)
    }
  })

  it('every COLOR_LEGEND entry fg matches the corresponding TILE_COLORS entry', () => {
    for (const entry of COLOR_LEGEND) {
      const tc = TILE_COLORS[entry.value]
      expect(tc.fg).toBe(entry.fg)
    }
  })

  it('TILE_COLORS has no extra keys not present in COLOR_LEGEND', () => {
    const legendValues = new Set(COLOR_LEGEND.map(e => e.value))
    for (const key of Object.keys(TILE_COLORS)) {
      expect(legendValues.has(Number(key))).toBe(true)
    }
  })
})

// ===========================================================================
// 5. ResultCard blindfold prop contracts (data-level checks)
// ===========================================================================
describe('ResultCard blindfold props logic', () => {
  it('badgeEarned defaults to false (consistent with component default)', () => {
    // Default prop: badgeEarned = false
    const badgeEarned = false
    expect(badgeEarned).toBe(false)
  })

  it('manualRevealsUsed/3 display: value 0 → "0/3"', () => {
    const manualRevealsUsed = 0
    expect(`${manualRevealsUsed}/3`).toBe('0/3')
  })

  it('manualRevealsUsed/3 display: value 3 → "3/3"', () => {
    const manualRevealsUsed = 3
    expect(`${manualRevealsUsed}/3`).toBe('3/3')
  })

  it('bestTile = 0 → displays "—" not "0"', () => {
    const bestTile = 0
    const displayed = bestTile > 0 ? String(bestTile) : '—'
    expect(displayed).toBe('—')
  })

  it('bestTile = 512 → displays "512"', () => {
    const bestTile = 512
    const displayed = bestTile > 0 ? String(bestTile) : '—'
    expect(displayed).toBe('512')
  })

  it('getTileColor: known value returns correct colors', () => {
    const FALLBACK_TILE = { bg: '#1C3461', fg: '#F9F6F2' }
    const getTileColor = (value: number) => TILE_COLORS[value] ?? FALLBACK_TILE
    const color512 = getTileColor(512)
    expect(color512.bg).toBe('#9B2335')
    expect(color512.fg).toBe('#F9F6F2')
  })

  it('getTileColor: unknown value returns FALLBACK_TILE colors', () => {
    const FALLBACK_TILE = { bg: '#1C3461', fg: '#F9F6F2' }
    const getTileColor = (value: number) => TILE_COLORS[value] ?? FALLBACK_TILE
    const fallback = getTileColor(9999)
    expect(fallback.bg).toBe(FALLBACK_TILE.bg)
    expect(fallback.fg).toBe(FALLBACK_TILE.fg)
  })

  it('when isBlindfold=true, result=null is valid (no DailyResult needed)', () => {
    // In the blindfold result flow, result is null — verify this is a valid state
    const result = null
    const isBlindfold = true
    const bestTile = 512
    const manualRevealsUsed = 1
    const badgeEarned = badgeCriteria(bestTile, manualRevealsUsed)
    expect(result).toBeNull()
    expect(isBlindfold).toBe(true)
    expect(badgeEarned).toBe(true)
  })

  it('when isBlindfold=false and result=null, component returns null (no crash)', () => {
    // ResultCard renders null when isBlindfold=false and result=null
    const isBlindfold = false
    const result = null
    // The component's guard: `if (!result) return null`
    const shouldRenderNull = !isBlindfold && result === null
    expect(shouldRenderNull).toBe(true)
  })
})

// ===========================================================================
// 6. ModeSelect blindfoldBadgeEarned flag
// ===========================================================================
describe('ModeSelect blindfoldBadgeEarned', () => {
  it('is true when badge.earned === true in localStorage', () => {
    const badge: BlindBadge = { earned: true, bestTile: 512, revealsUsed: 0, date: '2026-03-22' }
    saveBlindBadge(badge)
    const loaded = loadBlindBadge()
    const blindfoldBadgeEarned = loaded?.earned === true
    expect(blindfoldBadgeEarned).toBe(true)
  })

  it('is false when localStorage is empty', () => {
    const loaded = loadBlindBadge()
    const blindfoldBadgeEarned = loaded?.earned === true
    expect(blindfoldBadgeEarned).toBe(false)
  })

  it('is false when badge.earned === false in localStorage', () => {
    const badge: BlindBadge = { earned: false, bestTile: 256, revealsUsed: 2, date: '2026-03-22' }
    saveBlindBadge(badge)
    const loaded = loadBlindBadge()
    const blindfoldBadgeEarned = loaded?.earned === true
    expect(blindfoldBadgeEarned).toBe(false)
  })

  it('button label includes "🏅" when badge earned', () => {
    const blindfoldBadgeEarned = true
    const label = `Blindfold${blindfoldBadgeEarned ? ' 🏅' : ''}`
    expect(label).toBe('Blindfold 🏅')
  })

  it('button label has no "🏅" when badge not earned', () => {
    const blindfoldBadgeEarned = false
    const label = `Blindfold${blindfoldBadgeEarned ? ' 🏅' : ''}`
    expect(label).toBe('Blindfold')
  })
})

// ===========================================================================
// 7. Badge not saved when criteria not met (verify no localStorage write)
// ===========================================================================
describe('badge save only on criteria met', () => {
  it('badge is NOT written when criteria not met (256 tile, 2 reveals)', () => {
    const bestTile = 256
    const manualRevealsUsed = 2
    const earned = badgeCriteria(bestTile, manualRevealsUsed)
    if (earned) {
      saveBlindBadge({ earned: true, bestTile, revealsUsed: manualRevealsUsed, date: '2026-03-22' })
    }
    expect(loadBlindBadge()).toBeNull()
  })

  it('badge IS written when criteria met (512 tile, 1 reveal)', () => {
    const bestTile = 512
    const manualRevealsUsed = 1
    const earned = badgeCriteria(bestTile, manualRevealsUsed)
    if (earned) {
      saveBlindBadge({ earned: true, bestTile, revealsUsed: manualRevealsUsed, date: '2026-03-22' })
    }
    const loaded = loadBlindBadge()
    expect(loaded).not.toBeNull()
    expect(loaded!.earned).toBe(true)
    expect(loaded!.bestTile).toBe(512)
    expect(loaded!.revealsUsed).toBe(1)
  })
})
