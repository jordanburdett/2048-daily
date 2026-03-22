import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDailySeed,
  getDailyStorageKey,
  getChallengeNumber,
  generateTileSequence,
  buildEmojiCard,
  buildShareText,
  saveDailyResult,
  loadDailyResult,
} from '../DailyChallenge'
import type { DailyResult } from '../DailyChallenge'

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
})

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key]
  }
})

describe('DailyChallenge', () => {
  it('getDailySeed() returns correct YYYYMMDD integer', () => {
    const seed = getDailySeed()
    const now = new Date()
    const expected =
      now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
    expect(seed).toBe(expected)
    // Sanity: should be an 8-digit number for dates in 2026
    expect(seed).toBeGreaterThan(20000000)
    expect(seed).toBeLessThan(99999999)
  })

  it('generateTileSequence() same seed always produces identical array', () => {
    const seed = 20260322
    const seq1 = generateTileSequence(seed, 50)
    const seq2 = generateTileSequence(seed, 50)
    expect(seq1).toHaveLength(50)
    expect(seq2).toHaveLength(50)
    for (let i = 0; i < 50; i++) {
      expect(seq1[i].value).toBe(seq2[i].value)
      expect(seq1[i].flatIndex).toBeCloseTo(seq2[i].flatIndex, 10)
    }
  })

  it('generateTileSequence() different seeds produce different arrays', () => {
    const seq1 = generateTileSequence(20260322, 50)
    const seq2 = generateTileSequence(20260323, 50)
    // At least one element must differ
    const hasAnyDiff = seq1.some(
      (s, i) => s.value !== seq2[i].value || s.flatIndex !== seq2[i].flatIndex
    )
    expect(hasAnyDiff).toBe(true)
  })

  it('all tile values are 2 or 4', () => {
    const seq = generateTileSequence(20260322, 200)
    for (const tile of seq) {
      expect([2, 4]).toContain(tile.value)
    }
  })

  it('approximately 90% of tiles are value 2 (test with 500 tiles)', () => {
    const seq = generateTileSequence(20260322, 500)
    const twoCount = seq.filter(t => t.value === 2).length
    // Should be between 400 and 490 (80%-98% range)
    expect(twoCount).toBeGreaterThanOrEqual(400)
    expect(twoCount).toBeLessThanOrEqual(490)
  })

  it("getDailyStorageKey() returns '2048-daily-YYYY-MM-DD' with correct date", () => {
    const key = getDailyStorageKey()
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    expect(key).toBe(`2048-daily-${year}-${month}-${day}`)
  })

  it("getChallengeNumber() returns >= 1 for today's date", () => {
    const num = getChallengeNumber()
    expect(num).toBeGreaterThanOrEqual(1)
  })

  it("buildEmojiCard(512) returns '🥉🥈🥇' (three milestones up to 512)", () => {
    const card = buildEmojiCard(512)
    expect(card).toBe('🥉🥈🥇')
  })

  it('buildShareText() contains challenge number, actuallyfun.games, and the emoji card', () => {
    const card = '🥉🥈🥇'
    const text = buildShareText(7, 1234, 512, card)
    expect(text).toContain('7')
    expect(text).toContain('actuallyfun.games')
    expect(text).toContain(card)
  })

  it('saveDailyResult / loadDailyResult round-trip: save, load, compare fields', () => {
    const result: DailyResult = {
      played: true,
      attemptStarted: true,
      score: 4096,
      bestTile: 512,
      challengeNumber: 3,
      emojiCard: '🥉🥈🥇',
    }
    saveDailyResult(result)
    const loaded = loadDailyResult()
    expect(loaded).not.toBeNull()
    expect(loaded!.played).toBe(true)
    expect(loaded!.attemptStarted).toBe(true)
    expect(loaded!.score).toBe(4096)
    expect(loaded!.bestTile).toBe(512)
    expect(loaded!.challengeNumber).toBe(3)
    expect(loaded!.emojiCard).toBe('🥉🥈🥇')
  })
})
