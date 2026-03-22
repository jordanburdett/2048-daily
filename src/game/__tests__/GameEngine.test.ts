import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameEngine } from '../GameEngine'
import { Direction } from '../types'

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
})

function makeEngine(grid?: number[]): GameEngine {
  let call = 0
  // Deterministic: first calls return 0 (pick first empty cell, value=2)
  const seeded = () => {
    call++
    return call % 2 === 0 ? 0.5 : 0.0
  }
  const engine = new GameEngine(seeded)
  engine.newGame()
  if (grid !== undefined) {
    // Force-set the grid via internal state (test backdoor)
    ;(engine as unknown as { state: { grid: number[] } }).state.grid = [...grid]
  }
  return engine
}

beforeEach(() => {
  // Clear localStorage mock between tests
  for (const key of Object.keys(store)) {
    delete store[key]
  }
})

describe('GameEngine', () => {
  it('newGame() creates a grid with exactly 2 non-zero tiles', () => {
    const engine = makeEngine()
    const state = engine.getState()
    const nonZero = state.grid.filter(v => v !== 0)
    expect(nonZero).toHaveLength(2)
  })

  it('all initial tiles are 2 or 4', () => {
    const engine = makeEngine()
    const state = engine.getState()
    const nonZero = state.grid.filter(v => v !== 0)
    for (const v of nonZero) {
      expect([2, 4]).toContain(v)
    }
  })

  it('move(LEFT) slides tiles: [2,0,0,2,...] becomes [4,0,0,0,...] + one spawned tile', () => {
    // Set row 0 = [2,0,0,2], rows 1-3 = zeros
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[3] = 2
    const engine = makeEngine(grid)
    engine.move(Direction.LEFT)
    const state = engine.getState()
    // Row 0 position 0 must be 4 (merged)
    expect(state.grid[0]).toBe(4)
    // The rest of row 0 (indices 1-3) should be 0 except possibly one spawned tile
    const row0Rest = [state.grid[1], state.grid[2], state.grid[3]]
    const nonZeroInRest = row0Rest.filter(v => v !== 0)
    // Either no spawn in this row, or one spawn (2 or 4)
    expect(nonZeroInRest.length).toBeLessThanOrEqual(1)
    if (nonZeroInRest.length === 1) {
      expect([2, 4]).toContain(nonZeroInRest[0])
    }
    // Total non-zero tiles should be 2 (merged 4 + spawned)
    const nonZero = state.grid.filter(v => v !== 0)
    expect(nonZero).toHaveLength(2)
  })

  it('move(LEFT) does not double-merge: [2,2,4,0] becomes [4,4,0, + spawn]', () => {
    // Row 0 = [2,2,4,0], rest zeros
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 2; grid[2] = 4
    const engine = makeEngine(grid)
    engine.move(Direction.LEFT)
    const state = engine.getState()
    // First two 2s merge to 4; 4 stays as 4; result row: [4,4,0,0] + one spawned tile somewhere
    expect(state.grid[0]).toBe(4)
    expect(state.grid[1]).toBe(4)
    // Cells 2 and 3 are either 0 or have the spawned tile
    expect(state.grid[0] + state.grid[1]).toBe(8)
  })

  it('move(LEFT) returns false if no tiles move', () => {
    // Row 0 = [2,4,8,16] — already compacted, no merges possible
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 4; grid[2] = 8; grid[3] = 16
    const engine = makeEngine(grid)
    const moved = engine.move(Direction.LEFT)
    expect(moved).toBe(false)
  })

  it('score increments by merged tile value', () => {
    // Row 0 = [4,4,0,0] — merge two 4s → score += 8
    const grid = new Array<number>(16).fill(0)
    grid[0] = 4; grid[1] = 4
    const engine = makeEngine(grid)
    engine.move(Direction.LEFT)
    const state = engine.getState()
    expect(state.score).toBe(8)
  })

  it('canMove() returns false when grid full and no adjacent equal tiles', () => {
    // Fill with alternating values that cannot merge in any direction
    // Pattern: 2 4 2 4 / 8 2 8 2 / 2 8 2 8 / 4 2 4 2 — no adjacent equals
    const grid = [
      2, 4, 2, 4,
      8, 2, 8, 2,
      2, 8, 2, 8,
      4, 2, 4, 2,
    ]
    const engine = makeEngine(grid)
    expect(engine.canMove()).toBe(false)
  })

  it('canMove() returns true when empty cell exists', () => {
    // Grid with one empty cell
    const grid = new Array<number>(16).fill(2)
    grid[5] = 0
    const engine = makeEngine(grid)
    expect(engine.canMove()).toBe(true)
  })

  it('getState() returns a copy — mutating returned grid does not affect engine', () => {
    const engine = makeEngine()
    const state1 = engine.getState()
    state1.grid[0] = 9999
    const state2 = engine.getState()
    expect(state2.grid[0]).not.toBe(9999)
  })

  it('spawned tile is 2 (90%) or 4 (10%) across 100 spawns', () => {
    // Use real Math.random for distribution test
    const engine = new GameEngine(Math.random)
    let twoCount = 0
    let fourCount = 0

    for (let i = 0; i < 100; i++) {
      engine.newGame()
      const tiles = engine.getState().grid.filter(v => v !== 0)
      for (const t of tiles) {
        if (t === 2) twoCount++
        else if (t === 4) fourCount++
      }
    }

    const total = twoCount + fourCount
    const twoRatio = twoCount / total
    // Expect approximately 90% 2s — allow range 80-98% for random variance
    expect(twoRatio).toBeGreaterThan(0.80)
    expect(twoRatio).toBeLessThan(0.98)
  })

  it('undo restores previous grid and score', () => {
    const grid = new Array<number>(16).fill(0)
    grid[0] = 2; grid[1] = 2
    const engine = makeEngine(grid)
    const stateBefore = engine.getState()
    engine.move(Direction.LEFT)
    const stateAfter = engine.getState()
    expect(stateAfter.score).toBeGreaterThan(0)
    engine.undo()
    const stateRestored = engine.getState()
    expect(stateRestored.grid[0]).toBe(stateBefore.grid[0])
    expect(stateRestored.score).toBe(stateBefore.score)
    expect(stateRestored.canUndo).toBe(false)
  })

  it('new high score written to localStorage when score exceeds previous best', () => {
    const setItemSpy = vi.fn((k: string, v: string) => { store[k] = v })
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: setItemSpy,
    })

    // Manually set best score low
    store['2048-classic-best'] = '0'

    // Set up a grid where a big merge will happen
    const grid = new Array<number>(16).fill(0)
    grid[0] = 1024; grid[1] = 1024  // merge → 2048, score = 2048
    const engine = makeEngine(grid)
    engine.move(Direction.LEFT)

    expect(setItemSpy).toHaveBeenCalledWith('2048-classic-best', '2048')
  })
})
