import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Target, Timer, ArrowUp, ArrowDown, ChevronRight, UserCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export function TelaRanking({ clubId }) {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [criterioAtivo, setCriterioAtivo] = useState('premios') // 'premios', 'desafios', 'pace'

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true)
      try {
        let query = supabase
          .from('vw_club_ranking')
          .select('*')
          .eq('club_id', clubId)

        if (criterioAtivo === 'premios') {
          query = query
            .order('total_premios', { ascending: false })
            .order('total_premios', { ascending: false }) // Critério secundário idêntico para manter estabilidade
        } else if (criterioAtivo === 'desafios') {
          query = query
            .order('total_desafios', { ascending: false })
            .order('total_premios', { ascending: false })
        } else if (criterioAtivo === 'pace') {
          // Pace crescente = menor valor é melhor (mais rápido)
          query = query
            .order('pace_medio_min_km', { ascending: true, nullsFirst: false })
            .order('total_premios', { ascending: false })
        }

        const { data, error } = await query

        if (error) throw error
        const rows = data || []
        if (rows.length === 0) {
          setRanking([])
          setLoading(false)
          return
        }

        const userIds = [...new Set(rows.map(r => r.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds)

        const nameById = {}
        profiles?.forEach(p => { nameById[p.id] = p.name || null })

        const enriched = rows.map(r => ({
          ...r,
          displayName: nameById[r.user_id] || r.full_name || 'Corredor'
        }))
        setRanking(enriched)
      } catch (error) {
        console.error('Erro ao buscar o ranking:', error.message)
      } finally {
        setLoading(false)
      }
    }

    if (clubId) fetchRanking()
  }, [clubId, criterioAtivo])

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-amber-800/70 dark:text-amber-400/70">Ranking do Clube</h2>
      </div>

      <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl mb-5">
        <button
          onClick={() => setCriterioAtivo('premios')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            criterioAtivo === 'premios'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" /> Prêmios
        </button>
        <button
          onClick={() => setCriterioAtivo('desafios')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            criterioAtivo === 'desafios'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" /> Desafios
        </button>
        <button
          onClick={() => setCriterioAtivo('pace')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            criterioAtivo === 'pace'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Timer className="w-3.5 h-3.5" /> Pace
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ranking.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Trophy className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <p className="text-zinc-400 dark:text-zinc-500 text-xs font-medium">Nenhum dado no ranking ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((row, index) => {
            let valorCriterio = row.total_premios
            let labelCriterio = 'prêmios'
            if (criterioAtivo === 'desafios') {
              valorCriterio = row.total_desafios
              labelCriterio = 'desafios'
            } else if (criterioAtivo === 'pace') {
              valorCriterio = row.pace_medio_min_km ? row.pace_medio_min_km : '--'
              labelCriterio = 'min/km'
            }

            return (
              <Link
                key={row.user_id}
                to={`/runners/${row.user_id}`}
                className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-50/50 hover:bg-zinc-100 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/80 border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm shadow-sm ${
                  index === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                  index === 1 ? 'bg-zinc-200 text-zinc-600 border border-zinc-300' :
                  index === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                  'bg-white dark:bg-zinc-700 text-zinc-400 dark:text-zinc-400 font-bold border border-zinc-200 dark:border-zinc-700'
                }`}>
                  #{index + 1}
                </div>
                
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {row.photo_url ? (
                    <img 
                      src={row.photo_url} 
                      alt={row.displayName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : (
                    <UserCircle className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-amber-600 transition-colors">
                    {row.displayName}
                  </p>
                </div>

                <div className="flex items-end flex-col justify-center">
                  <span className="text-lg font-black text-zinc-900 dark:text-white leading-none">
                    {valorCriterio}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-1">
                    {labelCriterio}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
