import { useState } from 'react'
import { encodeGridHash, VALID_TILE_VALUES } from './utils/architectHash'

// ---------------------------------------------------------------------------
// Tile color palette — inlined per codebase convention (each file defines its
// own copy; the authoritative values live in GameBoard.tsx).
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

const EMPTY_CELL_BG = '#2a2a4a'

function getCellStyle(value: number): React.CSSProperties {
  if (value === 0) {
    return {
      background: EMPTY_CELL_BG,
      color: 'transparent',
    }
  }
  const colors = TILE_COLORS[value] ?? { bg: '#1C3461', fg: '#F9F6F2' }
  return {
    background: colors.bg,
    color: colors.fg,
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ArchitectBoardProps {
  onPlay: (hash: string) => void
  onBack: () => void
}

// ---------------------------------------------------------------------------
// ArchitectBoard component
// ---------------------------------------------------------------------------
export default function ArchitectBoard({ onPlay, onBack }: ArchitectBoardProps) {
  const [grid, setGrid] = useState<number[]>(Array(16).fill(0))
  const [copyFeedback, setCopyFeedback] = useState(false)

  const isEmpty = grid.every(v => v === 0)

  const cycleCell = (index: number) => {
    setGrid(prev => {
      const next = [...prev]
      const currentIdx = VALID_TILE_VALUES.indexOf(next[index])
      const nextIdx = (currentIdx + 1) % VALID_TILE_VALUES.length
      next[index] = VALID_TILE_VALUES[nextIdx]
      return next
    })
  }

  const handlePlay = () => {
    const hash = encodeGridHash(grid)
    onPlay(hash)
  }

  const handleShareLink = async () => {
    const hash = encodeGridHash(grid)
    const url = window.location.origin + window.location.pathname + '#' + hash
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard API unavailable — silently ignore
    }
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 1500)
  }

  return (
    <div style={styles.container}>
      {/* Back button */}
      <button
        style={styles.backButton}
        onClick={onBack}
        aria-label="Back to mode select"
      >
        ← Back
      </button>

      <h1 style={styles.title}>Architect Mode</h1>
      <p style={styles.subtitle}>
        {isEmpty ? 'Tap cells to add tiles' : 'Design a custom 2048 board'}
      </p>

      {/* 4×4 grid */}
      <div
        style={styles.grid}
        role="grid"
        aria-label="Custom board designer"
      >
        {grid.map((value, index) => (
          <button
            key={index}
            style={{ ...styles.cell, ...getCellStyle(value) }}
            onClick={() => cycleCell(index)}
            aria-label={value === 0 ? 'Empty cell, tap to set value' : `Cell value ${value}, tap to change`}
            role="gridcell"
          >
            {value !== 0 && (
              <span style={styles.cellText}>{value}</span>
            )}
          </button>
        ))}
      </div>

      <p style={styles.hint}>Tap a cell to cycle its value</p>

      {/* Action buttons */}
      <div style={styles.actionRow}>
        <button
          style={{ ...styles.playButton, ...(isEmpty ? styles.playButtonDisabled : {}) }}
          onClick={handlePlay}
          disabled={isEmpty}
          aria-label="Play with this custom board"
          aria-disabled={isEmpty}
        >
          Play
        </button>
        <button
          style={styles.shareButton}
          onClick={handleShareLink}
          aria-label="Copy shareable link to clipboard"
        >
          {copyFeedback ? 'Copied!' : 'Share Link'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const CELL_SIZE = 72

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Nunito', 'Arial Rounded MT Bold', 'Arial', system-ui, sans-serif",
    padding: '24px',
    boxSizing: 'border-box',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'transparent',
    color: '#8888aa',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  title: {
    color: '#FFD700',
    fontSize: '2.8rem',
    fontWeight: 700,
    margin: '0 0 8px',
    letterSpacing: '-1px',
  },
  subtitle: {
    color: '#b0b0c0',
    fontSize: '1.05rem',
    margin: '0 0 32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(4, ${CELL_SIZE}px)`,
    gridTemplateRows: `repeat(4, ${CELL_SIZE}px)`,
    gap: '8px',
    background: '#16213e',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  cell: {
    width: `${CELL_SIZE}px`,
    height: `${CELL_SIZE}px`,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: '1.2rem',
    transition: 'transform 0.08s ease, filter 0.08s ease',
  },
  cellText: {
    lineHeight: 1,
    userSelect: 'none',
  },
  hint: {
    color: '#6b6b8a',
    fontSize: '0.85rem',
    margin: '16px 0 24px',
  },
  actionRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  playButton: {
    background: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 40px',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: '140px',
  },
  playButtonDisabled: {
    background: '#4a5568',
    color: '#888',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  shareButton: {
    background: '#2980b9',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 40px',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: '140px',
    transition: 'background 0.15s',
  },
}
