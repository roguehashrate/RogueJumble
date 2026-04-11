export default function BackgroundOrbs({ className = '' }: { className?: string }) {
  const stars = [
    { top: '10%', left: '20%', delay: '0s' },
    { top: '60%', left: '80%', delay: '-5s' },
    { top: '30%', left: '10%', delay: '-2s' },
    { top: '80%', left: '30%', delay: '-7s' },
    { top: '20%', left: '70%', delay: '-12s' },
    { top: '50%', left: '90%', delay: '-3s' },
    { top: '90%', left: '60%', delay: '-15s' },
    { top: '15%', left: '50%', delay: '-8s' },
    { top: '70%', left: '15%', delay: '-10s' },
    { top: '45%', left: '45%', delay: '-4s' },
  ]

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
      aria-hidden="true"
    >
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary animate-float-slow"
          style={{
            width: '6px',
            height: '6px',
            top: star.top,
            left: star.left,
            opacity: 0.6,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  )
}
