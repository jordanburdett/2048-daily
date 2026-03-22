export const GameStatus = {
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
  WON: 'WON',
} as const
export type GameStatus = typeof GameStatus[keyof typeof GameStatus]

export const Direction = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
} as const
export type Direction = typeof Direction[keyof typeof Direction]

export interface GameState {
  grid: number[]
  score: number
  bestScore: number
  bestTile: number
  status: GameStatus
  canUndo: boolean
  moveCount: number
  isDaily: boolean
}
