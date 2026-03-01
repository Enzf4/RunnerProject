import { Outlet } from "react-router-dom"
import { BottomNav } from "./BottomNav"

export function AppLayout() {
  return (
    <div className="min-h-screen font-sans text-zinc-900 selection:bg-pastel-lavender/50 transition-colors relative"
      style={{ background: 'linear-gradient(180deg, #f8f7ff 0%, #fef6f0 40%, #f0f7f8 100%)' }}
    >
      {/* Subtle background shapes */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-pastel-lavender/20 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-48 h-48 rounded-full bg-pastel-peach/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-pastel-blue/20 blur-3xl" />
      </div>

      <main className="flex-1 w-full max-w-lg mx-auto pb-28 pt-2 relative z-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
