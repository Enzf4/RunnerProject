import { NavLink } from "react-router-dom"
import { Home, Users, User, PlusCircle, Sun, Moon, PersonStanding, Newspaper } from "lucide-react"
import { useTheme } from "../ThemeProvider"

export function BottomNav() {
  const { dark, toggle } = useTheme()

  const navItems = [
    { to: "/", icon: Home, label: "Início" },
    { to: "/feed", icon: Newspaper, label: "Feed" },
    { to: "/clubs", icon: Users, label: "Clubes" },
    { to: "/runners", icon: PersonStanding, label: "Corredores" },
    { to: "/profile", icon: User, label: "Perfil" }
  ]

  return (
    <>
      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[88%] max-w-sm lg:hidden">
        <div className="rounded-[1.6rem] bg-zinc-950 dark:bg-zinc-900 px-3 py-3.5 shadow-2xl shadow-zinc-900/40 border border-zinc-800/50">
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

            <button
              onClick={toggle}
              className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 active:scale-95 transition-all duration-200"
            >
              <div className="p-1.5 rounded-xl">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </div>
              <span className="text-[10px] font-semibold">{dark ? 'Light' : 'Dark'}</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col bg-zinc-950 dark:bg-zinc-900 border-r border-zinc-800/50 z-50 px-4 py-8">
        {/* Brand */}
        <div className="flex items-center gap-3 px-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-pastel-lavender/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-pastel-lavender" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-lg leading-tight">Runner Hub</h1>
            <p className="text-zinc-500 text-[10px] font-medium tracking-wider uppercase">Para corredores</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200 mt-auto"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {dark ? 'Modo Claro' : 'Modo Escuro'}
        </button>
      </aside>
    </>
  )
}
