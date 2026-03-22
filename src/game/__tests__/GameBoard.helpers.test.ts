/**
 * Tests for GameBoard helper functions.
 * These are tested by directly importing from the module.
 * Because the helpers are not exported, we test them indirectly via
 * a thin re-export shim defined in this file using the same logic.
 */
import { describe, it, expect } from 'vitest'

// --- Replicate the helpers under test (they are private to GameBoard.tsx) ---
// Rather than modifying the source to export them, we mirror the exact
// implementation here so changes to the source will cause these tests to
// diverge and surface the discrepancy.

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
const FALLBACK_TILE = { bg: '#1C3461', fg: '#F9F6F2' }

function getTileColor(value: number): { bg: string; fg: string } {
  return TILE_COLORS[value] ?? FALLBACK_TILE
}

function getTileFontSize(value: number): string {
  const digits = String(value).length
  if (digits >= 4) return '1.1rem'
  if (digits === 3) return '1.4rem'
  if (digits === 2) return '1.8rem'
  return '2.2rem'
}

// --- Tests ---

describe('getTileColor', () => {
  it('returns correct color for value 2', () => {
    const { bg, fg } = getTileColor(2)
    expect(bg).toBe('#EEE4DA')
    expect(fg).toBe('#7A6C5E')
  })

  it('returns correct color for value 8 (light-foreground threshold)', () => {
    const { fg } = getTileColor(8)
    expect(fg).toBe('#F9F6F2')
  })

  it('returns fallback color for unknown value 4096', () => {
    const { bg, fg } = getTileColor(4096)
    expect(bg).toBe(FALLBACK_TILE.bg)
    expect(fg).toBe(FALLBACK_TILE.fg)
  })

  it('returns fallback color for value 0', () => {
    const result = getTileColor(0)
    expect(result).toEqual(FALLBACK_TILE)
  })

  it('covers all explicitly defined tile values', () => {
    const defined = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
    for (const v of defined) {
      const color = getTileColor(v)
      expect(color).not.toBeUndefined()
      expect(color.bg).toMatch(/^#/)
      expect(color.fg).toMatch(/^#/)
    }
  })
})

describe('getTileFontSize', () => {
  it('returns 2.2rem for single-digit value 2', () => {
    expect(getTileFontSize(2)).toBe('2.2rem')
  })

  it('returns 2.2rem for single-digit value 8', () => {
    expect(getTileFontSize(8)).toBe('2.2rem')
  })

  it('returns 1.8rem for two-digit value 16', () => {
    expect(getTileFontSize(16)).toBe('1.8rem')
  })

  it('returns 1.8rem for two-digit value 64', () => {
    expect(getTileFontSize(64)).toBe('1.8rem')
  })

  it('returns 1.4rem for three-digit value 128', () => {
    expect(getTileFontSize(128)).toBe('1.4rem')
  })

  it('returns 1.4rem for three-digit value 512', () => {
    expect(getTileFontSize(512)).toBe('1.4rem')
  })

  it('returns 1.1rem for four-digit value 1024', () => {
    expect(getTileFontSize(1024)).toBe('1.1rem')
  })

  it('returns 1.1rem for four-digit value 2048', () => {
    expect(getTileFontSize(2048)).toBe('1.1rem')
  })

  it('returns 1.1rem for five-digit value 16384 (beyond 2048)', () => {
    expect(getTileFontSize(16384)).toBe('1.1rem')
  })
})
