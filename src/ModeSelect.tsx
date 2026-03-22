import { useState } from 'react'
import { getChallengeNumber, loadDailyResult } from './game/DailyChallenge'

// ---------------------------------------------------------------------------
// Color legend data (matches GameBoard TILE_COLORS, using the blinded label names)
// ---------------------------------------------------------------------------
const COLOR_LEGEND: Array<{ value: number; name: string; bg: string; fg: string }> = [
  { value: 2,    name: 'Cream',       bg: '#EEE4DA', fg: '#7A6C5E' },
  { value: 4,    name: 'Warm Tan',    bg: '#EDE0C8', fg: '#7A6C5E' },
  { value: 8,    name: 'Coral',       bg: '#F2B179', fg: '#F9F6F2' },
  { value: 16,   name: 'Orange',      bg: '#F59563', fg: '#F9F6F2' },
  { value: 32,   name: 'Red-Orange',  bg: '#F67C5F', fg: '#F9F6F2' },
  { value: 64,   name: 'Red',         bg: '#F65E3B', fg: '#F9F6F2' },
  { value: 128,  name: 'Amber',       bg: '#EDCF72', fg: '#F9F6F2' },
  { value: 256,  name: 'Gold',        bg: '#EDCC61', fg: '#F9F6F2' },
  { value: 512,  name: 'Deep Gold',   bg: '#9B2335', fg: '#F9F6F2' },
  { value: 1024, name: 'Forest Green',bg: '#27622A', fg: '#F9F6F2' },
  { value: 2048, name: 'Deep Green',  bg: '#1C3461', fg: '#F9F6F2' },
]

// ---------------------------------------------------------------------------
// ColorLegend popup
// ---------------------------------------------------------------------------
function ColorLegend() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        style={legendStyles.helpBtn}
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        aria-label="Blindfold color legend"
        title="Color guide"
      >
        ?
      </button>

      {open && (
        <div
          style={legendStyles.overlay}
          role="dialog"
          aria-label="Blindfold color legend"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            style={legendStyles.popup}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={legendStyles.popupTitle}>Tile Colors</h3>
            <p style={legendStyles.popupSubtitle}>In Blindfold mode, tiles show color — no numbers.</p>
            <ul style={legendStyles.list} aria-label="Tile color list">
              {COLOR_LEGEND.map(entry => (
                <li key={entry.value} style={legendStyles.listItem}>
                  <span
                    style={{
                      ...legendStyles.swatch,
                      background: entry.bg,
                    }}
                    aria-hidden="true"
                  />
                  <span style={legendStyles.valueName}>
                    <strong style={{ color: '#F9F6F2' }}>{entry.value}</strong>
                    <span style={{ color: '#b0b0c0' }}> — {entry.name}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              style={legendStyles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Close color legend"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const legendStyles: Record<string, React.CSSProperties> = {
  helpBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
    boxSizing: 'border-box',
  },
  popup: {
    background: '#16213e',
    borderRadius: '14px',
    padding: '24px 28px',
    maxWidth: '320px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  popupTitle: {
    color: '#FFD700',
    fontSize: '1.2rem',
    fontWeight: 700,
    margin: 0,
  },
  popupSubtitle: {
    color: '#8888aa',
    fontSize: '0.85rem',
    margin: 0,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  swatch: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  valueName: {
    fontSize: '0.9rem',
    lineHeight: 1.3,
  },
  closeBtn: {
    background: '#6c3483',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 20px',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    alignSelf: 'center',
    marginTop: '4px',
  },
}

// ---------------------------------------------------------------------------
// ModeSelect
// ---------------------------------------------------------------------------
interface ModeSelectProps {
  classicBest: number
  dailyBlocked: boolean
  onSelectClassic: () => void
  onSelectDaily: () => void
  onSelectBlindfold: () => void
  blindfoldBadgeEarned?: boolean
}

export default function ModeSelect({
  classicBest,
  dailyBlocked,
  onSelectClassic,
  onSelectDaily,
  onSelectBlindfold,
  blindfoldBadgeEarned,
}: ModeSelectProps) {
  const challengeNum = getChallengeNumber()
  const dailyResult = loadDailyResult()
  const emojiPreview = dailyResult?.emojiCard || ''

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>2048 Daily</h1>
      <p style={styles.subtitle}>Combine the tiles to reach 2048!</p>

      <div style={styles.buttonRow}>
        <button
          style={{ ...styles.modeButton, ...styles.classicButton }}
          onClick={onSelectClassic}
          aria-label="Play Classic Mode"
        >
          <span style={styles.modeName}>Classic Mode</span>
          {classicBest > 0 && (
            <span style={styles.modeDetail}>Best: {classicBest.toLocaleString()}</span>
          )}
          {classicBest === 0 && (
            <span style={styles.modeDetail}>Endless fun</span>
          )}
        </button>

        <button
          style={{
            ...styles.modeButton,
            ...styles.dailyButton,
            opacity: dailyBlocked ? 0.65 : 1,
            cursor: dailyBlocked ? 'default' : 'pointer',
          }}
          onClick={dailyBlocked ? undefined : onSelectDaily}
          disabled={dailyBlocked}
          aria-label={dailyBlocked ? 'Daily Challenge already completed' : 'Play Daily Challenge'}
        >
          <span style={styles.modeName}>Daily Challenge</span>
          <span style={styles.modeDetail}>
            #{challengeNum}
            {dailyBlocked && (
              <span style={styles.completedBadge}> Completed</span>
            )}
          </span>
          {emojiPreview.length > 0 && (
            <span style={styles.emojiPreview}>{emojiPreview}</span>
          )}
        </button>

        {/* Blindfold button + color legend help button */}
        <div style={styles.blindfoldWrapper}>
          <button
            style={{ ...styles.modeButton, ...styles.blindfoldButton, width: '100%' }}
            onClick={onSelectBlindfold}
            aria-label="Play Blindfold Blitz mode"
          >
            <span style={styles.modeName}>
              Blindfold{blindfoldBadgeEarned ? ' 🏅' : ''}
            </span>
            <span style={styles.modeDetail}>Color-only · 3 reveals</span>
          </button>
          <div style={styles.legendBtnWrapper}>
            <ColorLegend />
          </div>
        </div>
      </div>

      <p style={styles.hint}>Arrow keys to move · Undo to step back</p>
    </div>
  )
}

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
  },
  title: {
    color: '#FFD700',
    fontSize: '3.5rem',
    fontWeight: 700,
    margin: '0 0 8px',
    letterSpacing: '-1px',
  },
  subtitle: {
    color: '#b0b0c0',
    fontSize: '1.1rem',
    margin: '0 0 48px',
  },
  buttonRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  blindfoldWrapper: {
    position: 'relative',
    width: '200px',
    display: 'flex',
    flexDirection: 'column',
  },
  legendBtnWrapper: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: 1,
  },
  modeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '200px',
    minHeight: '110px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    padding: '20px',
    gap: '8px',
    transition: 'transform 0.1s, filter 0.1s',
    fontFamily: 'inherit',
  },
  classicButton: {
    background: '#c0392b',
    color: '#fff',
  },
  dailyButton: {
    background: '#2980b9',
    color: '#fff',
  },
  blindfoldButton: {
    background: '#6c3483',
    color: '#fff',
  },
  modeName: {
    fontSize: '1.3rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  modeDetail: {
    fontSize: '0.9rem',
    opacity: 0.85,
  },
  completedBadge: {
    background: '#27ae60',
    borderRadius: '4px',
    padding: '1px 6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginLeft: '4px',
  },
  emojiPreview: {
    fontSize: '1.2rem',
    letterSpacing: '2px',
  },
  hint: {
    color: '#6b6b8a',
    fontSize: '0.9rem',
    marginTop: '48px',
  },
}
