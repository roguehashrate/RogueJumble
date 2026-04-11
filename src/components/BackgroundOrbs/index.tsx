import { useMemo } from 'react'

interface Orb {
  id: number
  size: number
  x: number
  y: number
  color: string
  animationDuration: number
  animationDelay: number
  blur: number
}

function generateOrbs(count: number): Orb[] {
  const colors = [
    'var(--primary)',
    'var(--zap)',
    'var(--repost)',
    'var(--bookmark)',
    'var(--comment)'
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 300 + 100,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    animationDuration: Math.random() * 20 + 15,
    animationDelay: Math.random() * -20,
    blur: Math.random() * 60 + 80
  }))
}

export default function BackgroundOrbs({ className = '' }: { className?: string }) {
  const orbs = useMemo(() => generateOrbs(5), [])

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="absolute animate-float"
          style={{
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            borderRadius: '50%',
            background: `radial-gradient(circle, hsl(${orb.color} / 0.15) 0%, transparent 70%)`,
            filter: `blur(${orb.blur}px)`,
            animationDuration: `${orb.animationDuration}s`,
            animationDelay: `${orb.animationDelay}s`
          }}
        />
      ))}
    </div>
  )
}
