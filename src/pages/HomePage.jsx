import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Timer, MapPin, Users, ChevronRight, Sparkles, UserCircle, Compass, Trophy, ArrowRight, PlusCircle } from 'lucide-react'
import { Marquee } from '@/components/ui/marquee'
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

export function HomePage() {
  const [profile, setProfile] = useState(null)
  const [recentClubs, setRecentClubs] = useState([])
  const [clubCount, setClubCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('pace_medio, cidade, name')
          .eq('id', user.id)
          .single()
        setProfile(profileData)
      }

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4)
      setRecentClubs(clubsData || [])

      const { count } = await supabase
        .from('clubs')
        .select('*', { count: 'exact', head: true })
      setClubCount(count || 0)

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
    <div className="px-5 lg:px-8 pt-8 pb-4">
      {/* Greeting */}
      <header className="mb-8 animate-fade-in-up">
        <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 inline mr-1 text-fuchsia-400" />
          Olá, {profile?.name || 'Corredor'}
        </p>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
          Este é seu painel de corrida
        </h1>
      </header>

      {/* Motivational Marquee */}
      <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white/50 dark:bg-zinc-800/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-zinc-200/40 dark:border-zinc-700/30">
          <div className="flex overflow-hidden group" style={{ '--gap': '2rem' }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex shrink-0 items-center gap-16 py-3 pr-16 group-hover:[animation-play-state:paused]"
                style={{ animation: 'marquee 25s linear infinite' }}
              >
                {motivationalPhrases.map((phrase, j) => (
                  <span key={j} className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {phrase}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-3.5 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        {/* Pace Card */}
        <div className="bg-fuchsia-200/80 dark:bg-fuchsia-950/50 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-fuchsia-900/30 flex flex-col justify-between col-span-1 row-span-2 lg:col-span-1 lg:row-span-2 min-h-[160px] lg:min-h-[180px] relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/20 dark:bg-fuchsia-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <Timer className="w-4 h-4 text-fuchsia-800 dark:text-fuchsia-300" />
            </div>
            <span className="text-xs font-bold text-fuchsia-800/70 dark:text-fuchsia-300/70 uppercase tracking-wider">Pace Médio</span>
          </div>
          <div className="mt-auto flex flex-col justify-end pt-4">
            {profile?.pace_medio && profile.pace_medio.includes(':') ? (
              <>
                <div className="flex items-baseline justify-between w-full border-b-2 border-fuchsia-900/10 dark:border-fuchsia-200/10 pb-1">
                  <span className="text-7xl lg:text-[5rem] font-black text-fuchsia-900 dark:text-fuchsia-200 tracking-tighter leading-none">
                    {profile.pace_medio.split(':')[0]}
                  </span>
                  <span className="text-sm font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase tracking-widest">Min</span>
                </div>
                <div className="flex items-baseline justify-between w-full pt-1">
                  <span className="text-6xl lg:text-[4.5rem] font-black text-fuchsia-900/60 dark:text-fuchsia-200/60 tracking-tighter leading-none">
                    {profile.pace_medio.split(':')[1]}
                  </span>
                  <span className="text-sm font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase tracking-widest">Seg</span>
                </div>
              </>
            ) : (
              <div className="flex items-baseline justify-between w-full">
                <span className="text-6xl font-black text-fuchsia-900 dark:text-fuchsia-200 tracking-tighter leading-none">
                  {profile?.pace_medio || '--:--'}
                </span>
                <span className="text-xs font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase">min/km</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Location Card */}
        <div className="bg-pastel-green/60 dark:bg-green-950/50 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-green-900/30 flex flex-col justify-between col-span-1 row-span-1 lg:col-span-1 lg:row-span-1 aspect-square lg:aspect-auto lg:h-full relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/20 dark:bg-green-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-800 dark:text-green-300" />
            </div>
            <span className="text-xs font-bold text-green-800/70 dark:text-green-300/70 uppercase tracking-wider">Cidade</span>
          </div>
          <div className="mt-auto">
            <span className="text-2xl font-black text-green-900 dark:text-green-200 leading-tight">
              {profile?.cidade || 'Definir...'}
            </span>
          </div>
        </div>

        {/* Club Count Card with NumberTicker */}
        <div className="bg-pastel-lavender/50 dark:bg-purple-950/40 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-purple-900/30 flex flex-col justify-between col-span-1 row-span-1 lg:col-span-1 lg:row-span-1 aspect-square lg:aspect-auto lg:h-full relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/15 dark:bg-purple-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-purple-800 dark:text-purple-300" />
            </div>
            <span className="text-xs font-bold text-purple-800/70 dark:text-purple-300/70 uppercase tracking-wider">Clubes</span>
          </div>
          <div className="mt-auto">
            <span className="text-4xl font-black text-purple-900 dark:text-purple-200 tracking-tighter leading-none">
              {clubCount > 0 ? <NumberTicker value={clubCount} /> : '0'}
            </span>
            <p className="text-xs text-purple-800/60 dark:text-purple-400/60 mt-1 font-medium">ativos</p>
          </div>
        </div>

        {/* Aesthetic Typography Card */}
        <div className="bg-zinc-100 dark:bg-zinc-900/40 rounded-[1.6rem] shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-800/50 col-span-1 lg:col-span-1 lg:row-span-2 relative overflow-hidden group min-h-[160px] lg:min-h-[180px] flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 dark:opacity-10 rotate-12 scale-150 pointer-events-none">
            <div className="flex flex-col gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex whitespace-nowrap gap-4" style={{
                  animation: `marquee ${20 + (i % 3) * 5}s linear infinite`,
                  animationDirection: i % 2 === 0 ? 'normal' : 'reverse'
                }}>
                  {[...Array(8)].map((_, j) => (
                    <span key={j} className="text-4xl lg:text-5xl font-black text-zinc-900/40 dark:text-white/40 uppercase tracking-tighter">
                      Runner Hub
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 w-16 h-16 rounded-3xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md shadow-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
            <span className="text-2xl font-black bg-gradient-to-br from-fuchsia-500 to-green-400 bg-clip-text text-transparent">R</span>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="col-span-2 lg:col-span-2 lg:row-span-2 bg-zinc-900 dark:bg-zinc-800/80 rounded-[1.6rem] p-5 shadow-xl dark:shadow-none dark:border dark:border-zinc-700/50 flex flex-col justify-between relative overflow-hidden group hover:bg-zinc-800 dark:hover:bg-zinc-700/80 transition-colors min-h-[160px] lg:min-h-[180px]">
          <BorderBeam size={120} duration={8} colorFrom="#d946ef" colorTo="#86efac" />
          <div className="flex items-center gap-3 mb-3 lg:mb-0">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center">
              <Compass className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Encontre sua tribo</h3>
              <p className="text-zinc-400 text-xs font-medium">Explore clubes na sua cidade</p>
            </div>
          </div>
          <Link to="/clubs" className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 rounded-xl py-2.5 transition-colors mt-auto">
            <span className="text-white text-xs font-bold">Explorar Clubes</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <Link 
          to="/clubs/new" 
          className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-pastel-green/40 dark:bg-green-900/30 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-green-700 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-bold">Criar Clube</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Monte seu grupo</p>
          </div>
        </Link>
        <Link 
          to="/profile" 
          className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-fuchsia-200/50 dark:bg-fuchsia-900/30 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-fuchsia-700 dark:text-fuchsia-400" />
          </div>
          <div>
            <p className="text-sm font-bold">Meu Perfil</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Editar dados</p>
          </div>
        </Link>
      </div>

      {/* Recent Clubs */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-tight">Novos Clubes</h2>
          <Link to="/clubs" className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-1">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {recentClubs.length === 0 ? (
            <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center col-span-2">
              <Users className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">Nenhum clube encontrado.</p>
              <Link to="/clubs/new" className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mt-2 inline-block hover:underline">Criar o primeiro →</Link>
            </div>
          ) : (
            recentClubs.map((club) => (
              <Link 
                to={`/clubs/${club.id}`} 
                key={club.id} 
                className="flex items-center gap-4 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 hover:scale-[1.015] hover:shadow-clay dark:hover:bg-zinc-800/80 active:scale-[0.98] transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-pastel-lavender/30 dark:bg-purple-900/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner dark:shadow-none">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-purple-800 dark:text-purple-300">{club.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{club.name}</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{club.description}</p>
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
