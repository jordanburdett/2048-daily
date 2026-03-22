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
      mergedCells: [],
      newTileIndex: null,
      newHighScore: false,
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
      mergedCells: [],
      newTileIndex: null,
      newHighScore: false,
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
      mergedCells: [],
      newTileIndex: null,
      newHighScore: false,
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
    const mergedCells: number[] = []

    const grid = [...this.state.grid]

    if (dir === Direction.LEFT || dir === Direction.RIGHT) {
      for (let row = 0; row < 4; row++) {
        const rowData = grid.slice(row * 4, row * 4 + 4)
        const { result, score, moved, mergedIndices } = processLine(rowData, dir === Direction.RIGHT)
        if (moved) changed = true
        scoreGain += score
        for (let col = 0; col < 4; col++) {
          grid[row * 4 + col] = result[col]
        }
        for (const localIdx of mergedIndices) {
          mergedCells.push(row * 4 + localIdx)
        }
      }
    } else {
      // UP or DOWN — process columns
      for (let col = 0; col < 4; col++) {
        const colData = [grid[col], grid[4 + col], grid[8 + col], grid[12 + col]]
        const { result, score, moved, mergedIndices } = processLine(colData, dir === Direction.DOWN)
        if (moved) changed = true
        scoreGain += score
        for (let row = 0; row < 4; row++) {
          grid[row * 4 + col] = result[row]
        }
        for (const localIdx of mergedIndices) {
          mergedCells.push(localIdx * 4 + col)
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
    let newHighScore = false

    if (newScore > this.state.bestScore) {
      newBestScore = newScore
      if (!this.state.isDaily) {
        safeSetItem(CLASSIC_BEST_KEY, String(newBestScore))
        newHighScore = true
      }
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
      mergedCells,
      newTileIndex: null,
      newHighScore,
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
      mergedCells: [...this.state.mergedCells],
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
      mergedCells: [],
      newTileIndex: null,
      newHighScore: false,
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
    this.state = { ...this.state, grid: newGrid, newTileIndex: cellIndex }
  }
}

/**
 * Process a single line (row or column) in the given direction.
 * reverse=true means process right-to-left (for RIGHT and DOWN directions).
 * Returns mergedIndices: flat indices (in the result array) of cells that
 * received a merged value this move.
 */
function processLine(
  line: number[],
  reverse: boolean,
): { result: number[]; score: number; moved: boolean; mergedIndices: number[] } {
  const original = [...line]
  let arr = reverse ? [...line].reverse() : [...line]

  // Compact: remove zeros, push to left
  arr = compact(arr)

  // Merge adjacent equal pairs; track which (compacted) positions had merges
  let score = 0
  const mergedCompacted: number[] = []
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] !== 0 && arr[i] === arr[i + 1]) {
      arr[i] *= 2
      score += arr[i]
      arr[i + 1] = 0
      mergedCompacted.push(i)
      i++ // skip next — can't chain merge
    }
  }

  // Compact again after merge
  arr = compact(arr)

  // Pad to 4
  while (arr.length < 4) arr.push(0)

  const result = reverse ? arr.reverse() : arr
  const moved = result.some((v, i) => v !== original[i])

  // Map compacted merge indices back to result indices.
  // After second compact + pad, the merged tile is at position compactIdx in
  // the left-packed array (length 4). When reversed, position compactIdx
  // becomes (3 - compactIdx) in the final result.
  const mergedInResult: number[] = mergedCompacted.map(compactIdx => {
    if (reverse) return 3 - compactIdx
    return compactIdx
  })

  return { result, score, moved, mergedIndices: mergedInResult }
}

function compact(arr: number[]): number[] {
  return arr.filter(v => v !== 0)
}
