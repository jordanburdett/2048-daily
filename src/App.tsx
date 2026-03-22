import { useState } from 'react'
import ModeSelect from './ModeSelect'
import GameBoard from './GameBoard'
import ResultCard from './ResultCard'
import {
  loadDailyResult,
  saveDailyResult,
  getDailySeed,
  getDailyStorageKey,
  getChallengeNumber,
  generateTileSequence,
  buildEmojiCard,
} from './game/DailyChallenge'
import type { DailyResult } from './game/DailyChallenge'
import { GameEngine } from './game/GameEngine'
import { AudioEngine } from './utils/AudioEngine'
import type { GameState } from './game/types'

type Mode = 'select' | 'classic' | 'daily' | 'daily-result' | 'blindfold'

function getClassicBest(): number {
  try {
    return parseInt(localStorage.getItem('2048-classic-best') ?? '0', 10) || 0
  } catch {
    return 0
  }
}

function initMode(): { mode: Mode; dailyResult: DailyResult | null } {
  const result = loadDailyResult()
  if (result && (result.played || result.attemptStarted)) {
    return { mode: 'daily-result', dailyResult: result }
  }
  return { mode: 'select', dailyResult: result }
}

export default function App() {
  const [{ mode: initialMode, dailyResult: initialResult }] = useState(initMode)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(initialResult)

  // Single shared engine and audio for the game board
  const [engine] = useState<GameEngine>(() => new GameEngine())
  const [audio] = useState(() => new AudioEngine())

  // Blindfold mode state
  const [revealsRemaining, setRevealsRemaining] = useState(3)
  const [isRevealing, setIsRevealing] = useState(false)

  // Read best score directly during render — localStorage is synchronous and safe here
  const classicBest = mode === 'select' ? getClassicBest() : 0

  const handleSelectBlindfold = () => {
    engine.newGame()
    engine.setBlindMode(true)
    setRevealsRemaining(3)
    setIsRevealing(true)
    setTimeout(() => setIsRevealing(false), 1500)
    setMode('blindfold')
  }

  const handleReveal = () => {
    setRevealsRemaining(r => r - 1)
    setIsRevealing(true)
    setTimeout(() => setIsRevealing(false), 2000)
  }

  const handleSelectDaily = () => {
    const challengeNumber = getChallengeNumber()
    // IMMEDIATELY write sentinel before game starts so closing mid-game blocks retry
    const sentinel: DailyResult = {
      played: false,
      attemptStarted: true,
      score: 0,
      bestTile: 0,
      challengeNumber,
      emojiCard: '',
    }
    saveDailyResult(sentinel)
    setDailyResult(sentinel)

    // Generate deterministic tile sequence for today
    const seed = getDailySeed()
    const sequence = generateTileSequence(seed, 500)
    engine.startDaily(sequence)

    setMode('daily')
  }

  const handleDailyGameOver = (gameState: GameState) => {
    const challengeNumber = getChallengeNumber()
    const emojiCard = buildEmojiCard(gameState.bestTile)
    const result: DailyResult = {
      played: true,
      attemptStarted: true,
      score: gameState.score,
      bestTile: gameState.bestTile,
      challengeNumber,
      emojiCard,
    }
    saveDailyResult(result)
    setDailyResult(result)
    setMode('daily-result')
  }

  const handleBackFromGame = () => {
    // If daily was started but not finished, still block re-entry (sentinel was written)
    setMode('select')
  }

  const handlePlayClassicFromResult = () => {
    engine.newGame()
    setMode('classic')
  }

  if (mode === 'daily-result' && dailyResult) {
    return (
      <ResultCard
        result={dailyResult}
        onPlayClassic={handlePlayClassicFromResult}
      />
    )
  }

  if (mode === 'classic' || mode === 'daily' || mode === 'blindfold') {
    const hideNumbers = mode === 'blindfold' && !isRevealing
    return (
      <GameBoard
        key={mode}
        mode={mode === 'blindfold' ? 'classic' : mode}
        engine={engine}
        audio={audio}
        onBack={() => {
          if (mode === 'blindfold') {
            engine.setBlindMode(false)
            setIsRevealing(false)
          }
          handleBackFromGame()
        }}
        onDailyGameOver={mode === 'daily' ? handleDailyGameOver : undefined}
        hideNumbers={hideNumbers}
        revealButton={
          mode === 'blindfold'
            ? { revealsRemaining, isRevealing, onReveal: handleReveal }
            : undefined
        }
        boardGlow={mode === 'blindfold' && isRevealing}
      />
    )
  }

  // Check if daily is blocked (played or sentinal written today)
  const todayKey = getDailyStorageKey()
  let dailyBlocked = false
  try {
    const raw = localStorage.getItem(todayKey)
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, unknown>
      dailyBlocked = obj['played'] === true || obj['attemptStarted'] === true
    }
  } catch {
    // ignore
  }

  return (
    <ModeSelect
      classicBest={classicBest}
      dailyBlocked={dailyBlocked}
      onSelectClassic={() => {
        engine.newGame()
        setMode('classic')
      }}
      onSelectDaily={handleSelectDaily}
      onSelectBlindfold={handleSelectBlindfold}
    />
  )
}

