import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from './game/GameEngine'
import { Direction, GameStatus } from './game/types'
import type { GameState } from './game/types'
import type { AudioEngine } from './utils/AudioEngine'
import Confetti from './Confetti'

// ---------------------------------------------------------------------------
// Tile color theme
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Milestone tiers
// ---------------------------------------------------------------------------
const MILESTONE_THRESHOLDS: Array<[number, 1 | 2 | 3 | 4 | 5]> = [
  [128, 1],
  [256, 2],
  [512, 3],
  [1024, 4],
  [2048, 5],
]
const MILESTONE_COLORS: Record<number, string> = {
  1: '#EDCF72',
  2: '#FFD700',
  3: '#FF8C00',
  4: '#DA70D6',
  5: '#7DF9FF',
}

function getMilestoneTier(
  prevBestTile: number,
  newBestTile: number,
): 1 | 2 | 3 | 4 | 5 | null {
  for (let i = MILESTONE_THRESHOLDS.length - 1; i >= 0; i--) {
    const [threshold, tier] = MILESTONE_THRESHOLDS[i]
    if (newBestTile >= threshold && prevBestTile < threshold) {
      return tier
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface GameBoardProps {
  mode: 'classic' | 'daily'
  engine: GameEngine
  audio: AudioEngine
  onBack: () => void
  onDailyGameOver?: (state: GameState) => void
}

// ---------------------------------------------------------------------------
// GameBoard component
// ---------------------------------------------------------------------------
export default function GameBoard({ mode, engine, audio, onBack, onDailyGameOver }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>(() => engine.getState())
  const dailyOverFired = useRef(false)

  // Animation state
  const [mergeAnimCells, setMergeAnimCells] = useState<Set<number>>(new Set())
  const [spawnAnimCell, setSpawnAnimCell] = useState<number | null>(null)
  const [boardShake, setBoardShake] = useState(false)
  const [milestoneFlash, setMilestoneFlash] = useState<{ tier: 1|2|3|4|5; key: number } | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Score pop state
  const [scoreDelta, setScoreDelta] = useState(0)
  const [scorePopKey, setScorePopKey] = useState(0)
  const [showScorePop, setShowScorePop] = useState(false)
  const scorePopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track previous bestTile to detect milestones
  const prevBestTile = useRef(gameState.bestTile)

  const syncState = useCallback((prevState: GameState) => {
    const s = engine.getState()
    setGameState(s)

    // Merge animation
    if (s.mergedCells.length > 0) {
      setMergeAnimCells(new Set(s.mergedCells))
      setTimeout(() => setMergeAnimCells(new Set()), 150)
    }

    // Spawn animation
    if (s.newTileIndex !== null) {
      setSpawnAnimCell(s.newTileIndex)
      setTimeout(() => setSpawnAnimCell(null), 100)
    }

    // Score pop
    const delta = s.score - prevState.score
    if (delta > 0) {
      if (scorePopTimer.current) clearTimeout(scorePopTimer.current)
      setScoreDelta(delta)
      setScorePopKey(k => k + 1)
      setShowScorePop(true)
      scorePopTimer.current = setTimeout(() => setShowScorePop(false), 600)
    }

    // Milestone detection
    const tier = getMilestoneTier(prevBestTile.current, s.bestTile)
    if (tier !== null) {
      setMilestoneFlash({ tier, key: Date.now() })
      setTimeout(() => setMilestoneFlash(null), 400)
      audio.playMilestone(tier)
    }
    prevBestTile.current = s.bestTile

    // Audio: merge
    if (s.mergedCells.length > 0) {
      audio.playMerge()
    } else if (s.newTileIndex !== null) {
      audio.playSlide()
    }

    // High score confetti + audio
    if (s.newHighScore) {
      audio.playHighScore()
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
    }

    // Game over
    if (s.status === GameStatus.GAME_OVER && prevState.status !== GameStatus.GAME_OVER) {
      setBoardShake(true)
      setTimeout(() => setBoardShake(false), 300)
      audio.playGameOver()
      if (mode === 'daily' && !dailyOverFired.current && onDailyGameOver) {
        dailyOverFired.current = true
        setTimeout(() => onDailyGameOver(s), 1200)
      }
    }

    return s
  }, [engine, audio, mode, onDailyGameOver])

  const handleMove = useCallback((dir: Direction) => {
    if (gameState.status !== GameStatus.PLAYING) return
    const prev = engine.getState()
    const moved = engine.move(dir)
    if (moved) syncState(prev)
  }, [gameState.status, engine, syncState])

  const handleNewGame = useCallback(() => {
    engine.newGame()
    dailyOverFired.current = false
    prevBestTile.current = 0
    setGameState(engine.getState())
    setMergeAnimCells(new Set())
    setSpawnAnimCell(null)
    setBoardShake(false)
    setMilestoneFlash(null)
    setShowConfetti(false)
  }, [engine])

  const handleUndo = useCallback(() => {
    engine.undo()
    setGameState(engine.getState())
    setMergeAnimCells(new Set())
    setSpawnAnimCell(null)
  }, [engine])

  // Keyboard listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handleMove(Direction.LEFT)
          break
        case 'ArrowRight':
          e.preventDefault()
          handleMove(Direction.RIGHT)
          break
        case 'ArrowUp':
          e.preventDefault()
          handleMove(Direction.UP)
          break
        case 'ArrowDown':
          e.preventDefault()
          handleMove(Direction.DOWN)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleMove])

  // Touch swipe support (20px threshold)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    if (Math.max(absDx, absDy) < 20) return
    if (absDx > absDy) {
      handleMove(dx > 0 ? Direction.RIGHT : Direction.LEFT)
    } else {
      handleMove(dy > 0 ? Direction.DOWN : Direction.UP)
    }
  }

  const modeLabel = mode === 'classic' ? 'Classic Mode' : 'Daily Challenge'

  const milestoneColor = milestoneFlash
    ? MILESTONE_COLORS[milestoneFlash.tier]
    : 'transparent'

  return (
    <>
      <style>{ANIMATION_CSS}</style>
      <Confetti active={showConfetti} />

      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backButton} onClick={onBack} aria-label="Back to menu">
            ← Back
          </button>
          <h1 style={styles.title}>2048 Daily</h1>
          <span style={styles.modeLabel}>{modeLabel}</span>
        </div>

        {/* HUD */}
        <div style={styles.hud}>
          <div
            style={{
              ...styles.scoreBox,
              ...(milestoneFlash
                ? {
                    '--milestone-color': milestoneColor,
                    animation: `milestone-flash 400ms ease-out`,
                  } as React.CSSProperties
                : {}),
            }}
            key={milestoneFlash?.key}
          >
            <span style={styles.scoreLabel}>SCORE</span>
            <div style={{ position: 'relative' }}>
              <span style={styles.scoreValue}>{gameState.score.toLocaleString()}</span>
              {showScorePop && (
                <span
                  key={scorePopKey}
                  className="score-pop"
                  style={styles.scorePop}
                >
                  +{scoreDelta.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div style={styles.scoreBox}>
            <span style={styles.scoreLabel}>BEST</span>
            <span style={styles.scoreValue}>{gameState.bestScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Action buttons — hide New Game in daily mode */}
        <div style={styles.actions}>
          {mode !== 'daily' && (
            <button style={styles.actionBtn} onClick={handleNewGame} aria-label="New game">
              New Game
            </button>
          )}
          <button
            style={{ ...styles.actionBtn, opacity: gameState.canUndo ? 1 : 0.4 }}
            onClick={handleUndo}
            disabled={!gameState.canUndo}
            aria-label="Undo last move"
          >
            Undo
          </button>
        </div>

        {/* Grid */}
        <div
          role="grid"
          aria-label="2048 game board"
          className={boardShake ? 'board-shake' : undefined}
          style={styles.gridWrapper}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Background cells */}
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={styles.cell} />
          ))}

          {/* Tiles */}
          {gameState.grid.map((value, i) => {
            if (value === 0) return null
            const row = Math.floor(i / 4)
            const col = i % 4
            const colors = getTileColor(value)
            const isMerge = mergeAnimCells.has(i)
            const isSpawn = spawnAnimCell === i
            return (
              <div
                key={`${i}-${value}`}
                role="gridcell"
                aria-label={`${value}`}
                className={isMerge ? 'tile-merge' : isSpawn ? 'tile-spawn' : undefined}
                style={{
                  ...styles.tile,
                  background: colors.bg,
                  color: colors.fg,
                  fontSize: getTileFontSize(value),
                  top: `calc(${row} * (var(--cell-size) + var(--gap)) + var(--gap))`,
                  left: `calc(${col} * (var(--cell-size) + var(--gap)) + var(--gap))`,
                }}
              >
                {value}
              </div>
            )
          })}

          {/* Game over overlay */}
          {gameState.status === GameStatus.GAME_OVER && (
            <div role="dialog" aria-label="Game over" style={styles.overlay}>
              <span style={styles.overlayTitle}>Game Over!</span>
              <span style={styles.overlayScore}>Score: {gameState.score.toLocaleString()}</span>
              {mode !== 'daily' && (
                <button style={styles.overlayBtn} onClick={handleNewGame}>
                  Play Again
                </button>
              )}
            </div>
          )}
        </div>

        <p style={styles.hint}>
          Moves: {gameState.moveCount}
          {gameState.bestTile > 0 && ` · Best tile: ${gameState.bestTile}`}
        </p>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// CSS animations
// ---------------------------------------------------------------------------
const ANIMATION_CSS = `
@keyframes tile-merge {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}

@keyframes tile-spawn {
  0%   { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes score-pop {
  0%   { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-24px); }
}

@keyframes board-shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-6px); }
  75%       { transform: translateX(6px); }
}

@keyframes milestone-flash {
  0%   { box-shadow: 0 0 0 4px transparent; }
  50%  { box-shadow: 0 0 0 8px var(--milestone-color, #FFD700); }
  100% { box-shadow: 0 0 0 4px transparent; }
}

.tile-merge {
  animation: tile-merge 120ms ease-in-out;
}

.tile-spawn {
  animation: tile-spawn 80ms ease-out;
}

.score-pop {
  animation: score-pop 600ms ease-out forwards;
}

.board-shake {
  animation: board-shake 300ms ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .tile-merge,
  .tile-spawn,
  .score-pop,
  .board-shake {
    animation: none !important;
    transition: none !important;
  }
}
`

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const GRID_SIZE = 'min(90vw, 420px)'

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    boxSizing: 'border-box',
    fontFamily: "'Nunito', 'Arial Rounded MT Bold', 'Arial', system-ui, sans-serif",
  },
  header: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  backButton: {
    background: 'transparent',
    border: '1px solid #444',
    color: '#aaa',
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
  },
  title: {
    color: '#FFD700',
    fontSize: '1.8rem',
    fontWeight: 700,
    margin: 0,
  },
  modeLabel: {
    color: '#b0b0c0',
    fontSize: '0.8rem',
    textAlign: 'right',
  },
  hud: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  scoreBox: {
    background: '#2c2c54',
    borderRadius: '8px',
    padding: '8px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '80px',
    position: 'relative',
  },
  scoreLabel: {
    color: '#8888aa',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  scoreValue: {
    color: '#FFD700',
    fontSize: '1.4rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  scorePop: {
    position: 'absolute',
    top: '-4px',
    right: '-8px',
    color: '#FFD700',
    fontSize: '0.9rem',
    fontWeight: 700,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  actionBtn: {
    background: '#8f7a66',
    color: '#f9f6f2',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 20px',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  gridWrapper: {
    position: 'relative',
    width: GRID_SIZE,
    height: GRID_SIZE,
    background: '#bbada0',
    borderRadius: '8px',
    // @ts-expect-error -- custom CSS vars
    '--cell-size': `calc((${GRID_SIZE} - 5 * 10px) / 4)`,
    '--gap': '10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    padding: '10px',
    boxSizing: 'border-box',
  },
  cell: {
    background: 'rgba(238, 228, 218, 0.35)',
    borderRadius: '4px',
  },
  tile: {
    position: 'absolute',
    width: 'var(--cell-size)',
    height: 'var(--cell-size)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    userSelect: 'none',
    transition: 'top 0.1s ease, left 0.1s ease',
    zIndex: 1,
  } as React.CSSProperties,
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(238,228,218,0.73)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    zIndex: 10,
  },
  overlayTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#776e65',
  },
  overlayScore: {
    fontSize: '1.2rem',
    color: '#776e65',
  },
  overlayBtn: {
    background: '#8f7a66',
    color: '#f9f6f2',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 28px',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  hint: {
    color: '#6b6b8a',
    fontSize: '0.85rem',
    marginTop: '12px',
  },
}
