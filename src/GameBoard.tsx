import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from './game/GameEngine'
import { Direction, GameStatus } from './game/types'
import type { GameState } from './game/types'

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

interface GameBoardProps {
  mode: 'classic' | 'daily'
  engine: GameEngine
  onBack: () => void
  onDailyGameOver?: (state: GameState) => void
}

export default function GameBoard({ mode, engine, onBack, onDailyGameOver }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>(() => engine.getState())
  // Track whether we've already fired the daily game-over callback
  const dailyOverFired = useRef(false)

  const syncState = useCallback(() => {
    const s = engine.getState()
    setGameState(s)
    if (
      mode === 'daily' &&
      s.status === GameStatus.GAME_OVER &&
      !dailyOverFired.current &&
      onDailyGameOver
    ) {
      dailyOverFired.current = true
      // Small delay to let the game-over overlay render first
      setTimeout(() => onDailyGameOver(s), 1200)
    }
  }, [engine, mode, onDailyGameOver])

  const handleMove = useCallback((dir: Direction) => {
    if (gameState.status !== GameStatus.PLAYING) return
    engine.move(dir)
    syncState()
  }, [gameState.status, engine, syncState])

  const handleNewGame = useCallback(() => {
    engine.newGame()
    dailyOverFired.current = false
    syncState()
  }, [engine, syncState])

  const handleUndo = useCallback(() => {
    engine.undo()
    syncState()
  }, [engine, syncState])

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

  // Touch swipe support
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

  return (
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
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>SCORE</span>
          <span style={styles.scoreValue}>{gameState.score.toLocaleString()}</span>
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
          return (
            <div
              key={`${i}-${value}`}
              role="gridcell"
              aria-label={`${value}`}
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
  )
}

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
    // CSS custom properties for tile sizing
    // @ts-expect-error -- custom CSS vars
    '--cell-size': `calc((${GRID_SIZE} - 5 * 10px) / 4)`,
    '--gap': '10px',
    // Lay out the 16 background cells in a grid
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
