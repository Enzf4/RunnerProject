import { NavLink } from "react-router-dom"
import { Home, Users, User, PlusCircle } from "lucide-react"

export function BottomNav() {
  const navItems = [
    { to: "/", icon: Home, label: "Início" },
    { to: "/clubs", icon: Users, label: "Clubes" },
    { to: "/clubs/new", icon: PlusCircle, label: "Criar" },
    { to: "/profile", icon: User, label: "Perfil" }
  ]

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[88%] max-w-sm">
      <div className="rounded-[1.6rem] bg-zinc-950 px-4 py-3.5 shadow-2xl shadow-zinc-900/40 border border-zinc-800/50">
        <nav className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 transition-all duration-200 ${
                  isActive 
                    ? "text-white scale-110" 
                    : "text-zinc-500 hover:text-zinc-300 active:scale-95"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white/10' : ''}`}>
                    <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
