import { getChallengeNumber, loadDailyResult } from './game/DailyChallenge'

interface ModeSelectProps {
  classicBest: number
  dailyBlocked: boolean
  onSelectClassic: () => void
  onSelectDaily: () => void
}

export default function ModeSelect({ classicBest, dailyBlocked, onSelectClassic, onSelectDaily }: ModeSelectProps) {
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
