import { useState, useEffect } from 'react'
import type { DailyResult } from './game/DailyChallenge'
import { buildShareText } from './game/DailyChallenge'

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

interface ResultCardProps {
  result: DailyResult
  onPlayClassic: () => void
}

export default function ResultCard({ result, onPlayClassic }: ResultCardProps) {
  const emojis = result.emojiCard ? [...result.emojiCard] : []
  const [revealedCount, setRevealedCount] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState(false)

  useEffect(() => {
    if (emojis.length === 0) return
    // Start revealing after 400ms initial delay, then 250ms between each
    let current = 0
    const reveal = () => {
      current++
      setRevealedCount(current)
      if (current < emojis.length) {
        setTimeout(reveal, 250)
      }
    }
    const initialTimer = setTimeout(reveal, 400)
    return () => {
      clearTimeout(initialTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.emojiCard])

  const handleShare = async () => {
    const text = buildShareText(
      result.challengeNumber,
      result.score,
      result.bestTile,
      result.emojiCard,
    )
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for environments without clipboard API
    }
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const tileColors = result.bestTile > 0 ? getTileColor(result.bestTile) : FALLBACK_TILE

  return (
    <div style={styles.page} role="dialog" aria-label="Daily challenge result">
      <div style={styles.card}>
        <h1 style={styles.title}>2048 Daily</h1>
        <p style={styles.challengeNum}>#{result.challengeNumber}</p>

        {emojis.length > 0 ? (
          <div style={styles.emojiRow} aria-label="Achievement badges">
            {emojis.map((emoji, i) => (
              <span
                key={i}
                style={{
                  ...styles.emoji,
                  opacity: i < revealedCount ? 1 : 0,
                  transform: i < revealedCount ? 'scale(1)' : 'scale(0.5)',
                }}
                aria-hidden={i >= revealedCount}
              >
                {emoji}
              </span>
            ))}
          </div>
        ) : (
          <div style={styles.emojiRow}>
            <span style={styles.noEmojiText}>Keep trying!</span>
          </div>
        )}

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Best tile</span>
            <span
              style={{
                ...styles.statValue,
                background: tileColors.bg,
                color: tileColors.fg,
                borderRadius: '6px',
                padding: '4px 14px',
              }}
            >
              {result.bestTile > 0 ? result.bestTile : '—'}
            </span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Score</span>
            <span style={styles.statValue}>{result.score.toLocaleString()}</span>
          </div>
        </div>

        <button
          style={styles.shareButton}
          onClick={handleShare}
          aria-label="Share result"
        >
          {copyFeedback ? 'Copied! ✓' : 'Share Result'}
        </button>

        <button
          style={styles.classicButton}
          onClick={onPlayClassic}
          aria-label="Play Classic Mode"
        >
          Play Classic
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Nunito', 'Arial Rounded MT Bold', 'Arial', system-ui, sans-serif",
    padding: '24px',
    boxSizing: 'border-box',
  },
  card: {
    background: '#16213e',
    borderRadius: '16px',
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    maxWidth: '360px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#FFD700',
    fontSize: '2.2rem',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-1px',
  },
  challengeNum: {
    color: '#8888aa',
    fontSize: '1.1rem',
    margin: 0,
    fontWeight: 600,
  },
  emojiRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    minHeight: '52px',
    alignItems: 'center',
  },
  emoji: {
    fontSize: '2.4rem',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    display: 'inline-block',
  } as React.CSSProperties,
  noEmojiText: {
    color: '#6b6b8a',
    fontSize: '1rem',
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  statLabel: {
    color: '#8888aa',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  statValue: {
    color: '#F9F6F2',
    fontSize: '1.4rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  shareButton: {
    background: '#2980b9',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 32px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
    transition: 'background 0.15s',
  },
  classicButton: {
    background: 'transparent',
    color: '#8888aa',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '10px 32px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
  },
}
