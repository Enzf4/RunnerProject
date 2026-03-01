import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Timer, MapPin, Users, ChevronRight, Sparkles } from 'lucide-react'

export function HomePage() {
  const [profile, setProfile] = useState(null)
  const [recentClubs, setRecentClubs] = useState([])
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
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-pastel-lavender border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-5 pt-8 pb-4 animate-fade-in-up">
      {/* Greeting */}
      <header className="mb-8">
        <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 inline mr-1 text-pastel-peach" />
          Olá, {profile?.name || 'Corredor'}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 leading-tight">
          Seu painel de<br />corrida
        </h1>
      </header>
      
      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 gap-3.5 mb-8">
        {/* Pace Card */}
        <div className="bg-pastel-blue/60 rounded-[1.6rem] p-5 shadow-clay-sm flex flex-col justify-between aspect-square relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/20 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 flex items-center justify-center">
              <Timer className="w-4 h-4 text-blue-800" />
            </div>
            <span className="text-xs font-bold text-blue-800/70 uppercase tracking-wider">Pace Médio</span>
          </div>
          <div className="mt-auto">
            <span className="text-4xl font-black text-blue-900 tracking-tighter leading-none">
              {profile?.pace_medio || '--:--'}
            </span>
            <p className="text-xs text-blue-800/60 mt-1 font-medium">min/km</p>
          </div>
        </div>
        
        {/* Location Card */}
        <div className="bg-pastel-peach/60 rounded-[1.6rem] p-5 shadow-clay-sm flex flex-col justify-between aspect-square relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/20 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-orange-800" />
            </div>
            <span className="text-xs font-bold text-orange-800/70 uppercase tracking-wider">Cidade</span>
          </div>
          <div className="mt-auto">
            <span className="text-2xl font-black text-orange-900 leading-tight">
              {profile?.cidade || 'Definir...'}
            </span>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="col-span-2 bg-zinc-900 rounded-[1.6rem] p-5 shadow-xl flex items-center justify-between group hover:bg-zinc-800 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pastel-lavender/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-pastel-lavender" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Encontre sua tribo</h3>
              <p className="text-zinc-400 text-xs font-medium">Explore clubes perto de você</p>
            </div>
          </div>
          <Link to="/clubs" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ChevronRight className="w-5 h-5 text-white" />
          </Link>
        </div>
      </div>

      {/* Recent Clubs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-tight">Novos Clubes</h2>
          <Link to="/clubs" className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {recentClubs.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-sm rounded-[1.6rem] p-6 shadow-clay-sm text-center">
              <Users className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
              <p className="text-zinc-400 text-sm font-medium">Nenhum clube encontrado.</p>
              <Link to="/clubs/new" className="text-xs font-bold text-zinc-900 mt-2 inline-block hover:underline">Criar o primeiro →</Link>
            </div>
          ) : (
            recentClubs.map((club, i) => (
              <Link 
                to={`/clubs/${club.id}`} 
                key={club.id} 
                className="flex items-center gap-4 bg-white/70 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm hover:scale-[1.015] hover:shadow-clay active:scale-[0.98] transition-all"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-pastel-lavender/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-purple-800">{club.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{club.name}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{club.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
