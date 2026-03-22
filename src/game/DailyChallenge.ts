import { mulberry32 } from '../utils/prng'

export function getDailySeed(): number {
  const now = new Date()
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}

export function getDailyStorageKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `2048-daily-${year}-${month}-${day}`
}

export function getChallengeNumber(): number {
  const epoch = new Date(2026, 2, 22) // March 22, 2026 = Day 1 (local date)
  const now = new Date()
  // Zero out time components to compare pure dates
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const epochMs = epoch.getTime()
  const diffDays = Math.floor((todayMs - epochMs) / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays + 1)
}

export interface TileSpawn {
  value: 2 | 4
  flatIndex: number // raw 0..1 float, mapped to actual cell at spawn time
}

export function generateTileSequence(seed: number, count: number): TileSpawn[] {
  const rand = mulberry32(seed)
  const sequence: TileSpawn[] = []
  for (let i = 0; i < count; i++) {
    const r1 = rand()
    const value: 2 | 4 = r1 < 0.9 ? 2 : 4
    const flatIndex = rand()
    sequence.push({ value, flatIndex })
  }
  return sequence
}

export interface DailyResult {
  played: boolean
  attemptStarted?: boolean
  score: number
  bestTile: number
  challengeNumber: number
  emojiCard: string
}

export function loadDailyResult(): DailyResult | null {
  try {
    const key = getDailyStorageKey()
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const obj = JSON.parse(raw) as unknown
    if (typeof obj !== 'object' || obj === null) return null
    const r = obj as Record<string, unknown>
    if (
      typeof r['played'] !== 'boolean' ||
      typeof r['score'] !== 'number' ||
      typeof r['bestTile'] !== 'number' ||
      typeof r['challengeNumber'] !== 'number' ||
      typeof r['emojiCard'] !== 'string'
    ) {
      return null
    }
    return {
      played: r['played'] as boolean,
      attemptStarted: typeof r['attemptStarted'] === 'boolean' ? r['attemptStarted'] : undefined,
      score: r['score'] as number,
      bestTile: r['bestTile'] as number,
      challengeNumber: r['challengeNumber'] as number,
      emojiCard: r['emojiCard'] as string,
    }
  } catch {
    return null
  }
}

export function saveDailyResult(result: DailyResult): void {
  try {
    const key = getDailyStorageKey()
    localStorage.setItem(key, JSON.stringify(result))
  } catch {
    // ignore
  }
}

export function buildEmojiCard(bestTile: number): string {
  const milestones: Array<[number, string]> = [
    [128, '🥉'],
    [256, '🥈'],
    [512, '🥇'],
    [1024, '💎'],
    [2048, '👑'],
  ]
  return milestones
    .filter(([threshold]) => bestTile >= threshold)
    .map(([, emoji]) => emoji)
    .join('')
}

export function buildShareText(
  challengeNumber: number,
  score: number,
  bestTile: number,
  emojiCard: string,
): string {
  return `2048 Daily #${challengeNumber}\n${emojiCard}\nBest tile: ${bestTile} | Score: ${score}\nactuallyfun.games`
}
