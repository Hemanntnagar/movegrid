'use client'

type Deco = {
  glyph: string
  top?: string
  left?: string
  right?: string
  bottom?: string
  size: number
  rotate: number
  delay: number
}

const DECORATIONS: Deco[] = [
  { glyph: '⭐', top: '8%', left: '4%', size: 28, rotate: -12, delay: 0 },
  { glyph: '⚡', top: '14%', right: '5%', size: 32, rotate: 8, delay: 0.4 },
  { glyph: '🏆', top: '28%', left: '2%', size: 26, rotate: 6, delay: 0.8 },
  { glyph: '👟', top: '42%', right: '3%', size: 30, rotate: -10, delay: 1.1 },
  { glyph: '💎', top: '55%', left: '6%', size: 24, rotate: 14, delay: 0.2 },
  { glyph: '🔥', top: '62%', right: '8%', size: 28, rotate: -6, delay: 1.4 },
  { glyph: '🎯', top: '72%', left: '3%', size: 26, rotate: 10, delay: 0.6 },
  { glyph: '🎮', top: '78%', right: '4%', size: 30, rotate: -14, delay: 1.8 },
  { glyph: '✨', top: '35%', left: '88%', size: 22, rotate: 20, delay: 0.3 },
  { glyph: '🌟', top: '48%', left: '92%', size: 24, rotate: -8, delay: 1.0 },
  { glyph: '⚡', top: '18%', left: '78%', size: 20, rotate: 12, delay: 1.6 },
  { glyph: '🏅', top: '85%', left: '12%', size: 26, rotate: -4, delay: 0.9 },
  { glyph: '💪', top: '6%', left: '42%', size: 22, rotate: -16, delay: 2.0 },
  { glyph: '🐧', top: '88%', right: '18%', size: 28, rotate: 8, delay: 0.5 },
]

export function GameWorldBackground() {
  return (
    <div className="game-world-bg" aria-hidden>
      <div className="game-world-grid" />
      {DECORATIONS.map((item, index) => (
        <span
          key={`${item.glyph}-${index}`}
          className="game-world-symbol"
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            fontSize: `${item.size}px`,
            ['--symbol-rotate' as string]: `${item.rotate}deg`,
            ['--symbol-delay' as string]: `${item.delay}s`,
          }}
        >
          {item.glyph}
        </span>
      ))}
    </div>
  )
}
