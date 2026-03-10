import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Gift, Plus, Award, Trophy, X, AlignLeft, Target, Edit, Trash2 } from 'lucide-react'

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

      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*, challenges(title)')
        .eq('club_id', clubId)

      if (rewardsError) {
        console.warn('Erro ao carregar prêmios:', rewardsError.message)
      }
      setRewards(rewardsData || [])
      setLoading(false)
    }
    fetchData()
  }, [clubId, navigate])

  const handleDeleteReward = async (e, rewardId) => {
    e.stopPropagation() // Prevent opening the modal
    if (!window.confirm('Tem certeza que deseja excluir este prêmio?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId)

      if (error) throw error

      setRewards(prev => prev.filter(r => r.id !== rewardId))
      // Use a toast if imported, otherwise alert
      alert('Prêmio excluído com sucesso!')
    } catch (err) {
      console.error('Erro ao excluir prêmio:', err)
      alert('Erro ao excluir prêmio.')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-5 pt-8 pb-12 animate-in fade-in duration-500">
      <button
        onClick={() => navigate(`/clubs/${clubId}`)}
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o Clube
      </button>

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Prêmios</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Explore o catálogo de recompensas disponíveis.</p>
        </div>
        {isAdmin && (
          <Link
            to={`/clubs/${clubId}/rewards/new`}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Novo Prêmio
          </Link>
        )}
      </div>

      {/* Rewards List */}
      {rewards.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 border border-zinc-200 dark:border-zinc-800 text-center shadow-sm">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Sem prêmios no catálogo</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 max-w-sm mx-auto">
            Nenhuma recompensa foi cadastrada neste clube ainda.
          </p>
          {isAdmin && (
            <Link to={`/clubs/${clubId}/rewards/new`} className="inline-flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
              Cadastrar o primeiro prêmio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 text-left transition-all hover:shadow-md hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30 flex flex-col gap-5"
            >
              <div className="flex items-center gap-4">
                {reward.image_url ? (
                  <img
                    src={reward.image_url}
                    alt={reward.title}
                    className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-zinc-100 dark:bg-zinc-800"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-100 dark:border-fuchsia-500/20 flex-shrink-0">
                    <Award className="w-8 h-8 text-fuchsia-500" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white truncate group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">{reward.title}</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800 w-fit">
                      <Trophy className="w-3.5 h-3.5" />
                      {reward.monthly_limit || 10} disp./mês
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          alert('Em breve! Edição será implementada na próxima atualização.')
                        }}
                        className="p-1.5 text-zinc-400 hover:text-fuchsia-600 dark:text-zinc-500 dark:hover:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteReward(e, reward.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {reward.challengeTitles.length > 0 && (
                <div className="pt-5 mt-auto border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">Desafios Vinculados</p>
                  <div className="flex flex-wrap gap-2">
                    {reward.challengeTitles.map((title, idx) => (
                      <span key={idx} className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Reward Details Modal */}
      {selectedReward && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedReward(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200/50 dark:border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Header / Cover */}
            <div className="relative h-56 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              {selectedReward.image_url ? (
                <img src={selectedReward.image_url} alt={selectedReward.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20">
                  <Award className="w-20 h-20 text-fuchsia-200 dark:text-fuchsia-800/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button
                onClick={() => setSelectedReward(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-5 left-6 right-6">
                <span className="inline-block mb-2 bg-fuchsia-500 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">
                  Recompensa
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-sm">{selectedReward.title}</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {selectedReward.description && (
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                    <AlignLeft className="w-4 h-4" /> Detalhes do Prêmio
                  </h4>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedReward.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Mensal
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {selectedReward.monthly_limit || 10} <span className="text-sm font-medium text-zinc-500">disp.</span>
                  </p>
                </div>
              </div>

              {selectedReward.challengeTitles && selectedReward.challengeTitles.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                    <Target className="w-4 h-4" /> Desafios
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReward.challengeTitles.map((title, idx) => (
                      <span key={idx} className="bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedReward(null)}
                className="bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
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
