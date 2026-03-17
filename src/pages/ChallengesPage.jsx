import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchWithAuth } from '../lib/api'
import { Check, X, ArrowLeft, Target, Calendar, Zap, RefreshCw, Trophy, Plus, Clock, TrendingUp, Gift, Award, ChevronDown, ChevronUp, AlignLeft, Edit, Trash2, Save } from 'lucide-react'
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
  
  const [challengeToDelete, setChallengeToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [challengeToEdit, setChallengeToEdit] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [eligibleChallenges, setEligibleChallenges] = useState(new Set())

  const { toast } = useToast()

  const isAdmin = currentUser && club && currentUser.id === club.admin_id

  useEffect(() => {
    if (isRewardModalOpen || selectedReward || challengeToDelete || challengeToEdit) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isRewardModalOpen, selectedReward, challengeToDelete, challengeToEdit])

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

      // Buscar desafios já completados pelo usuário
      if (user) {
        const { data: participantsData } = await supabase
          .from('challenge_participants')
          .select('challenge_id, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
        
        if (participantsData && participantsData.length > 0) {
          // Preencher syncResults com desafios completados
          const completedResults = {}
          participantsData.forEach(participant => {
            const challenge = challengesData?.find(c => c.id === participant.challenge_id)
            if (challenge) {
              completedResults[participant.challenge_id] = {
                challengeCompleted: true,
                message: "Desafio concluído!",
                failureReason: null,
                progressPercent: 100,
                challengeType: challenge.challenge_type,
                activityDistanceKm: challenge.target_value,
                requiredDistanceKm: challenge.target_value,
                activityPaceFormatted: '--:--',
                requiredPaceFormatted: challenge.challenge_type === 'pace' ? formatPace(challenge.target_value * 60) : '--:--',
              }
            }
          })
          setSyncResults(completedResults)
        }

        // Verificar desafios elegíveis (não resgatados mas que cumprem critérios)
        try {
          const activitiesResponse = await fetchWithAuth(`/api/strava/activities?userId=${user.id}&count=30`);
          if (activitiesResponse.ok || (activitiesResponse.status >= 200 && activitiesResponse.status < 300)) {
            let activities = [];
            if (activitiesResponse.json) {
              activities = await activitiesResponse.json();
            } else if (activitiesResponse.data) {
              activities = activitiesResponse.data;
            }
            if (Array.isArray(activities)) {
              const elegiveis = new Set()
              
              challengesData?.forEach(challenge => {
                // Pular se já foi resgatado
                if (participantsData?.some(p => p.challenge_id === challenge.id)) return
                
                const startDateStr = new Date(challenge.start_date).toISOString().split('T')[0]
                const endDateStr = new Date(challenge.end_date).toISOString().split('T')[0]
                const challengeStart = new Date(startDateStr + 'T00:00:00Z')
                const challengeEnd = new Date(endDateStr + 'T23:59:59Z')

                const activitiesInDate = activities.filter(a => {
                  const aDate = new Date(a.startDate)
                  return aDate >= challengeStart && aDate <= challengeEnd
                })

                if (activitiesInDate.length === 0) return

                // Verificar critérios
                let isEligible = false
                if (challenge.challenge_type === 'distance' || challenge.challenge_type === 'corrida') {
                  const maxDistance = Math.max(...activitiesInDate.map(a => a.distanceKm || 0))
                  isEligible = maxDistance >= challenge.target_value
                } else if (challenge.challenge_type === 'pace') {
                  const validPaces = activitiesInDate.filter(a => a.paceSecPerKm > 0).map(a => a.paceSecPerKm)
                  if (validPaces.length > 0) {
                    const bestPace = Math.min(...validPaces)
                    isEligible = bestPace <= (challenge.target_value * 60)
                  }
                }

                if (isEligible) {
                  elegiveis.add(challenge.id)
                }
              })
              
              setEligibleChallenges(elegiveis)
            }
          }
        } catch (err) {
          console.error('Erro ao verificar elegibilidade:', err)
        }
      }

      setLoading(false)
    }
    fetchData()
  }, [clubId, navigate])

  const toggleRewards = (challengeId) => {
    setExpandedRewards(prev => ({ ...prev, [challengeId]: !prev[challengeId] }))
  }

  const rewardsForChallenge = (challengeId) =>
    rewards.filter(r => r.challenge_id === challengeId)

  const formatPace = (paceSecPerKm) => {
    if (!paceSecPerKm) return '--:--'
    const mins = Math.floor(paceSecPerKm / 60)
    const secs = Math.round(paceSecPerKm % 60)
    return `${mins}:${secs.toString().padStart(2, '0')} /km`
  }

  const sincronizarDesafio = async (challengeId) => {
    setSyncingId(challengeId)
    try {
      const challenge = challenges.find(c => c.id === challengeId)
      if (!challenge) throw new Error('Desafio não encontrado')

      // 1. Tentar ingressar/sincronizar no Strava backend (opcional, mantendo compatibilidade)
      const joinResponse = await fetchWithAuth(`/api/challenges/${challengeId}/join?userId=${currentUser?.id}`, {
        method: 'POST',
      })
      if (joinResponse.status === 404) {
        toast.error('Strava não conectado. Por favor, acesse seu Perfil para conectar.')
        setSyncingId(null)
        return
      }
      if (joinResponse.status === 401) {
        toast.error('Sua sessão expirou ou o token é inválido.')
        setSyncingId(null)
        return
      }

      // 2. Buscar atividades do Strava para validar o desafio
      const activitiesResponse = await fetchWithAuth(`/api/strava/activities?userId=${currentUser?.id}&count=30`);
      if (activitiesResponse.status === 401) {
        toast.error("Sua sessão expirou ou o token é inválido.");
        setSyncingId(null)
        return;
      }

      let activities = [];
      if (activitiesResponse.json) {
        activities = await activitiesResponse.json();
      } else if (activitiesResponse.data) {
        activities = activitiesResponse.data;
      }
      if (!Array.isArray(activities)) activities = [];

      // 3. Lógica de Validação Front-end
      const startDateStr = new Date(challenge.start_date).toISOString().split('T')[0]
      const endDateStr = new Date(challenge.end_date).toISOString().split('T')[0]
      const challengeStart = new Date(startDateStr + 'T00:00:00Z')
      const challengeEnd = new Date(endDateStr + 'T23:59:59Z')

      const activitiesInDate = activities.filter(a => {
        const aDate = new Date(a.startDate)
        return aDate >= challengeStart && aDate <= challengeEnd
      })

      let challengeCompleted = false;
      let failureReason = "Nenhuma atividade atingiu a meta.";
      let bestActivity = null;
      let maxProgressDistance = 0;
      let bestPaceFound = Infinity;

      if (challenge.challenge_type === 'distance' || challenge.challenge_type === 'corrida') {
        activitiesInDate.forEach(a => {
          if (a.distanceKm > maxProgressDistance) maxProgressDistance = a.distanceKm;
          if (a.distanceKm >= challenge.target_value) {
            challengeCompleted = true;
            if (!bestActivity || a.distanceKm > bestActivity.distanceKm) {
              bestActivity = a;
            }
          }
        });
      } else if (challenge.challenge_type === 'pace') {
        activitiesInDate.forEach(a => {
          if (a.paceSecPerKm > 0) {
            if (a.paceSecPerKm < bestPaceFound) bestPaceFound = a.paceSecPerKm;
            if (a.paceSecPerKm <= (challenge.target_value * 60)) {
              challengeCompleted = true;
              if (!bestActivity || a.paceSecPerKm < bestActivity.paceSecPerKm) {
                bestActivity = a;
              }
            }
          }
        });
      }

      let progressPercent = 0;
      if (challengeCompleted) {
        progressPercent = 100;
        failureReason = null;
      } else {
        if (activitiesInDate.length === 0) {
          failureReason = "Nenhuma atividade encontrada no período do desafio.";
        } else if (challenge.challenge_type === 'distance' || challenge.challenge_type === 'corrida') {
          progressPercent = (maxProgressDistance / challenge.target_value) * 100;
        } else if (challenge.challenge_type === 'pace') {
          if (bestPaceFound !== Infinity) {
            const diff = bestPaceFound - (challenge.target_value * 60);
            progressPercent = Math.max(0, 100 - (diff / 60) * 10);
          }
        }
      }

      const resultado = {
        challengeCompleted,
        message: challengeCompleted ? "Desafio concluído com sucesso!" : null,
        failureReason,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
        challengeType: challenge.challenge_type,
        activityDistanceKm: bestActivity ? bestActivity.distanceKm : maxProgressDistance.toFixed(2),
        requiredDistanceKm: challenge.target_value,
        activityPaceFormatted: bestActivity ? formatPace(bestActivity.paceSecPerKm) : (bestPaceFound !== Infinity ? formatPace(bestPaceFound) : '--:--'),
        requiredPaceFormatted: challenge.challenge_type === 'pace' ? formatPace(challenge.target_value * 60) : '--:--',
      };

      setSyncResults(prev => ({
        ...prev,
        [challengeId]: resultado
      }))

      if (challengeCompleted) {
        // 4. Persistir no backend criando challenge_participant diretamente
        try {
          // Inserir ou atualizar na tabela challenge_participants
          const { error: participantError } = await supabase
            .from('challenge_participants')
            .upsert({
              challenge_id: challengeId,
              user_id: currentUser?.id,
              status: 'completed'
            }, { onConflict: 'challenge_id,user_id' })
          
          if (participantError) {
            console.error('Erro ao salvar participante:', participantError)
          } else {
            // 5. Resgatar automaticamente os prêmios vinculados ao desafio
            const challengeRewards = rewards.filter(r => r.challenge_id === challengeId)
            
            if (challengeRewards.length > 0) {
              const rewardInserts = challengeRewards.map(reward => ({
                reward_id: reward.id,
                user_id: currentUser?.id,
                proof_type: 'strava_sync',
                proof_url: null
              }))
              
              const { error: rewardError } = await supabase
                .from('reward_history')
                .insert(rewardInserts)
              
              if (rewardError) {
                console.error('Erro ao resgatar prêmios:', rewardError)
                toast.success("🏆 Parabéns! Desafio concluído e salvo!");
              } else {
                toast.success(`🏆 Parabéns! Desafio concluído e ${challengeRewards.length} prêmio(s) resgatado(s)!`);
              }
            } else {
              toast.success("🏆 Parabéns! Desafio concluído e salvo!");
            }
          }
        } catch (syncErr) {
          console.error('Erro ao persistir:', syncErr);
          toast.success("🏆 Parabéns! Desafio concluído!");
        }
      } else {
        toast.error(resultado.failureReason || "Meta ainda não atingida.");
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

  const confirmDeleteChallenge = (challengeId) => setChallengeToDelete(challengeId)

  const handleDeleteChallenge = async () => {
    if (!challengeToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeToDelete)

      if (error) throw error

      setChallenges(prev => prev.filter(c => c.id !== challengeToDelete))
      toast.success('Desafio excluído com sucesso!')
      setChallengeToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir desafio:', err)
      toast.error('Erro ao excluir desafio.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!challengeToEdit.title || !challengeToEdit.target_value || !challengeToEdit.start_date || !challengeToEdit.end_date) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    setIsEditing(true)
    try {
      const { data, error } = await supabase
        .from('challenges')
        .update({
          title: challengeToEdit.title,
          challenge_type: challengeToEdit.challenge_type,
          target_value: parseFloat(challengeToEdit.target_value),
          start_date: challengeToEdit.start_date,
          end_date: challengeToEdit.end_date,
        })
        .eq('id', challengeToEdit.id)
        .select()
        .single()

      if (error) throw error

      setChallenges(prev => prev.map(c => c.id === challengeToEdit.id ? data : c))
      toast.success('Desafio atualizado com sucesso!')
      setChallengeToEdit(null)
    } catch (err) {
      console.error('Erro ao atualizar desafio:', err)
      toast.error('Erro ao atualizar desafio.')
    } finally {
      setIsEditing(false)
    }
  }

  const uniqueRewards = Array.from(new Map(rewards.map(r => [r.title, r])).values())

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
        <ArrowLeft className="w-4 h-4" /> {club?.name || 'Voltar'}
      </button>

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">Desafios</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Sincronize corridas e conquiste prêmios.</p>
        </div>
        {isAdmin && (
          <Link
            to={`/clubs/${clubId}/challenges/new`}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Novo Desafio
          </Link>
        )}
      </div>

      {/* Challenges List */}
      {challenges.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 border border-zinc-200 dark:border-zinc-800 text-center shadow-sm">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Sem desafios criados</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 max-w-sm mx-auto">
            Nenhum desafio foi criado neste clube ainda.
          </p>
          {isAdmin && (
            <Link to={`/clubs/${clubId}/challenges/new`} className="inline-flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
              Criar o primeiro desafio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {[...challenges]
            .sort((a, b) => {
              // Ordenar: elegíveis primeiro, depois por data de término
              const aEligible = eligibleChallenges.has(a.id) || syncResults[a.id]?.challengeCompleted
              const bEligible = eligibleChallenges.has(b.id) || syncResults[b.id]?.challengeCompleted
              
              if (aEligible && !bEligible) return -1
              if (!aEligible && bEligible) return 1
              
              // Se ambos têm mesmo status, ordenar por data de término (mais próximo primeiro)
              return new Date(a.end_date) - new Date(b.end_date)
            })
            .map((challenge) => {
            const active = isActive(challenge)
            const isRedeemed = syncResults[challenge.id]?.challengeCompleted
            const isEligible = eligibleChallenges.has(challenge.id) && !isRedeemed
            return (
              <div
                key={challenge.id}
                className={`bg-white dark:bg-zinc-900 border rounded-3xl p-6 transition-all hover:shadow-md flex flex-col ${
                  isRedeemed 
                    ? 'border-emerald-400 dark:border-emerald-500/50 ring-2 ring-emerald-100 dark:ring-emerald-900/30' 
                    : isEligible
                    ? 'border-amber-400 dark:border-amber-500/50 ring-2 ring-amber-100 dark:ring-amber-900/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30'
                }`}
              >
                {/* Status Badge & Admin Actions */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider ${active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20' : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-700/50'}`}>
                      <Target className="w-3.5 h-3.5" />
                      {active ? 'Ativo' : 'Encerrado'}
                    </div>
                    {isEligible && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                        <Gift className="w-3 h-3" />
                        Pode Resgatar
                      </div>
                    )}
                    {isRedeemed && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3" />
                        Resgatado
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          onClick={() => {
                            setChallengeToEdit({
                              ...challenge,
                              start_date: challenge.start_date.substring(0, 10),
                              end_date: challenge.end_date.substring(0, 10)
                            })
                          }}
                          className="p-1.5 text-zinc-400 hover:text-fuchsia-600 dark:text-zinc-500 dark:hover:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteChallenge(challenge.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold uppercase tracking-wider">{typeLabel(challenge.challenge_type)}</span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-5">{challenge.title}</h3>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4 text-fuchsia-500" />
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {challenge.target_value} <span className="text-zinc-500 text-xs font-medium">{typeUnit(challenge.challenge_type)}</span>
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 text-fuchsia-500" />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white text-center leading-tight">
                      {new Date(challenge.start_date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} <br />
                      <span className="text-zinc-400">até</span> <br />
                      {new Date(challenge.end_date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                    </span>
                  </div>
                </div>

                {/* Rewards Toggle */}
                <div className="mt-auto">
                {(() => {
                  const challengeRewards = rewardsForChallenge(challenge.id)
                  const isExpanded = expandedRewards[challenge.id]
                  return (
                    <div className="mb-4">
                      <button
                        onClick={() => toggleRewards(challenge.id)}
                        className="w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold px-5 py-3 rounded-2xl transition-all active:scale-[0.99]"
                      >
                        <span className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-fuchsia-500" />
                          {challengeRewards.length > 0
                            ? `${challengeRewards.length} Prêmio${challengeRewards.length > 1 ? 's' : ''}`
                            : 'Prêmios (0)'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          {challengeRewards.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-6 text-center">
                              <Gift className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Nenhum prêmio vinculado.</p>
                              {isAdmin && active && (
                                <button
                                  onClick={() => openRewardModal(challenge)}
                                  className="text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-700 dark:hover:text-fuchsia-300 transition-colors mt-1"
                                >
                                  Adicionar prêmio
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-left">
                              {challengeRewards.map(reward => (
                                <button
                                  key={reward.id}
                                  onClick={() => setSelectedReward(reward)}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                                >
                                  {reward.image_url ? (
                                    <img
                                      src={reward.image_url}
                                      alt={reward.title}
                                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-500/10 flex items-center justify-center flex-shrink-0 border border-fuchsia-100/50 dark:border-fuchsia-500/20">
                                      <Award className="w-5 h-5 text-fuchsia-500" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0 flex flex-col">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">{reward.title}</p>
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                      {reward.monthly_limit || 10} disp./mês
                                    </p>
                                  </div>
                                  <Trophy className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-fuchsia-500 transition-colors flex-shrink-0" />
                                </button>
                              ))}
                              {isAdmin && active && (
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 flex justify-center border-t border-zinc-100 dark:border-zinc-800">
                                  <button
                                    onClick={() => openRewardModal(challenge)}
                                    className="flex items-center gap-1.5 text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-700 dark:hover:text-fuchsia-300 transition-colors bg-fuchsia-50 dark:bg-fuchsia-500/10 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-500/20 px-4 py-2 rounded-lg"
                                  >
                                    <Plus className="w-4 h-4" /> Adicionar
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
                    <div className="mb-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Progresso Atual</span>
                        <span className="text-sm font-bold text-fuchsia-600 dark:text-fuchsia-400">
                          {result.progressPercent !== undefined ? `${Math.round(result.progressPercent)}%` : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 mb-4 overflow-hidden">
                        <div 
                          className="bg-fuchsia-500 h-2 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${Math.min(Math.max(result.progressPercent || 0, 0), 100)}%` }}
                        ></div>
                      </div>
                      
                      {result.challengeType === 'corrida' && (
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 text-center mb-1">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.activityDistanceKm || 0} km</span> de <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.requiredDistanceKm} km</span>
                        </p>
                      )}
                      
                      {result.challengeType === 'pace' && (
                        <div className="flex justify-around items-center text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          <div className="text-center">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">Seu Pace</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.activityPaceFormatted || '--:--'}</span>
                          </div>
                          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700"></div>
                          <div className="text-center">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">Meta</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{result.requiredPaceFormatted || '--:--'}</span>
                          </div>
                        </div>
                      )}

                      {!result.challengeCompleted && result.failureReason && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl border border-red-100 dark:border-red-500/20 text-center">
                          {result.failureReason}
                        </div>
                      )}
                      {result.challengeCompleted && (
                        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-center flex items-center justify-center gap-1.5">
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
                    disabled={syncingId === challenge.id || syncResults[challenge.id]?.challengeCompleted}
                    className={`w-full flex items-center justify-center gap-2 text-white text-sm font-semibold px-5 py-3.5 rounded-2xl shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      syncResults[challenge.id]?.challengeCompleted 
                        ? 'bg-emerald-500 hover:bg-emerald-600' 
                        : 'bg-fuchsia-600 hover:bg-fuchsia-700 active:scale-[0.99]'
                    }`}
                  >
                    {syncingId === challenge.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Sincronizando...
                      </>
                    ) : syncResults[challenge.id]?.challengeCompleted ? (
                      <>
                        <Check className="w-4 h-4" /> Desafio Resgatado
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" /> Sincronizar e Resgatar
                      </>
                    )}
                  </button>
                )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Reward Modal */}
      {isRewardModalOpen && selectedChallengeForReward && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsRewardModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-[2rem] p-7 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 border border-zinc-200/50 dark:border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsRewardModalOpen(false)}
              className="absolute top-5 right-5 p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-100 dark:border-fuchsia-500/20">
                <Gift className="w-6 h-6 text-fuchsia-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Adicionar Prêmio</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-[220px] truncate">Desafio: {selectedChallengeForReward.title}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Option 1: Create New */}
              <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Opção 1: Criar novo prêmio</p>
                <Link
                  to={`/clubs/${clubId}/rewards/new?challenge=${selectedChallengeForReward.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium px-4 py-3 rounded-xl transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Criar Novo Prêmio
                </Link>
              </div>

              {/* Option 2: Reuse Existing */}
              <div className="p-5 bg-fuchsia-50/50 dark:bg-fuchsia-500/5 rounded-2xl border border-fuchsia-100 dark:border-fuchsia-500/20">
                <p className="text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-200 mb-3">Opção 2: Reutilizar existente</p>
                <form onSubmit={handleAddExistingReward} className="space-y-3">
                  <select
                    value={selectedExistingRewardId}
                    onChange={(e) => setSelectedExistingRewardId(e.target.value)}
                    className="w-full rounded-xl h-11 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 dark:text-zinc-100"
                  >
                    <option value="">Selecione um prêmio...</option>
                    {uniqueRewards.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!selectedExistingRewardId || isAddingExistingReward}
                    className="w-full flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isAddingExistingReward ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Vincular Selecionado
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
                  Prêmio
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

      {/* Delete Challenge Modal */}
      {challengeToDelete && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isDeleting && setChallengeToDelete(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-[2rem] p-7 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 border border-zinc-200/50 dark:border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4 border border-red-100 dark:border-red-500/20">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Excluir Desafio?</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Tem certeza que deseja excluir este desafio? Todos os prêmios vinculados e seu progresso serão perdidos permanentemente.
              </p>
              
              <div className="w-full flex gap-3">
                <button
                  onClick={() => setChallengeToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteChallenge}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Sim, excluir'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Challenge Modal */}
      {challengeToEdit && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isEditing && setChallengeToEdit(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-[2rem] p-7 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 border border-zinc-200/50 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => !isEditing && setChallengeToEdit(null)}
              className="absolute top-5 right-5 p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-100 dark:border-fuchsia-500/20">
                <Edit className="w-6 h-6 text-fuchsia-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Editar Desafio</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Atualize os dados abaixo.</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Título</label>
                <input
                  type="text"
                  value={challengeToEdit.title}
                  onChange={e => setChallengeToEdit({...challengeToEdit, title: e.target.value})}
                  className="w-full rounded-2xl h-11 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 dark:text-white transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Tipo</label>
                  <select
                    value={challengeToEdit.challenge_type}
                    onChange={e => setChallengeToEdit({...challengeToEdit, challenge_type: e.target.value})}
                    className="w-full rounded-2xl h-11 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 dark:text-white transition-all"
                  >
                    <option value="distance">Distância (km)</option>
                    <option value="pace">Pace (min/km)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Meta</label>
                  <input
                    type="number"
                    step="0.1"
                    value={challengeToEdit.target_value}
                    onChange={e => setChallengeToEdit({...challengeToEdit, target_value: e.target.value})}
                    className="w-full rounded-2xl h-11 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 dark:text-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Início</label>
                  <input
                    type="date"
                    value={challengeToEdit.start_date}
                    onChange={e => setChallengeToEdit({...challengeToEdit, start_date: e.target.value})}
                    className="w-full rounded-2xl h-11 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 dark:text-white transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Fim</label>
                  <input
                    type="date"
                    value={challengeToEdit.end_date}
                    onChange={e => setChallengeToEdit({...challengeToEdit, end_date: e.target.value})}
                    className="w-full rounded-2xl h-11 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 dark:text-white transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isEditing}
                className="w-full flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold px-4 py-3.5 rounded-2xl transition-all disabled:opacity-50 mt-4 shadow-sm"
              >
                {isEditing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Salvar Alterações
                  </>
                )}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
