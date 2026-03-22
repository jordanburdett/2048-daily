import { Direction, GameStatus } from './types'
import type { GameState } from './types'
import type { TileSpawn } from './DailyChallenge'

const CLASSIC_BEST_KEY = '2048-classic-best'
const CLASSIC_BEST_TILE_KEY = '2048-classic-best-tile'

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

export class GameEngine {
  private state: GameState
  private prevGrid: number[] | null = null
  private prevScore: number = 0
  private readonly spawnRandom: () => number
  private dailySequence: TileSpawn[] = []
  private dailyIndex: number = 0

  constructor(spawnRandom?: () => number) {
    this.spawnRandom = spawnRandom ?? Math.random
    this.state = this.createInitialState()
  }

  private createInitialState(): GameState {
    const bestScore = parseInt(safeGetItem(CLASSIC_BEST_KEY) ?? '0', 10) || 0
    const bestTile = parseInt(safeGetItem(CLASSIC_BEST_TILE_KEY) ?? '0', 10) || 0
    return {
      grid: new Array<number>(16).fill(0),
      score: 0,
      bestScore,
      bestTile,
      status: GameStatus.PLAYING,
      canUndo: false,
      moveCount: 0,
      isDaily: false,
    }
  }

  newGame(): void {
    const bestScore = parseInt(safeGetItem(CLASSIC_BEST_KEY) ?? '0', 10) || 0
    const bestTile = parseInt(safeGetItem(CLASSIC_BEST_TILE_KEY) ?? '0', 10) || 0
    this.prevGrid = null
    this.prevScore = 0
    this.state = {
      grid: new Array<number>(16).fill(0),
      score: 0,
      bestScore,
      bestTile,
      status: GameStatus.PLAYING,
      canUndo: false,
      moveCount: 0,
      isDaily: false,
    }
    this.spawnTile()
    this.spawnTile()
  }

  startDaily(sequence: TileSpawn[]): void {
    this.dailySequence = [...sequence]
    this.dailyIndex = 0
    const bestScore = parseInt(safeGetItem(CLASSIC_BEST_KEY) ?? '0', 10) || 0
    this.prevGrid = null
    this.prevScore = 0
    this.state = {
      grid: new Array<number>(16).fill(0),
      score: 0,
      bestScore,
      bestTile: 0,
      status: GameStatus.PLAYING,
      canUndo: false,
      moveCount: 0,
      isDaily: true,
    }
    this.spawnTile()
    this.spawnTile()
  }

  move(dir: Direction): boolean {
    if (this.state.status !== GameStatus.PLAYING) return false

    // Save state for undo
    const savedGrid = [...this.state.grid]
    const savedScore = this.state.score

    let changed = false
    let scoreGain = 0

    const grid = [...this.state.grid]

    if (dir === Direction.LEFT || dir === Direction.RIGHT) {
      for (let row = 0; row < 4; row++) {
        const rowData = grid.slice(row * 4, row * 4 + 4)
        const { result, score, moved } = processLine(rowData, dir === Direction.RIGHT)
        if (moved) changed = true
        scoreGain += score
        for (let col = 0; col < 4; col++) {
          grid[row * 4 + col] = result[col]
        }
      }
    } else {
      // UP or DOWN — process columns
      for (let col = 0; col < 4; col++) {
        const colData = [grid[col], grid[4 + col], grid[8 + col], grid[12 + col]]
        const { result, score, moved } = processLine(colData, dir === Direction.DOWN)
        if (moved) changed = true
        scoreGain += score
        for (let row = 0; row < 4; row++) {
          grid[row * 4 + col] = result[row]
        }
      }
    }

    if (!changed) return false

    // Commit undo checkpoint before updating state
    this.prevGrid = savedGrid
    this.prevScore = savedScore

    const newScore = this.state.score + scoreGain
    const newBestTile = Math.max(this.state.bestTile, ...grid)
    let newBestScore = this.state.bestScore

    if (newScore > this.state.bestScore) {
      newBestScore = newScore
      if (!this.state.isDaily) safeSetItem(CLASSIC_BEST_KEY, String(newBestScore))
    }
    if (newBestTile > this.state.bestTile) {
      if (!this.state.isDaily) safeSetItem(CLASSIC_BEST_TILE_KEY, String(newBestTile))
    }

    this.state = {
      ...this.state,
      grid,
      score: newScore,
      bestScore: newBestScore,
      bestTile: newBestTile,
      canUndo: true,
      moveCount: this.state.moveCount + 1,
    }

    this.spawnTile()

    const status = !this.canMove() ? GameStatus.GAME_OVER : GameStatus.PLAYING
    this.state = { ...this.state, status }

    return true
  }

  canMove(): boolean {
    const { grid } = this.state
    // Any empty cell?
    if (grid.some(v => v === 0)) return true
    // Any adjacent equal tiles?
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const v = grid[row * 4 + col]
        // Check right
        if (col < 3 && grid[row * 4 + col + 1] === v) return true
        // Check down
        if (row < 3 && grid[(row + 1) * 4 + col] === v) return true
      }
    }
    return false
  }

  getState(): GameState {
    return {
      ...this.state,
      grid: [...this.state.grid],
    }
  }

  undo(): void {
    if (this.prevGrid === null) return
    this.state = {
      ...this.state,
      grid: [...this.prevGrid],
      score: this.prevScore,
      canUndo: false,
      status: GameStatus.PLAYING,
    }
    this.prevGrid = null
  }

  private spawnTile(): void {
    const { grid } = this.state
    const emptyCells: number[] = []
    for (let i = 0; i < 16; i++) {
      if (grid[i] === 0) emptyCells.push(i)
    }
    if (emptyCells.length === 0) return

    let cellIndex: number
    let value: number

    if (this.state.isDaily && this.dailyIndex < this.dailySequence.length) {
      const spawn = this.dailySequence[this.dailyIndex++]
      value = spawn.value
      cellIndex = emptyCells[Math.floor(spawn.flatIndex * emptyCells.length)]
    } else {
      const r1 = this.spawnRandom()
      cellIndex = emptyCells[Math.floor(r1 * emptyCells.length)]
      const r2 = this.spawnRandom()
      value = r2 < 0.9 ? 2 : 4
    }

    const newGrid = [...grid]
    newGrid[cellIndex] = value
    this.state = { ...this.state, grid: newGrid }
  }
}

/**
 * Process a single line (row or column) in the given direction.
 * reverse=true means process right-to-left (for RIGHT and DOWN directions).
 */
function processLine(
  line: number[],
  reverse: boolean,
): { result: number[]; score: number; moved: boolean } {
  const original = [...line]
  let arr = reverse ? [...line].reverse() : [...line]

  // Compact: remove zeros, push to left
  arr = compact(arr)

  // Merge adjacent equal pairs
  let score = 0
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] !== 0 && arr[i] === arr[i + 1]) {
      arr[i] *= 2
      score += arr[i]
      arr[i + 1] = 0
      i++ // skip next — can't chain merge
    }
  }

  // Compact again after merge
  arr = compact(arr)

  // Pad to 4
  while (arr.length < 4) arr.push(0)

  const result = reverse ? arr.reverse() : arr
  const moved = result.some((v, i) => v !== original[i])
  return { result, score, moved }
}

function compact(arr: number[]): number[] {
  return arr.filter(v => v !== 0)
}
