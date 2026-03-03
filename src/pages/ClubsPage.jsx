import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Users, ChevronRight, Search, PlusCircle, Star, Crown, Check, MapPin } from 'lucide-react'
import { CitySelect } from '../components/CitySelect'

export function ClubsPage() {
  const [clubs, setClubs] = useState([])
  const [myClubs, setMyClubs] = useState([])
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [cityFilter, setCityFilter] = useState('')

  // Fetch user's clubs (member + admin)
  useEffect(() => {
    async function fetchMyClubs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Clubs the user is a member of
      const { data: memberData } = await supabase
        .from('club_members')
        .select(`
          clubs (
            id,
            name,
            logo_url,
            description,
            admin_id
          )
        `)
        .eq('user_id', user.id)

      const memberClubs = memberData?.map(m => m.clubs).filter(Boolean) || []

      // Clubs the user created (admin)
      const { data: adminClubs } = await supabase
        .from('clubs')
        .select('id, name, logo_url, description, admin_id')
        .eq('admin_id', user.id)

      // Merge without duplicates
      const allMyClubs = [...memberClubs]
      if (adminClubs) {
        for (const ac of adminClubs) {
          if (!allMyClubs.find(c => c.id === ac.id)) {
            allMyClubs.push(ac)
          }
        }
      }

      setMyClubs(allMyClubs)
    }
    fetchMyClubs()
  }, [])

  const fetchClubs = useCallback(async (term = '', city = '') => {
    setSearching(true)
    let query = supabase
      .from('clubs')
      .select('id, name, logo_url, description, cidade')
      .order('created_at', { ascending: false })

    if (term.trim()) {
      query = query.ilike('name', `%${term.trim()}%`)
    }
    if (city.trim()) {
      query = query.ilike('cidade', `%${city.trim()}%`)
    }

    const { data, error } = await query
    if (!error && data) {
      setClubs(data)
    }
    setSearching(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClubs()
  }, [fetchClubs])

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchClubs(search, cityFilter)
    }, 350)
    return () => clearTimeout(delay)
  }, [search, cityFilter, fetchClubs])

  const ClubCard = ({ club, showBadge = false }) => (
    <Link 
      key={club.id} 
      to={`/clubs/${club.id}`}
      className="flex items-center gap-4 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 hover:scale-[1.015] dark:hover:bg-zinc-800/80 active:scale-[0.98] transition-all"
    >
      <div className="w-14 h-14 rounded-2xl bg-pastel-green/30 dark:bg-green-900/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner dark:shadow-none">
        {club.logo_url ? (
          <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-black text-xl text-green-800 dark:text-green-300">{club.name.charAt(0)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-sm truncate">{club.name}</h2>
          {showBadge && userId && club.admin_id === userId ? (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
              <Crown className="w-2.5 h-2.5" /> Admin
            </span>
          ) : showBadge ? (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
              <Check className="w-2.5 h-2.5" /> Membro
            </span>
          ) : null}
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{club.description}</p>
        {club.cidade && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400 mt-1">
            <MapPin className="w-2.5 h-2.5" /> {club.cidade}
          </span>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
    </Link>
  )

  return (
    <div className="px-5 lg:px-8 pt-8 pb-4 animate-fade-in-up">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Clubes</h1>
        <p className="text-zinc-400 dark:text-zinc-500 mt-1 text-sm font-medium">Encontre comunidades de corrida na sua cidade.</p>
      </header>

      {/* My Clubs Section */}
      {myClubs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-fuchsia-200/50 dark:bg-fuchsia-900/40 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-fuchsia-700 dark:text-fuchsia-300" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Meus Clubes</h2>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 rounded-full">{myClubs.length}</span>
          </div>
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {myClubs.map((club) => (
              <ClubCard key={club.id} club={club} showBadge />
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clubes..."
          className="w-full h-12 pl-11 pr-4 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-700/50 rounded-2xl text-sm font-medium shadow-clay-sm dark:shadow-none focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 dark:focus:ring-purple-500/30 transition-all dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* City Filter */}
      <div className="mb-6">
        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider ml-1 mb-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Filtrar por cidade
        </label>
        <CitySelect
          value={cityFilter}
          onChange={setCityFilter}
          placeholder="Todas as cidades..."
        />
      </div>

      {/* All Clubs heading */}
      {myClubs.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-pastel-green/50 dark:bg-green-900/40 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-green-700 dark:text-green-300" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Todos os Clubes</h2>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-pastel-lavender border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {clubs.length === 0 ? (
            <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-8 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center">
              <Users className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500 text-sm font-bold mb-1">Nenhum clube encontrado</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-4">Que tal criar o primeiro?</p>
              <Link 
                to="/clubs/new" 
                className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold px-5 py-2.5 rounded-full hover:bg-zinc-800 dark:hover:bg-white transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Criar Clube
              </Link>
            </div>
          ) : (
            clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
