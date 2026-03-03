import { useState, useEffect } from 'react'

export function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0) // 0=logo, 1=text, 2=exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => setPhase(2), 1800)
    const t3 = setTimeout(() => onComplete(), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-opacity duration-500 ${phase === 2 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-72 h-72 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(217,70,239,0.2) 0%, transparent 70%)',
            top: '10%',
            left: '-5%',
            animation: 'splash-float 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(134,239,172,0.2) 0%, transparent 70%)',
            bottom: '5%',
            right: '-10%',
            animation: 'splash-float 5s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute w-48 h-48 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(196,181,253,0.25) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'splash-pulse 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <div
          className="relative"
          style={{
            animation: 'splash-logo-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <div className="w-24 h-24 rounded-[2rem] bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl shadow-2xl flex items-center justify-center relative overflow-hidden">
            {/* Shimmer effect */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
                animation: 'splash-shimmer 2s ease-in-out infinite',
              }}
            />
            <span className="text-4xl font-black bg-gradient-to-br from-fuchsia-500 via-purple-400 to-green-400 bg-clip-text text-transparent relative z-10">
              R
            </span>
          </div>
          {/* Ring pulse */}
          <div
            className="absolute inset-0 rounded-[2rem] border-2 border-fuchsia-400/40"
            style={{ animation: 'splash-ring 1.5s ease-out forwards' }}
          />
        </div>

        {/* Text */}
        <div
          className="text-center"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Runner Hub
          </h1>
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mt-1 tracking-wider uppercase">
            Corra junto. Vá mais longe.
          </p>
        </div>

        {/* Loading dots */}
        <div
          className="flex items-center gap-1.5"
          style={{
            opacity: phase >= 1 && phase < 2 ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 dark:bg-fuchsia-500"
              style={{
                animation: 'splash-dots 1s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
