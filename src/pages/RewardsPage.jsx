import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Gift, Plus, Award, Trophy, X, AlignLeft, Target } from 'lucide-react'

export function RewardsPage() {
  const { id: clubId } = useParams()
  const navigate = useNavigate()
  const [rewards, setRewards] = useState([])
  const [club, setClub] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedReward, setSelectedReward] = useState(null)

  const isAdmin = currentUser && club && currentUser.id === club.admin_id

  useEffect(() => {
    if (selectedReward) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedReward])

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      const { data: clubData } = await supabase
        .from('clubs')
        .select('id, name, admin_id')
        .eq('id', clubId)
        .single()

      if (!clubData) { navigate('/clubs'); return }
      setClub(clubData)

      // Fetch rewards with challenge title if possible
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select(`
          *,
          challenges ( title )
        `)
        .eq('club_id', clubId)

      if (rewardsError) {
        console.warn('Erro ao carregar prêmios:', rewardsError.message)
      }
      setRewards(rewardsData || [])
      setLoading(false)
    }
    fetchData()
  }, [clubId, navigate])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-pastel-lavender border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-5 pt-6 pb-4 animate-fade-in-up">
      <button
        onClick={() => navigate(`/clubs/${clubId}`)}
        className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {club?.name || 'Voltar'}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Prêmios</h1>
          <p className="text-zinc-400 dark:text-zinc-500 mt-1 text-sm font-medium">Veja as recompensas disponíveis.</p>
        </div>
        {isAdmin && (
          <Link
            to={`/clubs/${clubId}/rewards/new`}
            className="flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold px-4 py-2.5 rounded-full shadow-xl transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Criar
          </Link>
        )}
      </div>

      {/* Rewards List */}
      {rewards.length === 0 ? (
        <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-8 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center">
          <Gift className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">Nenhum prêmio cadastrado ainda.</p>
          {isAdmin && (
            <Link to={`/clubs/${clubId}/rewards/new`} className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mt-2 inline-block hover:underline">
              Cadastrar prêmio →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(
            rewards.reduce((acc, reward) => {
              if (!acc[reward.title]) {
                acc[reward.title] = {
                  ...reward,
                  challengeTitles: reward.challenges?.title ? [reward.challenges.title] : []
                }
              } else {
                if (reward.challenges?.title && !acc[reward.title].challengeTitles.includes(reward.challenges.title)) {
                  acc[reward.title].challengeTitles.push(reward.challenges.title)
                }
              }
              return acc
            }, {})
          ).map((reward) => (
            <button
              key={reward.id}
              onClick={() => setSelectedReward(reward)}
              className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 relative overflow-hidden flex items-center gap-4 text-left transition-transform active:scale-[0.98] hover:bg-white/90 dark:hover:bg-zinc-800/80"
            >
              {reward.image_url ? (
                <img
                  src={reward.image_url}
                  alt={reward.title}
                  className="w-16 h-16 rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Award className="w-8 h-8 text-amber-500" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate">{reward.title}</h3>
                {reward.challengeTitles.length > 0 && (
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    Desafios: <span className="text-amber-600 dark:text-amber-400">{reward.challengeTitles.join(' • ')}</span>
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                  <Trophy className="w-3.5 h-3.5" />
                  Limite: {reward.monthly_limit || 10}/mês
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Reward Details Modal */}
      {selectedReward && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedReward(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden w-full max-w-md shadow-2xl relative animate-fade-in-up flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header / Cover */}
            <div className="relative h-48 bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
              {selectedReward.image_url ? (
                <img src={selectedReward.image_url} alt={selectedReward.title} className="w-full h-full object-cover" />
              ) : (
                <Award className="w-16 h-16 text-amber-400 dark:text-amber-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={() => setSelectedReward(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <h2 className="text-2xl font-extrabold text-white leading-tight drop-shadow-md">{selectedReward.title}</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto">
              {selectedReward.description && (
                <div className="mb-6">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    <AlignLeft className="w-3.5 h-3.5" /> Sobre o prêmio
                  </h4>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedReward.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-[1.2rem] p-4 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Limite Mensal
                  </p>
                  <p className="text-lg font-black text-amber-900 dark:text-amber-400">{selectedReward.monthly_limit || 10}</p>
                </div>
              </div>

              {selectedReward.challengeTitles && selectedReward.challengeTitles.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
                    <Target className="w-3.5 h-3.5" /> Desafios Vinculados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReward.challengeTitles.map((title, idx) => (
                      <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-lg">
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedReward(null)}
                className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold px-6 py-2.5 rounded-xl transition-all active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
