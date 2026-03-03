import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, UserCircle, MapPin, Timer, Users } from 'lucide-react'

export function RunnersPage() {
  const [runners, setRunners] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)

  const fetchRunners = useCallback(async (term = '') => {
    setSearching(true)
    let query = supabase
      .from('profiles')
      .select('id, name, photo_url, pace_medio, cidade')
      .order('name', { ascending: true })
      .limit(40)

    if (term.trim()) {
      query = query.ilike('name', `%${term.trim()}%`)
    }

    const { data, error } = await query
    if (!error && data) {
      setRunners(data)
    }
    setSearching(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRunners()
  }, [fetchRunners])

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchRunners(search)
    }, 350)
    return () => clearTimeout(delay)
  }, [search, fetchRunners])

  return (
    <div className="px-5 lg:px-8 pt-8 pb-4 animate-fade-in-up">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Corredores
        </h1>
        <p className="text-zinc-400 dark:text-zinc-500 mt-1 text-sm font-medium">
          Encontre e conecte-se com outros corredores.
        </p>
      </header>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full h-12 pl-11 pr-4 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-700/50 rounded-2xl text-sm font-medium shadow-clay-sm dark:shadow-none focus:outline-none focus:ring-2 focus:ring-fuchsia-300/50 dark:focus:ring-fuchsia-500/30 transition-all dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-fuchsia-300 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {runners.length === 0 ? (
            <div className="col-span-2 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-8 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center">
              <Users className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500 text-sm font-bold mb-1">Nenhum corredor encontrado</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs">Tente outro termo de busca</p>
            </div>
          ) : (
            runners.map((runner) => (
              <Link
                key={runner.id}
                to={`/runners/${runner.id}`}
                className="flex items-center gap-4 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 hover:scale-[1.015] dark:hover:bg-zinc-800/80 active:scale-[0.98] transition-all"
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-fuchsia-200/40 dark:bg-fuchsia-900/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner dark:shadow-none">
                  {runner.photo_url ? (
                    <img src={runner.photo_url} alt={runner.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-7 h-7 text-fuchsia-400 dark:text-fuchsia-500" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-sm truncate">{runner.name || 'Corredor'}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {runner.cidade && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                        <MapPin className="w-3 h-3" />
                        {runner.cidade}
                      </span>
                    )}
                    {runner.pace_medio && (
                      <span className="flex items-center gap-1 text-xs text-fuchsia-600 dark:text-fuchsia-400 font-semibold">
                        <Timer className="w-3 h-3" />
                        {runner.pace_medio} min/km
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
