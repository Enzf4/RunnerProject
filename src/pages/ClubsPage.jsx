import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Users, ChevronRight, Search, PlusCircle } from 'lucide-react'

export function ClubsPage() {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchClubs() {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false })
        
      if (!error && data) {
        setClubs(data)
      }
      setLoading(false)
    }
    fetchClubs()
  }, [])

  const filtered = clubs.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-5 pt-8 pb-4 animate-fade-in-up">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Clubes</h1>
        <p className="text-zinc-400 mt-1 text-sm font-medium">Encontre comunidades de corrida na sua cidade.</p>
      </header>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clubes..."
          className="w-full h-12 pl-11 pr-4 bg-white/70 backdrop-blur-sm border border-zinc-200/60 rounded-2xl text-sm font-medium shadow-clay-sm focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 focus:border-pastel-lavender transition-all"
        />
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-pastel-lavender border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-sm rounded-[1.6rem] p-8 shadow-clay-sm text-center">
              <Users className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
              <p className="text-zinc-500 text-sm font-bold mb-1">Nenhum clube encontrado</p>
              <p className="text-zinc-400 text-xs mb-4">Que tal criar o primeiro?</p>
              <Link 
                to="/clubs/new" 
                className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Criar Clube
              </Link>
            </div>
          ) : (
            filtered.map((club, i) => (
              <Link 
                key={club.id} 
                to={`/clubs/${club.id}`}
                className="flex items-center gap-4 bg-white/70 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm hover:scale-[1.015] hover:shadow-clay active:scale-[0.98] transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-pastel-green/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-xl text-green-800">{club.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-sm truncate">{club.name}</h2>
                  <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{club.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
