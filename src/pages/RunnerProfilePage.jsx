import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { UserCircle, MapPin, Timer, Users, ArrowLeft, ChevronRight, Crown, Check } from 'lucide-react'

export function RunnerProfilePage() {
  const { id } = useParams()
  const [runner, setRunner] = useState(null)
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [averagePace, setAveragePace] = useState(null)

  useEffect(() => {
    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          photo_url,
          pace_medio,
          cidade,
          bio,
          club_members (
            clubs (
              id,
              name,
              logo_url,
              description
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setRunner(data)

      // Clubs from membership
      const memberClubs = data.club_members?.map(cm => ({
        ...cm.clubs,
        role: 'member'
      })).filter(Boolean) || []

      // Clubs where user is admin
      const { data: adminClubs } = await supabase
        .from('clubs')
        .select('id, name, logo_url, description')
        .eq('admin_id', id)

      const memberIds = new Set(memberClubs.map(c => c.id))
      const adminOnly = (adminClubs || [])
        .filter(c => !memberIds.has(c.id))
        .map(c => ({ ...c, role: 'admin' }))

      // Mark admin role on member clubs too
      const adminIdSet = new Set((adminClubs || []).map(c => c.id))
      const allClubs = memberClubs.map(c => ({
        ...c,
        role: adminIdSet.has(c.id) ? 'admin' : 'member'
      }))

      setClubs([...allClubs, ...adminOnly])
      
      // Fetch average pace from Strava backend
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (token) {
          const response = await fetch(`https://api-projetointegrador-kmmg.onrender.com/api/Strava/average-pace?userId=${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data && data.averagePace) {
              setAveragePace(data.averagePace)
            }
          }
        }
      } catch (err) {
        console.error('Erro ao buscar pace médio do Strava para o corredor:', err)
      }

      setLoading(false)
    }
    fetchProfile()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-fuchsia-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound || !runner) return (
    <div className="px-5 lg:px-8 pt-8 pb-4 animate-fade-in-up text-center">
      <UserCircle className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
      <h1 className="text-2xl font-extrabold mb-2">Corredor não encontrado</h1>
      <p className="text-zinc-400 dark:text-zinc-500 text-sm mb-6">Este perfil não existe ou foi removido.</p>
      <Link to="/runners" className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold px-6 py-3 rounded-full hover:bg-zinc-800 dark:hover:bg-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>
    </div>
  )

  return (
    <div className="px-5 lg:px-8 pt-8 pb-4 animate-fade-in-up">
      {/* Back Link */}
      <Link
        to="/runners"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Corredores
      </Link>

      {/* Profile Card */}
      <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.8rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 mb-4">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-[1.2rem] bg-fuchsia-200/40 dark:bg-fuchsia-900/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner dark:shadow-none">
            {runner.photo_url ? (
              <img src={runner.photo_url} alt={runner.name} className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-10 h-10 text-fuchsia-400 dark:text-fuchsia-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold truncate">{runner.name || 'Corredor'}</h1>
            {runner.cidade && (
              <p className="text-sm text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> {runner.cidade}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {runner.bio && (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-700/50 pt-4">
            {runner.bio}
          </p>
        )}
      </div>

      {/* Stats Chips */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-fuchsia-200/60 dark:bg-fuchsia-950/40 rounded-[1.2rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-fuchsia-900/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/50 dark:bg-white/10 flex items-center justify-center">
            <Timer className="w-4 h-4 text-fuchsia-700 dark:text-fuchsia-300" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-fuchsia-700/60 dark:text-fuchsia-400/60 uppercase tracking-wider">Pace</p>
            <p className="text-lg font-black text-fuchsia-900 dark:text-fuchsia-200 leading-none">
              {averagePace || runner.pace_medio || '--:--'}
            </p>
          </div>
        </div>
        <div className="bg-pastel-lavender/40 dark:bg-purple-950/40 rounded-[1.2rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-purple-900/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/50 dark:bg-white/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-700 dark:text-purple-300" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-700/60 dark:text-purple-400/60 uppercase tracking-wider">Clubes</p>
            <p className="text-lg font-black text-purple-900 dark:text-purple-200 leading-none">{clubs.length}</p>
          </div>
        </div>
      </div>

      {/* Clubs Section */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight mb-4">
          Clubes {runner.name?.split(' ')[0] ? `de ${runner.name.split(' ')[0]}` : ''}
        </h2>

        {clubs.length === 0 ? (
          <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-8 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center">
            <Users className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">
              Este corredor ainda não faz parte de nenhum clube.
            </p>
          </div>
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {clubs.map((club) => (
              <Link
                key={club.id}
                to={`/clubs/${club.id}`}
                className="flex items-center gap-4 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 hover:scale-[1.015] dark:hover:bg-zinc-800/80 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-pastel-lavender/30 dark:bg-purple-900/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner dark:shadow-none">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-purple-800 dark:text-purple-300">
                      {club.name?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm truncate">{club.name}</h3>
                    {club.role === 'admin' ? (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                        <Crown className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                        <Check className="w-2.5 h-2.5" /> Membro
                      </span>
                    )}
                  </div>
                  {club.description && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{club.description}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
