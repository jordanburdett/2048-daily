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
  result: DailyResult | null
  onPlayClassic: () => void
  // Blindfold-specific
  isBlindfold?: boolean
  onPlayBlindfold?: () => void
  bestTile?: number
  manualRevealsUsed?: number
  autoRevealsReceived?: number
  badgeEarned?: boolean
  // Custom board-specific
  isCustom?: boolean
  onCreateOwn?: () => void
}

export default function ResultCard({
  result,
  onPlayClassic,
  isBlindfold,
  onPlayBlindfold,
  bestTile = 0,
  manualRevealsUsed = 0,
  autoRevealsReceived = 0,
  badgeEarned = false,
  isCustom = false,
  onCreateOwn,
}: ResultCardProps) {
  const emojis = result?.emojiCard ? [...result.emojiCard] : []
  const [revealedCount, setRevealedCount] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState(false)

  useEffect(() => {
    if (emojis.length === 0) return
    let current = 0
    let handle: ReturnType<typeof setTimeout>
    const reveal = () => {
      current++
      setRevealedCount(current)
      if (current < emojis.length) {
        handle = setTimeout(reveal, 250)
      }
    }
    handle = setTimeout(reveal, 400)
    return () => clearTimeout(handle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.emojiCard])

  const handleShare = async () => {
    if (!result) return
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

  // -----------------------------------------------------------------------
  // Blindfold result view
  // -----------------------------------------------------------------------
  if (isBlindfold) {
    const tileColors = bestTile > 0 ? getTileColor(bestTile) : FALLBACK_TILE
    return (
      <div style={styles.page} role="dialog" aria-label="Blindfold game result">
        <div style={styles.card}>
          <h1 style={styles.title}>2048 Daily</h1>

          {/* Blindfold header badge */}
          <div style={styles.blindfoldHeader}>
            <span style={styles.blindfoldIcon}>🙈</span>
            <span style={styles.blindfoldHeaderText}>Blindfold Mode</span>
          </div>

          {/* Best tile */}
          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Highest tile</span>
              <span
                style={{
                  ...styles.statValue,
                  background: tileColors.bg,
                  color: tileColors.fg,
                  borderRadius: '6px',
                  padding: '4px 14px',
                }}
              >
                {bestTile > 0 ? bestTile : '—'}
              </span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Manual reveals</span>
              <span style={styles.statValue}>{manualRevealsUsed}/3</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Auto-reveals</span>
              <span style={styles.statValue}>{autoRevealsReceived}</span>
            </div>
          </div>

          {/* Badge earned */}
          {badgeEarned && (
            <div style={styles.badgeEarned} aria-label="Blindfold Master badge earned">
              <span style={{ fontSize: '1.8rem' }}>🏅</span>
              <span style={styles.badgeEarnedText}>Blindfold Master earned!</span>
            </div>
          )}

          {/* Badge criteria */}
          <div style={styles.badgeCriteria}>
            <span style={styles.badgeCriteriaText}>
              Badge: Reach 512 with ≤1 manual reveal
            </span>
          </div>

          {/* Play again buttons */}
          <button
            style={styles.primaryButton}
            onClick={onPlayBlindfold}
            aria-label="Play Blindfold again"
          >
            Play Again
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

  // -----------------------------------------------------------------------
  // Custom board result view
  // -----------------------------------------------------------------------
  if (isCustom) {
    const customBestTile = result?.bestTile ?? bestTile
    const tileColorsCustom = customBestTile > 0 ? getTileColor(customBestTile) : FALLBACK_TILE
    return (
      <div style={styles.page} role="dialog" aria-label="Custom board result">
        <div style={styles.card}>
          <h1 style={styles.title}>2048 Daily</h1>
          <div style={styles.customHeader}>
            <span style={styles.customHeaderText}>Custom Board</span>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>Best tile</span>
              <span
                style={{
                  ...styles.statValue,
                  background: tileColorsCustom.bg,
                  color: tileColorsCustom.fg,
                  borderRadius: '6px',
                  padding: '4px 14px',
                }}
              >
                {customBestTile > 0 ? customBestTile : '—'}
              </span>
            </div>
            {result && (
              <div style={styles.statBox}>
                <span style={styles.statLabel}>Score</span>
                <span style={styles.statValue}>{result.score.toLocaleString()}</span>
              </div>
            )}
          </div>

          <button
            style={styles.classicButton}
            onClick={onPlayClassic}
            aria-label="Play Classic Mode"
          >
            Play Classic
          </button>

          {onCreateOwn && (
            <button
              style={styles.createOwnButton}
              onClick={onCreateOwn}
              aria-label="Create your own custom board"
            >
              Create Your Own
            </button>
          )}
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Daily challenge result view
  // -----------------------------------------------------------------------
  if (!result) return null

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
  blindfoldHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#6c3483',
    borderRadius: '10px',
    padding: '8px 20px',
  },
  blindfoldIcon: {
    fontSize: '1.4rem',
  },
  blindfoldHeaderText: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 700,
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
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
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
  badgeEarned: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(212, 160, 23, 0.15)',
    border: '1px solid #d4a017',
    borderRadius: '10px',
    padding: '10px 20px',
    width: '100%',
    boxSizing: 'border-box',
    justifyContent: 'center',
  },
  badgeEarnedText: {
    color: '#d4a017',
    fontWeight: 700,
    fontSize: '1rem',
  },
  badgeCriteria: {
    background: 'rgba(108, 52, 131, 0.15)',
    border: '1px solid #6c3483',
    borderRadius: '8px',
    padding: '8px 16px',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  badgeCriteriaText: {
    color: '#b07ad4',
    fontSize: '0.85rem',
    fontWeight: 600,
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
  primaryButton: {
    background: '#6c3483',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 32px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
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
  customHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(30, 132, 73, 0.2)',
    border: '1px solid #1e8449',
    borderRadius: '10px',
    padding: '8px 20px',
  },
  customHeaderText: {
    color: '#2ecc71',
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  createOwnButton: {
    background: '#1e8449',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 32px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
  },
}
