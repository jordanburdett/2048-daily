import { useState } from 'react'
import ModeSelect from './ModeSelect'
import GameBoard from './GameBoard'

type Mode = 'select' | 'classic' | 'daily'

function getClassicBest(): number {
  try {
    return parseInt(localStorage.getItem('2048-classic-best') ?? '0', 10) || 0
  } catch {
    return 0
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>('select')

  // Read best score directly during render — localStorage is synchronous and safe here
  const classicBest = mode === 'select' ? getClassicBest() : 0

  if (mode === 'classic' || mode === 'daily') {
    return (
      <GameBoard
        mode={mode}
        onBack={() => setMode('select')}
      />
    )
  }

  return (
    <ModeSelect
      classicBest={classicBest}
      onSelectClassic={() => setMode('classic')}
      onSelectDaily={() => setMode('daily')}
    />
  )
}
