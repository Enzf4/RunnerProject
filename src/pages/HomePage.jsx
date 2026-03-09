import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Timer, MapPin, Users, ChevronRight, UserCircle, Compass, Trophy, ArrowRight, PlusCircle, Search, Zap } from 'lucide-react'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'

const motivationalPhrases = [
  "Cada quilômetro conta 🏃",
  "Seu pace, suas regras ⚡",
  "Juntos corremos mais longe 🤝",
  "A cidade é sua pista 🌆",
  "Supere seus limites 💪",
  "Correr é meditar em movimento 🧘",
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return { text: 'Boa madrugada', emoji: '🌙' }
  if (h < 12) return { text: 'Bom dia', emoji: '☀️' }
  if (h < 18) return { text: 'Boa tarde', emoji: '🌤️' }
  return { text: 'Boa noite', emoji: '🌙' }
}

export function HomePage() {
  const [profile, setProfile] = useState(null)
  const [recentClubs, setRecentClubs] = useState([])
  const [myClubCount, setMyClubCount] = useState(0)
  const [runnerCount, setRunnerCount] = useState(0)
  const [isStravaConnected, setIsStravaConnected] = useState(true) // assume true to prevent flash
  const [loading, setLoading] = useState(true)
  const greeting = getGreeting()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const [profileResponse, stravaResponse] = await Promise.all([
          supabase.from('profiles').select('pace_medio, cidade, name, photo_url').eq('id', user.id).single(),
          supabase.from('user_strava_tokens').select('user_id').eq('user_id', user.id).maybeSingle()
        ])
        setProfile(profileResponse.data)
        setIsStravaConnected(!!stravaResponse.data)
      }

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('id, name, logo_url, description, cidade, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
      setRecentClubs(clubsData || [])

      // Runner count
      const { count: runners } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      setRunnerCount(runners || 0)

      if (user) {
        const { count: memberCount } = await supabase
          .from('club_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const { data: adminClubs } = await supabase
          .from('clubs')
          .select('id')
          .eq('admin_id', user.id)

        const { data: memberClubIds } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', user.id)

        const memberIdSet = new Set(memberClubIds?.map(m => m.club_id) || [])
        const adminOnly = adminClubs?.filter(c => !memberIdSet.has(c.id)).length || 0
        setMyClubCount((memberCount || 0) + adminOnly)
      }

      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-fuchsia-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-5 lg:px-8 pt-6 pb-6">

      {/* ─── Strava Connection Banner ─── */}
      {!isStravaConnected && (
        <Link to="/profile" className="block mb-6 animate-fade-in-up">
           <div className="bg-gradient-to-r from-[#FC4C02] to-[#E04400] rounded-2xl p-4 shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white overflow-hidden relative group">
             <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
             <div className="flex items-center gap-3 relative z-10">
               <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                 <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                   <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                 </svg>
               </div>
               <div>
                 <h3 className="font-bold text-sm leading-tight">Conecte seu Strava</h3>
                 <p className="text-[11px] font-medium text-white/80">Sincronize automicamente suas corridas.</p>
               </div>
             </div>
             <div className="flex items-center gap-1 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors relative z-10 w-max">
               Conectar agora <ArrowRight className="w-3.5 h-3.5" />
             </div>
           </div>
        </Link>
      )}

      {/* ─── Hero Greeting ─── */}
      <header className="mb-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-fuchsia-200/60 dark:bg-fuchsia-900/30 shadow-clay-sm dark:shadow-none dark:border dark:border-fuchsia-800/30 flex items-center justify-center">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-7 h-7 text-fuchsia-500 dark:text-fuchsia-400" />
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 mb-0.5 truncate">
              {greeting.emoji} {greeting.text}, {profile?.name || 'Corredor'}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Este é seu painel de corrida
            </h1>
          </div>
        </div>
      </header>

      {/* ─── Motivational Marquee ─── */}
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        <div className="bg-white/50 dark:bg-zinc-800/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-zinc-200/40 dark:border-zinc-700/30">
          <div className="flex overflow-hidden group" style={{ '--gap': '2rem' }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex shrink-0 items-center gap-16 py-2.5 pr-16 group-hover:[animation-play-state:paused]"
                style={{ animation: 'marquee 25s linear infinite' }}
              >
                {motivationalPhrases.map((phrase, j) => (
                  <span key={j} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {phrase}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Bento Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

        {/* Pace Card — tall */}
        <Link to="/profile" className="bg-fuchsia-200/80 dark:bg-fuchsia-950/50 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-fuchsia-900/30 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/20 dark:bg-fuchsia-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <Timer className="w-4 h-4 text-fuchsia-800 dark:text-fuchsia-300" />
            </div>
            <span className="text-[10px] font-bold text-fuchsia-800/70 dark:text-fuchsia-300/70 uppercase tracking-wider">Pace Médio</span>
          </div>
          <div className="mt-auto flex flex-col justify-end pt-4">
            {profile?.pace_medio && profile.pace_medio.includes(':') ? (
              <>
                <div className="flex items-baseline justify-between w-full border-b-2 border-fuchsia-900/10 dark:border-fuchsia-200/10 pb-1">
                  <span className="text-6xl lg:text-7xl font-black text-fuchsia-900 dark:text-fuchsia-200 tracking-tighter leading-none">
                    {profile.pace_medio.split(':')[0]}
                  </span>
                  <span className="text-xs font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase tracking-widest">Min</span>
                </div>
                <div className="flex items-baseline justify-between w-full pt-1">
                  <span className="text-5xl lg:text-6xl font-black text-fuchsia-900/60 dark:text-fuchsia-200/60 tracking-tighter leading-none">
                    {profile.pace_medio.split(':')[1]}
                  </span>
                  <span className="text-xs font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase tracking-widest">Seg</span>
                </div>
              </>
            ) : (
              <div className="flex items-baseline justify-between w-full">
                <span className="text-5xl font-black text-fuchsia-900 dark:text-fuchsia-200 tracking-tighter leading-none">
                  {profile?.pace_medio || '--:--'}
                </span>
                <span className="text-[10px] font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase">min/km</span>
              </div>
            )}
          </div>
        </Link>

        {/* Location Card */}
        <Link to="/profile" className="bg-pastel-green/60 dark:bg-green-950/50 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-green-900/30 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/20 dark:bg-green-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-800 dark:text-green-300" />
            </div>
            <span className="text-[10px] font-bold text-green-800/70 dark:text-green-300/70 uppercase tracking-wider">Cidade</span>
          </div>
          <div className="mt-auto">
            <span className="text-xl font-black text-green-900 dark:text-green-200 leading-tight">
              {profile?.cidade || 'Definir...'}
            </span>
          </div>
        </Link>

        {/* Meus Clubes Card */}
        <Link to="/clubs" className="bg-pastel-lavender/50 dark:bg-purple-950/40 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-purple-900/30 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/15 dark:bg-purple-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-purple-800 dark:text-purple-300" />
            </div>
            <span className="text-[10px] font-bold text-purple-800/70 dark:text-purple-300/70 uppercase tracking-wider">Meus Clubes</span>
          </div>
          <div className="mt-auto">
            <span className="text-5xl lg:text-6xl font-black text-purple-900 dark:text-purple-200 tracking-tighter leading-none">
              {myClubCount > 0 ? <NumberTicker value={myClubCount} /> : '0'}
            </span>
            <p className="text-[10px] text-purple-800/60 dark:text-purple-400/60 mt-0.5 font-medium">participando</p>
          </div>
        </Link>

        {/* Corredores Card */}
        <Link to="/runners" className="bg-pastel-peach/40 dark:bg-orange-950/30 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-orange-900/20 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/20 dark:bg-orange-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-orange-800 dark:text-orange-300" />
            </div>
            <span className="text-[10px] font-bold text-orange-800/70 dark:text-orange-300/70 uppercase tracking-wider">Corredores</span>
          </div>
          <div className="mt-auto">
            <span className="text-5xl lg:text-6xl font-black text-orange-900 dark:text-orange-200 tracking-tighter leading-none">
              {runnerCount > 0 ? <NumberTicker value={runnerCount} /> : '0'}
            </span>
            <p className="text-[10px] text-orange-800/60 dark:text-orange-400/60 mt-1 font-medium">na plataforma</p>
          </div>
        </Link>
      </div>

      {/* ─── CTA — Encontre sua tribo ─── */}
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-zinc-900 dark:bg-zinc-800/80 rounded-[1.6rem] p-5 shadow-xl dark:shadow-none dark:border dark:border-zinc-700/50 relative overflow-hidden group hover:bg-zinc-800 dark:hover:bg-zinc-700/80 transition-colors">
          <BorderBeam size={120} duration={8} colorFrom="#d946ef" colorTo="#86efac" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-green-400/20 flex items-center justify-center flex-shrink-0">
              <Compass className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm">Encontre sua tribo</h3>
              <p className="text-zinc-400 text-xs font-medium">Explore clubes e corredores na sua cidade</p>
            </div>
            <Link to="/clubs" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2.5 transition-colors flex-shrink-0">
              <span className="text-white text-xs font-bold">Explorar</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-3 gap-2.5 mb-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
        <Link
          to="/clubs/new"
          className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex flex-col items-center gap-2.5 hover:scale-[1.03] active:scale-[0.97] transition-all text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-pastel-green/40 dark:bg-green-900/30 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-green-700 dark:text-green-400" />
          </div>
          <p className="text-xs font-bold leading-tight">Criar<br/>Clube</p>
        </Link>
        <Link
          to="/runners"
          className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex flex-col items-center gap-2.5 hover:scale-[1.03] active:scale-[0.97] transition-all text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-pastel-peach/40 dark:bg-orange-900/30 flex items-center justify-center">
            <Search className="w-5 h-5 text-orange-700 dark:text-orange-400" />
          </div>
          <p className="text-xs font-bold leading-tight">Buscar<br/>Corredores</p>
        </Link>
        <Link
          to="/profile"
          className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex flex-col items-center gap-2.5 hover:scale-[1.03] active:scale-[0.97] transition-all text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-fuchsia-200/50 dark:bg-fuchsia-900/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-fuchsia-700 dark:text-fuchsia-400" />
          </div>
          <p className="text-xs font-bold leading-tight">Meu<br/>Perfil</p>
        </Link>
      </div>

      {/* ─── Recent Clubs ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold tracking-tight">Novos Clubes</h2>
          <Link to="/clubs" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-0.5">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-2.5 lg:grid lg:grid-cols-3 lg:gap-2.5 lg:space-y-0">
          {recentClubs.length === 0 ? (
            <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center col-span-3">
              <Users className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">Nenhum clube encontrado.</p>
              <Link to="/clubs/new" className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mt-2 inline-block hover:underline">Criar o primeiro →</Link>
            </div>
          ) : (
            recentClubs.map((club) => (
              <Link
                to={`/clubs/${club.id}`}
                key={club.id}
                className="flex items-center gap-3.5 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-3.5 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 hover:scale-[1.015] hover:shadow-clay dark:hover:bg-zinc-800/80 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-pastel-lavender/30 dark:bg-purple-900/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner dark:shadow-none">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-purple-800 dark:text-purple-300">{club.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{club.name}</h3>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{club.description}</p>
                  {club.cidade && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {club.cidade}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
