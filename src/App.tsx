import { useState, useEffect, useRef } from 'react'
import ModeSelect from './ModeSelect'
import GameBoard from './GameBoard'
import ResultCard from './ResultCard'
import ArchitectBoard from './ArchitectBoard'
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
import { GameStatus } from './game/types'
import type { GameState } from './game/types'
import { decodeGridHash } from './utils/architectHash'

type Mode = 'select' | 'classic' | 'daily' | 'daily-result' | 'blindfold' | 'blindfold-result' | 'architect' | 'custom' | 'custom-result'

// Module-level variable to hold a decoded URL hash preset before React mounts
let pendingCustomHash: string | null = null

const BLINDFOLD_BADGE_KEY = '2048-blindfold-badge'

export interface BlindBadge {
  earned: boolean
  bestTile: number
  revealsUsed: number
  date: string
}

function getClassicBest(): number {
  try {
    return parseInt(localStorage.getItem('2048-classic-best') ?? '0', 10) || 0
  } catch {
    return 0
  }
}

function loadBlindBadge(): BlindBadge | null {
  try {
    const raw = localStorage.getItem(BLINDFOLD_BADGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BlindBadge
  } catch {
    return null
  }
}

function saveBlindBadge(badge: BlindBadge): void {
  try {
    localStorage.setItem(BLINDFOLD_BADGE_KEY, JSON.stringify(badge))
  } catch {
    // ignore
  }
}

function getTodayDateString(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function initMode(): { mode: Mode; dailyResult: DailyResult | null } {
  const result = loadDailyResult()
  if (result && (result.played || result.attemptStarted)) {
    return { mode: 'daily-result', dailyResult: result }
  }
  // Check for a custom board URL hash
  const rawHash = window.location.hash
  if (rawHash) {
    const hashStr = rawHash.slice(1) // strip leading '#'
    const decoded = decodeGridHash(hashStr)
    if (decoded !== null) {
      pendingCustomHash = hashStr
    }
    // Always clear the hash fragment regardless of whether decoding succeeded
    history.replaceState(null, '', window.location.pathname)
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
  const [autoRevealCountdown, setAutoRevealCountdown] = useState(30)

  // Blindfold stats tracking
  const [manualRevealsUsed, setManualRevealsUsed] = useState(0)
  const [autoRevealsReceived, setAutoRevealsReceived] = useState(0)
  const [blindfoldBestTile, setBlindfoldBestTile] = useState(0)
  const [badgeEarnedThisGame, setBadgeEarnedThisGame] = useState(false)

  // Custom board result state
  const [customFinalState, setCustomFinalState] = useState<GameState | null>(null)

  // Persistent badge loaded from localStorage
  const [blindfoldBadge, setBlindfoldBadge] = useState<BlindBadge | null>(() => loadBlindBadge())

  // Keep a stable ref to setIsRevealing so it's safe to call inside the
  // setAutoRevealCountdown functional updater without creating a stale closure.
  const setIsRevealingRef = useRef(setIsRevealing)
  useEffect(() => { setIsRevealingRef.current = setIsRevealing }, [setIsRevealing])

  // Auto-reveal: every 30 s while in Blindfold mode with game PLAYING,
  // automatically show all tiles for 2 s (does not consume manual reveal count).
  useEffect(() => {
    if (mode !== 'blindfold') return
    const interval = setInterval(() => {
      // Only fire the reveal when the game is still in progress.
      if (engine.getState().status !== GameStatus.PLAYING) return
      setAutoRevealCountdown(prev => {
        if (prev <= 1) {
          setIsRevealingRef.current(true)
          setAutoRevealsReceived(n => n + 1)
          setTimeout(() => setIsRevealingRef.current(false), 2000)
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [mode, engine])

  // Detect blindfold game end (GAME_OVER or WON) and show result
  const blindfoldGameEndFired = useRef(false)
  useEffect(() => {
    if (mode !== 'blindfold') return
    const checkInterval = setInterval(() => {
      const state = engine.getState()
      if (
        (state.status === GameStatus.GAME_OVER || state.status === GameStatus.WON) &&
        !blindfoldGameEndFired.current
      ) {
        blindfoldGameEndFired.current = true
        const bestTile = Math.max(...state.grid)
        const finalManualRevealsUsed = 3 - revealsRemaining
        setBlindfoldBestTile(bestTile)

        // Badge logic: reach 512 with ≤1 manual reveal
        const earnedBadge = bestTile >= 512 && finalManualRevealsUsed <= 1
        setBadgeEarnedThisGame(earnedBadge)
        if (earnedBadge) {
          const badge: BlindBadge = {
            earned: true,
            bestTile,
            revealsUsed: finalManualRevealsUsed,
            date: getTodayDateString(),
          }
          saveBlindBadge(badge)
          setBlindfoldBadge(badge)
        }

        // Show result after a short delay so the game-over overlay renders
        setTimeout(() => {
          engine.setBlindMode(false)
          setIsRevealing(false)
          setMode('blindfold-result')
        }, 1400)
      }
    }, 200)
    return () => clearInterval(checkInterval)
  }, [mode, engine, revealsRemaining])

  // Detect custom game end and show custom result card
  const customGameEndFired = useRef(false)
  useEffect(() => {
    if (mode !== 'custom') return
    customGameEndFired.current = false
    const checkInterval = setInterval(() => {
      const state = engine.getState()
      if (
        (state.status === GameStatus.GAME_OVER || state.status === GameStatus.WON) &&
        !customGameEndFired.current
      ) {
        customGameEndFired.current = true
        setTimeout(() => {
          setCustomFinalState(state)
          setMode('custom-result')
        }, 1400)
      }
    }, 200)
    return () => clearInterval(checkInterval)
  }, [mode, engine])

  // Read best score directly during render — localStorage is synchronous and safe here
  const classicBest = mode === 'select' ? getClassicBest() : 0

  const handleSelectBlindfold = () => {
    engine.newGame()
    engine.setBlindMode(true)
    setRevealsRemaining(3)
    setIsRevealing(true)
    setAutoRevealCountdown(30)
    setManualRevealsUsed(0)
    setAutoRevealsReceived(0)
    setBlindfoldBestTile(0)
    setBadgeEarnedThisGame(false)
    blindfoldGameEndFired.current = false
    setTimeout(() => setIsRevealing(false), 1500)
    setMode('blindfold')
  }

  const handleReveal = () => {
    setManualRevealsUsed(n => n + 1)
    setRevealsRemaining(r => r - 1)
    setIsRevealing(true)
    setAutoRevealCountdown(30)
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

  const handleArchitectPlay = (hash: string) => {
    const grid = decodeGridHash(hash)
    if (grid === null) {
      engine.newGame()
      setMode('classic')
    } else {
      engine.startCustom(grid)
      setCustomFinalState(null)
      setMode('custom')
    }
  }

  // Apply pending URL hash on first render (set during initMode before React mounted).
  // The hash fragment is already cleared by initMode unconditionally, so we only
  // need to trigger the game transition here.
  useEffect(() => {
    if (pendingCustomHash) {
      handleArchitectPlay(pendingCustomHash)
      pendingCustomHash = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  if (mode === 'blindfold-result') {
    return (
      <ResultCard
        result={null}
        onPlayClassic={handlePlayClassicFromResult}
        onPlayBlindfold={() => handleSelectBlindfold()}
        isBlindfold
        bestTile={blindfoldBestTile}
        manualRevealsUsed={manualRevealsUsed}
        autoRevealsReceived={autoRevealsReceived}
        badgeEarned={badgeEarnedThisGame}
      />
    )
  }

  if (mode === 'custom-result') {
    const customResult: DailyResult | null = customFinalState
      ? {
          played: true,
          attemptStarted: true,
          score: customFinalState.score,
          bestTile: customFinalState.bestTile,
          challengeNumber: 0,
          emojiCard: '',
        }
      : null
    return (
      <ResultCard
        result={customResult}
        onPlayClassic={handlePlayClassicFromResult}
        isCustom
        onCreateOwn={() => setMode('architect')}
      />
    )
  }

  if (mode === 'architect') {
    return (
      <ArchitectBoard
        onPlay={handleArchitectPlay}
        onBack={() => setMode('select')}
      />
    )
  }

  if (mode === 'classic' || mode === 'daily' || mode === 'blindfold' || mode === 'custom') {
    const hideNumbers = mode === 'blindfold' && !isRevealing
    const isCustomMode = mode === 'custom'
    return (
      <GameBoard
        key={mode}
        mode={mode === 'blindfold' || isCustomMode ? 'classic' : mode}
        engine={engine}
        audio={audio}
        onBack={() => {
          if (mode === 'blindfold') {
            engine.setBlindMode(false)
            setIsRevealing(false)
            blindfoldGameEndFired.current = false
          }
          if (isCustomMode) {
            customGameEndFired.current = false
          }
          handleBackFromGame()
        }}
        onDailyGameOver={mode === 'daily' ? handleDailyGameOver : undefined}
        hideNumbers={hideNumbers}
        revealButton={
          mode === 'blindfold'
            ? { revealsRemaining, isRevealing, onReveal: handleReveal, autoRevealCountdown }
            : undefined
        }
        boardGlow={mode === 'blindfold' && isRevealing}
        boardLabel={isCustomMode ? 'Custom Board' : undefined}
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
      onSelectArchitect={() => setMode('architect')}
      blindfoldBadgeEarned={blindfoldBadge?.earned === true}
    />
  )
}

