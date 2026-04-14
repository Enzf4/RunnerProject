import { Flame } from 'lucide-react'

/**
 * Visual badge component displaying a user's weekly activity streak.
 * Shows a fire icon with the streak count when active, or a muted
 * encouragement state when the streak is 0.
 *
 * @param {{ currentStreak: number, loading: boolean, className?: string }} props
 */
export function StreakBadge({ currentStreak = 0, loading = false, className = '' }) {
  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse ${className}`}>
        <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div className="w-6 h-3 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    )
  }

  const isActive = currentStreak > 0

  if (isActive) {
    return (
      <div
        className={`group relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
          bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/40
          border border-orange-200/70 dark:border-orange-800/40
          shadow-sm hover:shadow-md hover:scale-105
          transition-all duration-200 cursor-default ${className}`}
        title={`Streak de ${currentStreak} semana${currentStreak > 1 ? 's' : ''} consecutiva${currentStreak > 1 ? 's' : ''}`}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400/20 to-amber-400/20 dark:from-orange-400/10 dark:to-amber-400/10 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
        <Flame className="relative w-4 h-4 text-orange-500 dark:text-orange-400 animate-pulse" />
        <span className="relative text-sm font-extrabold text-orange-700 dark:text-orange-300 tabular-nums">
          {currentStreak}
        </span>
        <span className="relative text-[10px] font-bold text-orange-500/70 dark:text-orange-400/50 uppercase tracking-wider hidden sm:inline">
          {currentStreak === 1 ? 'sem' : 'sem'}
        </span>
      </div>
    )
  }

  // Inactive / zero streak state
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
        bg-zinc-100 dark:bg-zinc-800/60
        border border-zinc-200/70 dark:border-zinc-700/40
        cursor-default transition-all duration-200 ${className}`}
      title="Nenhuma streak ativa — corra esta semana para começar!"
    >
      <Flame className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
      <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
        Comece sua streak! 🏃
      </span>
    </div>
  )
}
