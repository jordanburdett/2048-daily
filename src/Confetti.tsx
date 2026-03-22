import { useState } from 'react'

const CONFETTI_COLORS = ['#FFD95A', '#C8A8E9', '#5DB85D', '#FFB347', '#FF6B6B', '#74D1FF']
const PIECE_COUNT = 40

interface ConfettiPiece {
  id: number
  color: string
  left: string
  width: string
  height: string
  duration: string
  delay: string
}

function makeConfettiPieces(): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    width: `${6 + Math.random() * 8}px`,
    height: `${6 + Math.random() * 8}px`,
    duration: `${0.8 + Math.random() * 0.7}s`,
    delay: `${Math.random() * 0.5}s`,
  }))
}

interface ConfettiProps {
  /** When true, burst the confetti. The parent controls when to hide (set active=false). */
  active: boolean
}

export default function Confetti({ active }: ConfettiProps) {
  const [pieces] = useState<ConfettiPiece[]>(makeConfettiPieces)

  if (!active) return null

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(calc(100vh + 20px)) rotate(720deg); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .confetti-piece {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 100,
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {pieces.map(p => (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              position: 'absolute',
              top: 0,
              left: p.left,
              width: p.width,
              height: p.height,
              background: p.color,
              borderRadius: '2px',
              animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
            }}
          />
        ))}
      </div>
    </>
  )
}
