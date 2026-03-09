import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchWithAuth } from '../lib/api'
import { Check, X, ArrowLeft, Target, Calendar, Zap, RefreshCw, Trophy, Plus, Clock, TrendingUp, Gift, Award, ChevronDown, ChevronUp, AlignLeft } from 'lucide-react'
import { useToast } from '../components/Toast'

export function ChallengesPage() {
  const { id: clubId } = useParams()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [rewards, setRewards] = useState([])
  const [club, setClub] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncingId, setSyncingId] = useState(null)
  const [syncResults, setSyncResults] = useState({})
  const [expandedRewards, setExpandedRewards] = useState({})
  
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
  const [selectedChallengeForReward, setSelectedChallengeForReward] = useState(null)
  const [selectedExistingRewardId, setSelectedExistingRewardId] = useState('')
  const [isAddingExistingReward, setIsAddingExistingReward] = useState(false)
  
  const [selectedReward, setSelectedReward] = useState(null)

  const { toast } = useToast()

  const isAdmin = currentUser && club && currentUser.id === club.admin_id

  useEffect(() => {
    if (isRewardModalOpen || selectedReward) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isRewardModalOpen, selectedReward])

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

      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('club_id', clubId)

      if (challengesError) {
        console.warn('Erro ao carregar desafios (tabela pode não existir):', challengesError.message)
      }
      setChallenges(challengesData || [])

      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .eq('club_id', clubId)

      if (rewardsError) {
        console.warn('Erro ao carregar prêmios:', rewardsError.message)
      }
      setRewards(rewardsData || [])
      setLoading(false)
    }
    fetchData()
  }, [clubId, navigate])

  const toggleRewards = (challengeId) => {
    setExpandedRewards(prev => ({ ...prev, [challengeId]: !prev[challengeId] }))
  }

  const rewardsForChallenge = (challengeId) =>
    rewards.filter(r => r.challenge_id === challengeId)

  const sincronizarDesafio = async (challengeId) => {
    setSyncingId(challengeId)
    try {
      // 1. Ingressar/Sincronizar corridas mais recentes no período do desafio
      const joinResponse = await fetchWithAuth(`/api/challenges/${challengeId}/join?userId=${currentUser?.id}`, {
        method: 'POST',
      })
      if (joinResponse.status === 404) {
        toast.error('Strava não conectado. Por favor, acesse seu Perfil para conectar.')
        return
      }
      if (joinResponse.status === 401) {
        toast.error('Sua sessão expirou ou o token é inválido.')
        return
      }

      // 2. Validar desafio
      const response = await fetchWithAuth(`/api/challenges/${challengeId}/sync?userId=${currentUser?.id}&recentCount=30`, {
        method: 'POST',
      })

      if (response.status === 401) {
        toast.error("Sua sessão expirou ou o token é inválido.");
        return;
      }

      // No axios o dado vem já em formato JSON dentro de response.data (se houver conteúdo)
      const resultado = response.data || {};

      // 3. Registrar progresso detalhado
      setSyncResults(prev => ({
        ...prev,
        [challengeId]: resultado
      }))

      if (response.status >= 200 && response.status < 300) {
        if (resultado.challengeCompleted) {
          toast.success("🏆 " + (resultado.message || "Parabéns! Desafio concluído!"));
        } else {
          toast.error(resultado.failureReason || resultado.message || "Meta ainda não atingida.");
        }
      } else {
        toast.error(resultado.error || "Erro ao sincronizar desafio.");
      }
    } catch (error) {
      console.error('Erro na sincronização', error)
      toast.error('Erro de conexão ao sincronizar.')
    } finally {
      setSyncingId(null)
    }
  }

  const typeLabel = (type) => {
    switch (type) {
      case 'distance': return 'Distância'
      case 'pace': return 'Pace'
      default: return type
    }
  }

  const typeUnit = (type) => {
    switch (type) {
      case 'distance': return 'km'
      case 'pace': return 'min/km'
      default: return ''
    }
  }

  const isActive = (challenge) => {
    const now = new Date()
    return new Date(challenge.start_date) <= now && now <= new Date(challenge.end_date)
  }

  const openRewardModal = (challenge) => {
    setSelectedChallengeForReward(challenge)
    setIsRewardModalOpen(true)
  }

  const handleAddExistingReward = async (e) => {
    e.preventDefault()
    if (!selectedExistingRewardId || !selectedChallengeForReward) {
      toast.error('Selecione um prêmio.')
      return
    }

    const rewardToCopy = rewards.find(r => r.id === selectedExistingRewardId)
    if (!rewardToCopy) return
    
    setIsAddingExistingReward(true)
    try {
      const { data: newReward, error } = await supabase
        .from('rewards')
        .insert([{
          club_id: clubId,
          challenge_id: selectedChallengeForReward.id,
          title: rewardToCopy.title,
          description: rewardToCopy.description,
          monthly_limit: rewardToCopy.monthly_limit,
          image_url: rewardToCopy.image_url,
        }])
        .select('*')
        .single()

      if (error) throw error

      setRewards(prev => [...prev, newReward])
      toast.success('Prêmio vinculado com sucesso!')
      setIsRewardModalOpen(false)
      setSelectedChallengeForReward(null)
      setSelectedExistingRewardId('')
    } catch(err) {
      toast.error('Erro ao adicionar prêmio: ' + err.message)
    } finally {
      setIsAddingExistingReward(false)
    }
  }

  const uniqueRewards = Array.from(new Map(rewards.map(r => [r.title, r])).values())

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
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Desafios</h1>
          <p className="text-zinc-400 dark:text-zinc-500 mt-1 text-sm font-medium">Sincronize corridas e conquiste prêmios.</p>
        </div>
        {isAdmin && (
          <Link
            to={`/clubs/${clubId}/challenges/new`}
            className="flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold px-4 py-2.5 rounded-full shadow-xl transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Criar
          </Link>
        )}
      </div>

      {/* Challenges List */}
      {challenges.length === 0 ? (
        <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-8 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center">
          <Target className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">Nenhum desafio criado ainda.</p>
          {isAdmin && (
            <Link to={`/clubs/${clubId}/challenges/new`} className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mt-2 inline-block hover:underline">
              Criar o primeiro →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => {
            const active = isActive(challenge)
            return (
              <div
                key={challenge.id}
                className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 relative overflow-hidden"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? 'bg-green-200/60 dark:bg-green-900/40' : 'bg-zinc-200/60 dark:bg-zinc-700/40'}`}>
                      <Target className={`w-4 h-4 ${active ? 'text-green-700 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${active ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500'}`}>
                      {active ? 'Ativo' : 'Encerrado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">{typeLabel(challenge.challenge_type)}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 mb-2">{challenge.title}</h3>

                {/* Stats Row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-pastel-lavender/30 dark:bg-purple-900/30 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-purple-700 dark:text-purple-400" />
                    <span className="text-xs font-black text-purple-900 dark:text-purple-200">
                      {challenge.target_value} {typeUnit(challenge.challenge_type)}
                    </span>
                  </div>
                  <div className="bg-pastel-peach/30 dark:bg-orange-900/30 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-orange-700 dark:text-orange-400" />
                    <span className="text-[11px] font-semibold text-orange-900 dark:text-orange-200">
                      {new Date(challenge.start_date).toLocaleDateString('pt-BR')} — {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Rewards Toggle */}
                {(() => {
                  const challengeRewards = rewardsForChallenge(challenge.id)
                  const isExpanded = expandedRewards[challenge.id]
                  return (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleRewards(challenge.id)}
                        className="w-full flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 text-amber-800 dark:text-amber-400 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all active:scale-[0.98]"
                      >
                        <span className="flex items-center gap-2">
                          <Gift className="w-4 h-4" />
                          {challengeRewards.length > 0
                            ? `${challengeRewards.length} Prêmio${challengeRewards.length > 1 ? 's' : ''}`
                            : 'Prêmios'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 rounded-2xl overflow-hidden border border-amber-100 dark:border-amber-900/30">
                          {challengeRewards.length === 0 ? (
                            <div className="flex flex-col items-center gap-1.5 py-5 bg-amber-50/60 dark:bg-amber-950/10">
                              <Gift className="w-6 h-6 text-amber-300 dark:text-amber-700" />
                              <p className="text-xs font-medium text-amber-600 dark:text-amber-500">Nenhum prêmio vinculado a este desafio.</p>
                              {isAdmin && active && (
                                <button
                                  onClick={() => openRewardModal(challenge)}
                                  className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline mt-1"
                                >
                                  Adicionar prêmio →
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
                              {challengeRewards.map(reward => (
                                <button
                                  key={reward.id}
                                  onClick={() => setSelectedReward(reward)}
                                  className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50/60 dark:bg-amber-950/10 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors active:bg-amber-100 dark:active:bg-amber-900/40"
                                >
                                  {reward.image_url ? (
                                    <img
                                      src={reward.image_url}
                                      alt={reward.title}
                                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-amber-200/50 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                                      <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{reward.title}</p>
                                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-500">
                                      Limite: {reward.monthly_limit || 10}/mês
                                    </p>
                                  </div>
                                  <Trophy className="w-4 h-4 text-amber-400 dark:text-amber-500 flex-shrink-0" />
                                </button>
                              ))}
                              {isAdmin && active && (
                                <div className="p-3 bg-amber-50/40 dark:bg-amber-950/5 flex justify-center border-t border-amber-100 dark:border-amber-900/30">
                                  <button
                                    onClick={() => openRewardModal(challenge)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors bg-white/50 dark:bg-black/20 px-4 py-2 rounded-xl shadow-sm hover:shadow"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Adicionar Prêmio
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Sync Progress Details */}
                {(() => {
                  const result = syncResults[challenge.id]
                  if (!result) return null;
                  
                  return (
                    <div className="mb-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200/60 dark:border-zinc-700/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Progresso Atual</span>
                        <span className="text-xs font-black text-fuchsia-600 dark:text-fuchsia-400">
                          {result.progressPercent !== undefined ? `${Math.round(result.progressPercent)}%` : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5 mb-3 overflow-hidden">
                        <div 
                          className="bg-fuchsia-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${Math.min(Math.max(result.progressPercent || 0, 0), 100)}%` }}
                        ></div>
                      </div>
                      
                      {result.challengeType === 'corrida' && (
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 text-center mb-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.activityDistanceKm || 0} km</span> percorridos de <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.requiredDistanceKm} km</span>
                        </p>
                      )}
                      
                      {result.challengeType === 'pace' && (
                        <div className="flex justify-around items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          <div className="text-center">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold">Seu Melhor Pace</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.activityPaceFormatted || '--:--'}/km</span>
                          </div>
                          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700"></div>
                          <div className="text-center">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold">Meta Máxima</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.requiredPaceFormatted || '--:--'}/km</span>
                          </div>
                        </div>
                      )}

                      {!result.challengeCompleted && result.failureReason && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl border border-red-100 dark:border-red-900/30 text-center">
                          {result.failureReason}
                        </div>
                      )}
                      {result.challengeCompleted && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-xl border border-green-100 dark:border-green-900/30 text-center flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" /> {result.message || 'Desafio Concluído!'}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Sync Button */}
                {active && (
                  <button
                    onClick={() => sincronizarDesafio(challenge.id)}
                    disabled={syncingId === challenge.id}
                    className="w-full flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 active:scale-[0.98] text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl transition-all disabled:opacity-60"
                  >
                    {syncingId === challenge.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" /> Sincronizar Corridas e Resgatar
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Reward Modal */}
      {isRewardModalOpen && selectedChallengeForReward && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsRewardModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsRewardModalOpen(false)}
              className="absolute top-5 right-5 p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Adicionar Prêmio</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Desafio: {selectedChallengeForReward.title}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Option 1: Create New */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Opção 1: Criar novo prêmio</p>
                <Link
                  to={`/clubs/${clubId}/rewards/new?challenge=${selectedChallengeForReward.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4" /> Criar Prêmio
                </Link>
              </div>

              {/* Option 2: Reuse Existing */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">Opção 2: Reutilizar prêmio existente</p>
                <form onSubmit={handleAddExistingReward} className="space-y-3">
                  <select
                    value={selectedExistingRewardId}
                    onChange={(e) => setSelectedExistingRewardId(e.target.value)}
                    className="w-full rounded-xl h-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-zinc-100"
                  >
                    <option value="">Selecione um prêmio...</option>
                    {uniqueRewards.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!selectedExistingRewardId || isAddingExistingReward}
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isAddingExistingReward ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Vincular este Prêmio
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
                <span className="inline-block mt-2 bg-black/30 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                  Prêmio
                </span>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-[1.2rem] p-4 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Limite Mensal
                  </p>
                  <p className="text-lg font-black text-amber-900 dark:text-amber-400">{selectedReward.monthly_limit || 10}</p>
                </div>
              </div>
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
