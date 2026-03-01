import { Outlet } from "react-router-dom"
import { BottomNav } from "./BottomNav"

export function AppLayout() {
  return (
    <div className="min-h-screen font-sans text-zinc-900 dark:text-zinc-100 selection:bg-pastel-lavender/50 transition-colors relative bg-gradient-to-b from-[#f8f7ff] via-[#fef6f0] to-[#f0f7f8] dark:from-[#0c0a14] dark:via-[#100e18] dark:to-[#0a0e14]"
    >
      {/* Subtle background shapes */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-pastel-lavender/20 dark:bg-purple-900/15 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-48 h-48 rounded-full bg-pastel-peach/20 dark:bg-orange-900/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-pastel-blue/20 dark:bg-blue-900/10 blur-3xl" />
      </div>

      {/* Desktop: offset by sidebar */}
      <div className="lg:pl-64">
        <main className="flex-1 w-full max-w-lg lg:max-w-4xl mx-auto pb-28 lg:pb-8 pt-2 lg:pt-6 relative z-10">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
