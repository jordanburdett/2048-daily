/**
 * Tests for 2048-003: Polish — mergedCells, newTileIndex, newHighScore tracking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameEngine } from '../GameEngine'
import { Direction } from '../types'

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
})

// AudioContext does not exist in jsdom — stub it so any accidental import
// of AudioEngine during tests doesn't throw.
vi.stubGlobal('AudioContext', class {
  createOscillator() { return { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
  createGain() { return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
  createBiquadFilter() { return { type: '', frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
  createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
  createBuffer() { return { getChannelData: () => new Float32Array(0) } }
  get currentTime() { return 0 }
  get destination() { return {} }
  get sampleRate() { return 44100 }
})

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key]
  }
})

/**
 * Helper: build engine with a forced grid, bypassing newGame() spawn.
 * Uses a seeded random that always returns 0 (picks first empty cell, value=2).
 */
function makeEngineWithGrid(grid: number[]): GameEngine {
  let call = 0
  const seeded = () => {
    call++
    return call % 2 === 0 ? 0.5 : 0.0
  }
  const engine = new GameEngine(seeded)
  engine.newGame()
  // Force-set the grid via backdoor
  ;(engine as unknown as { state: { grid: number[] } }).state.grid = [...grid]
  return engine
}

// ---------------------------------------------------------------------------
// 1. mergedCells populated after a merge
// ---------------------------------------------------------------------------
describe('mergedCells', () => {
  it('populated with correct flat index after a merge', () => {
    // Row 0: [2, 2, 0, 0] → merge at index 0 after LEFT move
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 2
    const engine = makeEngineWithGrid(grid)
    engine.move(Direction.LEFT)
    const state = engine.getState()
    expect(state.mergedCells).toContain(0)
    expect(state.mergedCells.length).toBeGreaterThanOrEqual(1)
  })

  it('is empty after a move with no merges', () => {
    // Row 0: [2, 4, 0, 0] → slide left, no merge
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 4
    const engine = makeEngineWithGrid(grid)
    engine.move(Direction.LEFT)
    const state = engine.getState()
    expect(state.mergedCells).toEqual([])
  })

  it('two merges in same move yields exactly 2 entries in mergedCells', () => {
    // Row 0: [2, 2, 0, 0], Row 1: [4, 4, 0, 0] → two merges
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 2
    grid[4] = 4; grid[5] = 4
    const engine = makeEngineWithGrid(grid)
    engine.move(Direction.LEFT)
    const state = engine.getState()
    expect(state.mergedCells).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// 2. newTileIndex populated after a valid move
// ---------------------------------------------------------------------------
describe('newTileIndex', () => {
  it('populated after a valid move', () => {
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 4
    const engine = makeEngineWithGrid(grid)
    engine.move(Direction.LEFT)
    const state = engine.getState()
    // A tile should have been spawned somewhere
    expect(state.newTileIndex).not.toBeNull()
    expect(state.newTileIndex).toBeGreaterThanOrEqual(0)
    expect(state.newTileIndex).toBeLessThan(16)
  })

  it('is null when move does not change the board', () => {
    // Row 0 fully packed, no moves possible in LEFT direction
    // [2, 4, 8, 16] — already left-packed, no merges
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 4; grid[2] = 8; grid[3] = 16
    const engine = makeEngineWithGrid(grid)
    // Also clear newTileIndex left over from the newGame() spawn
    ;(engine as unknown as { state: { newTileIndex: null } }).state.newTileIndex = null
    const moved = engine.move(Direction.LEFT)
    expect(moved).toBe(false)
    const state = engine.getState()
    // After a no-op move, newTileIndex stays null (no spawn happened)
    expect(state.newTileIndex).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 3. newHighScore tracking
// ---------------------------------------------------------------------------
describe('newHighScore', () => {
  it('is true for one move when new classic high score achieved', () => {
    store['2048-classic-best'] = '0'
    // Merge 512+512=1024 → score=1024, beats best=0
    const grid = new Array<number>(16).fill(0)
    grid[0] = 512; grid[1] = 512
    const engine = makeEngineWithGrid(grid)
    engine.move(Direction.LEFT)
    const state = engine.getState()
    expect(state.newHighScore).toBe(true)
  })

  it('is false in daily mode even if score would beat classic best', () => {
    store['2048-classic-best'] = '0'
    // Use daily mode
    const engine = new GameEngine()
    engine.startDaily([
      { value: 2, flatIndex: 0 },
      { value: 2, flatIndex: 0.5 },
    ])
    // Force a grid with two equal tiles
    const stateRef = (engine as unknown as { state: { grid: number[]; isDaily: boolean } }).state
    stateRef.grid = new Array<number>(16).fill(0)
    stateRef.grid[0] = 512
    stateRef.grid[1] = 512
    engine.move(Direction.LEFT)
    const state = engine.getState()
    expect(state.newHighScore).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4. getState() returns copies
// ---------------------------------------------------------------------------
describe('getState() immutability', () => {
  it('mutating returned mergedCells does not affect engine', () => {
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 2
    const engine = makeEngineWithGrid(grid)
    engine.move(Direction.LEFT)
    const state1 = engine.getState()
    state1.mergedCells.push(99)
    const state2 = engine.getState()
    expect(state2.mergedCells).not.toContain(99)
  })
})

// ---------------------------------------------------------------------------
// 5. Undo clears mergedCells and newTileIndex
// ---------------------------------------------------------------------------
describe('undo clears animation state', () => {
  it('clears mergedCells and newTileIndex after undo', () => {
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 2
    const engine = makeEngineWithGrid(grid)
    engine.move(Direction.LEFT)
    // Verify they are set after move
    const stateAfterMove = engine.getState()
    expect(stateAfterMove.mergedCells.length).toBeGreaterThan(0)
    expect(stateAfterMove.newTileIndex).not.toBeNull()
    // Undo
    engine.undo()
    const stateAfterUndo = engine.getState()
    expect(stateAfterUndo.mergedCells).toEqual([])
    expect(stateAfterUndo.newTileIndex).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 6. getState() always returns mergedCells as an array (never undefined)
// ---------------------------------------------------------------------------
describe('mergedCells invariant', () => {
  it('getState() always has mergedCells as a non-undefined array on fresh engine', () => {
    const engine = new GameEngine()
    const state = engine.getState()
    expect(Array.isArray(state.mergedCells)).toBe(true)
  })

  it('getState() always has mergedCells as a non-undefined array after newGame()', () => {
    const engine = new GameEngine()
    engine.newGame()
    const state = engine.getState()
    expect(Array.isArray(state.mergedCells)).toBe(true)
    expect(state.mergedCells).toEqual([])
  })
})
