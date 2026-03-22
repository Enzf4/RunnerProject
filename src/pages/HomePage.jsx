import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Timer, MapPin, Users, ChevronRight, UserCircle, Compass, Trophy, ArrowRight, PlusCircle, Search, Zap, Target, Gift } from 'lucide-react'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import { fetchWithAuth } from '../lib/api'
import { CreatePost } from '../components/CreatePost'
import { useToast } from '../components/Toast'

const motivationalPhrases = [
  "Cada quilômetro conta 🏃",
  "Seu pace, suas regras ⚡",
  "Juntos corremos mais longe 🤝",
  "A cidade é sua pista 🌆",
  "Supere seus limites 💪",
  "Correr é meditar em movimento 🧘",
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return { text: 'Boa madrugada', emoji: '🌙' }
  if (h < 12) return { text: 'Bom dia', emoji: '☀️' }
  if (h < 18) return { text: 'Boa tarde', emoji: '🌤️' }
  return { text: 'Boa noite', emoji: '🌙' }
}

export function HomePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [recentClubs, setRecentClubs] = useState([])
  const [myClubs, setMyClubs] = useState([])
  const [myClubCount, setMyClubCount] = useState(0)
  const [myRanks, setMyRanks] = useState([])
  const [inviteCount, setInviteCount] = useState(0)
  const [runnerCount, setRunnerCount] = useState(0)
  const [isStravaConnected, setIsStravaConnected] = useState(true) // assume true to prevent flash
  const [recentActivities, setRecentActivities] = useState([])
  const [stravaAveragePace, setStravaAveragePace] = useState(null)
  const [eligibleChallenges, setEligibleChallenges] = useState([])
  const [isPaceFromStrava, setIsPaceFromStrava] = useState(false)
  const [loading, setLoading] = useState(true)
  const [challenges, setChallenges] = useState([])
  const { toast } = useToast()
  const greeting = getGreeting()

  useEffect(() => {
    async function loadData() {
      let hasStrava = false
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const [profileResponse, stravaResponse] = await Promise.all([
          supabase.from('profiles').select('pace_medio, cidade, name, photo_url').eq('id', user.id).single(),
          supabase.from('user_strava_tokens').select('user_id').eq('user_id', user.id).maybeSingle()
        ])
        setProfile(profileResponse.data)
        
        hasStrava = !!stravaResponse.data;
        setIsStravaConnected(hasStrava)

        if (hasStrava) {
          try {
            const activitiesRes = await fetchWithAuth(`/api/strava/activities?userId=${user.id}&count=3`);
            if (activitiesRes.ok || (activitiesRes.status >= 200 && activitiesRes.status < 300)) {
              let acts = [];
              if (activitiesRes.json) {
                acts = await activitiesRes.json();
              } else if (activitiesRes.data) {
                acts = activitiesRes.data;
              }
              if (Array.isArray(acts)) {
                setRecentActivities(acts);
                // Se tem atividades do Strava, calcular pace médio
                if (acts.length > 0) {
                  setIsPaceFromStrava(true);
                  const validPaces = acts
                    .filter(a => a.paceSecPerKm && a.paceSecPerKm > 0)
                    .map(a => a.paceSecPerKm);
                  if (validPaces.length > 0) {
                    const avgPaceSec = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;
                    const mins = Math.floor(avgPaceSec / 60);
                    const secs = Math.round(avgPaceSec % 60);
                    setStravaAveragePace(`${mins}:${secs.toString().padStart(2, '0')}`);
                  }
                }
              }
            }
          } catch(err) {
            console.error('Erro ao buscar atividades recentes:', err);
          }
        }
      }

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('id, name, logo_url, description, cidade, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
      setRecentClubs(clubsData || [])

      // Runner count
      const { count: runners } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      setRunnerCount(runners || 0)

      if (user) {
        const { data: memberRows } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', user.id)
          .eq('status', 'active')

        const { count: pendingInvites } = await supabase
          .from('club_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'invited')
        setInviteCount(pendingInvites || 0)

        const { data: adminClubs } = await supabase
          .from('clubs')
          .select('id, name, logo_url')
          .eq('admin_id', user.id)

        const clubIds = new Set(memberRows?.map(m => m.club_id) || [])
        adminClubs?.forEach(c => clubIds.add(c.id))
        setMyClubCount(clubIds.size)

        if (clubIds.size > 0) {
          const { data: clubsData } = await supabase
            .from('clubs')
            .select('id, name, logo_url')
            .in('id', [...clubIds])
          const list = clubsData || []
          setMyClubs(list)

          // Buscar desafios dos clubes do usuário
          const { data: challengesData } = await supabase
            .from('challenges')
            .select('id, title')
            .in('club_id', [...clubIds])
          setChallenges(challengesData || [])

          // Buscar desafios ativos dos clubes do usuário
          const { data: activeChallengesData } = await supabase
            .from('challenges')
            .select('*, clubs(name, logo_url)')
            .in('club_id', [...clubIds])
            .lte('start_date', new Date().toISOString())
            .gte('end_date', new Date().toISOString())
          
          if (activeChallengesData && hasStrava) {
            // Buscar desafios já resgatados pelo usuário
            const { data: redeemedChallenges } = await supabase
              .from('challenge_participants')
              .select('challenge_id')
              .eq('user_id', user.id)
              .eq('status', 'completed')
            
            const redeemedChallengeIds = new Set(redeemedChallenges?.map(r => r.challenge_id) || [])

            // Buscar atividades do Strava
            try {
              const activitiesRes = await fetchWithAuth(`/api/strava/activities?userId=${user.id}&count=30`);
              if (activitiesRes.ok) {
                let acts = [];
                if (activitiesRes.json) {
                  acts = await activitiesRes.json();
                } else if (activitiesRes.data) {
                  acts = activitiesRes.data;
                }
                if (Array.isArray(acts)) {
                  // Verificar quais desafios podem ser completados (e ainda não foram resgatados)
                  const eligible = activeChallengesData.filter(challenge => {
                    // Pular se já foi resgatado
                    if (redeemedChallengeIds.has(challenge.id)) return false
                    
                    const startDate = new Date(challenge.start_date)
                    const endDate = new Date(challenge.end_date)
                    
                    // Verificar se há atividades no período do desafio
                    const activitiesInRange = acts.filter(a => {
                      const aDate = new Date(a.startDate)
                      return aDate >= startDate && aDate <= endDate
                    })
                    
                    if (activitiesInRange.length === 0) return false
                    
                    // Verificar critérios do desafio
                    if (challenge.challenge_type === 'distance' || challenge.challenge_type === 'corrida') {
                      const maxDistance = Math.max(...activitiesInRange.map(a => a.distanceKm || 0))
                      return maxDistance >= challenge.target_value
                    } else if (challenge.challenge_type === 'pace') {
                      const bestPace = Math.min(...activitiesInRange.filter(a => a.paceSecPerKm > 0).map(a => a.paceSecPerKm))
                      return bestPace <= (challenge.target_value * 60)
                    }
                    return false
                  }).slice(0, 3) // Limitar a 3 desafios
                  
                  setEligibleChallenges(eligible)
                }
              }
            } catch(err) {
              console.error('Erro ao verificar desafios elegíveis:', err);
            }
          }
        }
      }

      setLoading(false)
    }
    loadData()
  }, [])

  // Buscar posição do usuário nos rankings dos clubes em que participa (por pace - menor = melhor)
  useEffect(() => {
    if (!userId || myClubs.length === 0) {
      setMyRanks([])
      return
    }

    async function fetchRanks() {
      const results = []

      // limitar a alguns clubes para manter performático
      for (const club of myClubs.slice(0, 3)) {
        const { data, error } = await supabase
          .from('vw_club_ranking')
          .select('user_id')
          .eq('club_id', club.id)
          .order('pace_medio_min_km', { ascending: true, nullsFirst: false })

        if (error || !data) continue

        const idx = data.findIndex(r => r.user_id === userId)
        if (idx !== -1) {
          results.push({
            clubId: club.id,
            clubName: club.name,
            position: idx + 1,
            total: data.length
          })
        }
      }

      setMyRanks(results)
    }

    fetchRanks()
  }, [userId, myClubs])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-fuchsia-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-5 lg:px-8 pt-6 pb-6">

      {/* ─── Strava Connection Banner ─── */}
      {!isStravaConnected && (
        <Link to="/profile" className="block mb-6 animate-fade-in-up">
           <div className="bg-gradient-to-r from-[#FC4C02] to-[#E04400] rounded-2xl p-4 shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white overflow-hidden relative group">
             <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
             <div className="flex items-center gap-3 relative z-10">
               <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                 <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                   <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                 </svg>
               </div>
               <div>
                 <h3 className="font-bold text-sm leading-tight">Conecte seu Strava</h3>
                 <p className="text-[11px] font-medium text-white/80">Sincronize automicamente suas corridas.</p>
               </div>
             </div>
             <div className="flex items-center gap-1 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors relative z-10 w-max">
               Conectar agora <ArrowRight className="w-3.5 h-3.5" />
             </div>
           </div>
        </Link>
      )}

      {/* ─── Hero Greeting ─── */}
      <header className="mb-6 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-fuchsia-200/60 dark:bg-fuchsia-900/30 shadow-clay-sm dark:shadow-none dark:border dark:border-fuchsia-800/30 flex items-center justify-center">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-7 h-7 text-fuchsia-500 dark:text-fuchsia-400" />
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 mb-0.5 truncate">
              {greeting.emoji} {greeting.text}, {profile?.name || 'Corredor'}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Este é seu painel de corrida
            </h1>
          </div>
        </div>
      </header>
  
      {/* ─── Create Post Card ─── */}
      {userId && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.02s' }}>
          <div className="flex justify-end mb-3">
            <Link
              to="/feed"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-800/40 px-3 py-1.5 rounded-full hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30 transition-colors"
            >
              Ver Feed <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <CreatePost
            currentUser={{ id: userId }}
            currentProfile={profile}
            challenges={challenges}
            onPostCreated={() => {
              navigate('/feed')
            }}
          />
        </div>
      )}

      {/* Convites pendentes – indicador discreto */}
      {inviteCount > 0 && (
        <div className="mb-4 flex">
          <Link
            to="/clubs"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>
              Você tem {inviteCount} convite{inviteCount > 1 ? 's' : ''} de clube pendente
            </span>
          </Link>
        </div>
      )}

      {/* ─── Meu lugar nos rankings ─── */}
      {myRanks.length > 0 && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-[1.6rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Timer className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Seu lugar nos rankings (pace)
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Veja como você está nos clubes que participa.
                  </p>
                </div>
              </div>
              <Link
                to="/clubs"
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Ver clubes <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {myRanks.map(rank => (
                <Link
                  key={rank.clubId}
                  to={`/clubs/${rank.clubId}#ranking`}
                  className="min-w-[140px] flex-1 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 flex flex-col justify-between hover:border-emerald-200 dark:hover:border-emerald-400/50 hover:bg-emerald-50/70 dark:hover:bg-emerald-500/10 transition-all"
                >
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    {rank.position === 1 ? 'Top 1 no pace' : 'Posição no pace'}
                  </p>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      #{rank.position}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      de {rank.total}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {rank.clubName}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Desafios Elegíveis (baseados no Strava) ─── */}
      {isStravaConnected && eligibleChallenges.length > 0 && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.04s' }}>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 rounded-[1.6rem] p-4 shadow-clay-sm dark:shadow-none border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Desafios para Resgatar
                  </p>
                  <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                    Você já completou com seus dados do Strava!
                  </p>
                </div>
              </div>
              <Link
                to="/clubs"
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {eligibleChallenges.map(challenge => (
                <Link
                  key={challenge.id}
                  to={`/clubs/${challenge.club_id}/challenges`}
                  className="min-w-[200px] flex-1 bg-white dark:bg-zinc-800/80 border border-emerald-200/50 dark:border-emerald-700/30 rounded-xl px-3 py-2.5 flex flex-col hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {challenge.clubs?.logo_url ? (
                      <img 
                        src={challenge.clubs.logo_url} 
                        alt={challenge.clubs.name}
                        className="w-6 h-6 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {challenge.clubs?.name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                      {challenge.clubs?.name}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1 truncate">
                    {challenge.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <Zap className="w-3 h-3" />
                    {challenge.challenge_type === 'distance' || challenge.challenge_type === 'corrida' 
                      ? `${challenge.target_value} km` 
                      : `Pace ${challenge.target_value} min/km`
                    }
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Motivational Marquee ─── */}
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        <div className="bg-white/50 dark:bg-zinc-800/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-zinc-200/40 dark:border-zinc-700/30">
          <div className="flex overflow-hidden group" style={{ '--gap': '2rem' }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex shrink-0 items-center gap-16 py-2.5 pr-16 group-hover:[animation-play-state:paused]"
                style={{ animation: 'marquee 25s linear infinite' }}
              >
                {motivationalPhrases.map((phrase, j) => (
                  <span key={j} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {phrase}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Bento Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

        {/* Pace Card — tall */}
        <Link to="/profile" className="bg-fuchsia-200/80 dark:bg-fuchsia-950/50 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-fuchsia-900/30 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/20 dark:bg-fuchsia-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <Timer className="w-4 h-4 text-fuchsia-800 dark:text-fuchsia-300" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-fuchsia-800/70 dark:text-fuchsia-300/70 uppercase tracking-wider">Pace Médio</span>
              {isPaceFromStrava && (
                <span className="flex items-center gap-0.5 text-[9px] font-semibold bg-[#FC4C02]/20 text-[#FC4C02] px-1.5 py-0.5 rounded" title="Calculado automaticamente pelo Strava">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  Strava
                </span>
              )}
            </div>
          </div>
          <div className="mt-auto flex flex-col justify-end pt-4">
            {stravaAveragePace ? (
              <>
                <div className="flex items-baseline justify-between w-full border-b-2 border-fuchsia-900/10 dark:border-fuchsia-200/10 pb-1">
                  <span className="text-6xl lg:text-7xl font-black text-fuchsia-900 dark:text-fuchsia-200 tracking-tighter leading-none">
                    {stravaAveragePace.split(':')[0]}
                  </span>
                  <span className="text-xs font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase tracking-widest">Min</span>
                </div>
                <div className="flex items-baseline justify-between w-full pt-1">
                  <span className="text-5xl lg:text-6xl font-black text-fuchsia-900/60 dark:text-fuchsia-200/60 tracking-tighter leading-none">
                    {stravaAveragePace.split(':')[1]}
                  </span>
                  <span className="text-xs font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase tracking-widest">Seg</span>
                </div>
              </>
            ) : profile?.pace_medio && profile.pace_medio.includes(':') ? (
              <>
                <div className="flex items-baseline justify-between w-full border-b-2 border-fuchsia-900/10 dark:border-fuchsia-200/10 pb-1">
                  <span className="text-6xl lg:text-7xl font-black text-fuchsia-900 dark:text-fuchsia-200 tracking-tighter leading-none">
                    {profile.pace_medio.split(':')[0]}
                  </span>
                  <span className="text-xs font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase tracking-widest">Min</span>
                </div>
                <div className="flex items-baseline justify-between w-full pt-1">
                  <span className="text-5xl lg:text-6xl font-black text-fuchsia-900/60 dark:text-fuchsia-200/60 tracking-tighter leading-none">
                    {profile.pace_medio.split(':')[1]}
                  </span>
                  <span className="text-xs font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase tracking-widest">Seg</span>
                </div>
              </>
            ) : (
              <div className="flex items-baseline justify-between w-full">
                <span className="text-5xl font-black text-fuchsia-900 dark:text-fuchsia-200 tracking-tighter leading-none">
                  {profile?.pace_medio || '--:--'}
                </span>
                <span className="text-[10px] font-bold text-fuchsia-800/60 dark:text-fuchsia-400/60 uppercase">min/km</span>
              </div>
            )}
          </div>
        </Link>

        {/* Location Card */}
        <Link to="/profile" className="bg-pastel-green/60 dark:bg-green-950/50 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-green-900/30 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/20 dark:bg-green-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-800 dark:text-green-300" />
            </div>
            <span className="text-[10px] font-bold text-green-800/70 dark:text-green-300/70 uppercase tracking-wider">Cidade</span>
          </div>
          <div className="mt-auto">
            <span className="text-xl font-black text-green-900 dark:text-green-200 leading-tight">
              {profile?.cidade || 'Definir...'}
            </span>
          </div>
        </Link>

        {/* Meus Clubes Card */}
        <Link to="/clubs" className="bg-pastel-lavender/50 dark:bg-purple-950/40 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-purple-900/30 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/15 dark:bg-purple-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-purple-800 dark:text-purple-300" />
            </div>
            <span className="text-[10px] font-bold text-purple-800/70 dark:text-purple-300/70 uppercase tracking-wider">Meus Clubes</span>
          </div>
          <div className="mt-auto">
            <span className="text-5xl lg:text-6xl font-black text-purple-900 dark:text-purple-200 tracking-tighter leading-none">
              {myClubCount > 0 ? <NumberTicker value={myClubCount} /> : '0'}
            </span>
            <p className="text-[10px] text-purple-800/60 dark:text-purple-400/60 mt-0.5 font-medium">participando</p>
          </div>
        </Link>

        {/* Corredores Card */}
        <Link to="/runners" className="bg-pastel-peach/40 dark:bg-orange-950/30 rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-orange-900/20 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-transform">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/20 dark:bg-orange-400/10 blur-xl" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-orange-800 dark:text-orange-300" />
            </div>
            <span className="text-[10px] font-bold text-orange-800/70 dark:text-orange-300/70 uppercase tracking-wider">Corredores</span>
          </div>
          <div className="mt-auto">
            <span className="text-5xl lg:text-6xl font-black text-orange-900 dark:text-orange-200 tracking-tighter leading-none">
              {runnerCount > 0 ? <NumberTicker value={runnerCount} /> : '0'}
            </span>
            <p className="text-[10px] text-orange-800/60 dark:text-orange-400/60 mt-1 font-medium">na plataforma</p>
          </div>
        </Link>
      </div>

      {/* ─── CTA — Encontre sua tribo ─── */}
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-zinc-900 dark:bg-zinc-800/80 rounded-[1.6rem] p-5 shadow-xl dark:shadow-none dark:border dark:border-zinc-700/50 relative overflow-hidden group hover:bg-zinc-800 dark:hover:bg-zinc-700/80 transition-colors">
          <BorderBeam size={120} duration={8} colorFrom="#d946ef" colorTo="#86efac" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-green-400/20 flex items-center justify-center flex-shrink-0">
              <Compass className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm">Encontre sua tribo</h3>
              <p className="text-zinc-400 text-xs font-medium">Explore clubes e corredores na sua cidade</p>
            </div>
            <Link to="/clubs" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2.5 transition-colors flex-shrink-0">
              <span className="text-white text-xs font-bold">Explorar</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Acesso rápido (Desafios, Ranking, Prêmios) — só quando tem clubes ─── */}
      {myClubs.length > 0 && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.18s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Acesso rápido</h2>
            <Link to="/clubs" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-0.5">
              Ver clubes <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {myClubs.slice(0, 4).map((club) => (
              <div
                key={club.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all flex flex-col gap-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 overflow-hidden flex-shrink-0 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-500/20">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {club.name?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0">
                    {club.name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Link
                    to={`/clubs/${club.id}/challenges`}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold"
                  >
                    <Target className="w-3 h-3" /> Desafios
                  </Link>
                  <Link
                    to={`/clubs/${club.id}#ranking`}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-semibold"
                  >
                    <Trophy className="w-3 h-3" /> Ranking
                  </Link>
                  <Link
                    to={`/clubs/${club.id}/rewards`}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 text-[10px] font-semibold"
                  >
                    <Gift className="w-3 h-3" /> Prêmios
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-3 gap-2.5 mb-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
        <Link
          to="/clubs/new"
          className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex flex-col items-center gap-2.5 hover:scale-[1.03] active:scale-[0.97] transition-all text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-pastel-green/40 dark:bg-green-900/30 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-green-700 dark:text-green-400" />
          </div>
          <p className="text-xs font-bold leading-tight">Criar<br/>Clube</p>
        </Link>
        <Link
          to="/runners"
          className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex flex-col items-center gap-2.5 hover:scale-[1.03] active:scale-[0.97] transition-all text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-pastel-peach/40 dark:bg-orange-900/30 flex items-center justify-center">
            <Search className="w-5 h-5 text-orange-700 dark:text-orange-400" />
          </div>
          <p className="text-xs font-bold leading-tight">Buscar<br/>Corredores</p>
        </Link>
        <Link
          to="/profile"
          className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex flex-col items-center gap-2.5 hover:scale-[1.03] active:scale-[0.97] transition-all text-center"
        >
          <div className="w-11 h-11 rounded-xl bg-fuchsia-200/50 dark:bg-fuchsia-900/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-fuchsia-700 dark:text-fuchsia-400" />
          </div>
          <p className="text-xs font-bold leading-tight">Meu<br/>Perfil</p>
        </Link>
      </div>

      {/* ─── Recent Strava Activities ─── */}
      {isStravaConnected && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold tracking-tight">Corridas Recentes</h2>
          </div>
          {recentActivities.length === 0 ? (
            <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center">
              <Zap className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">Você ainda não tem corridas recentes registradas.</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Vá correr e sincronize com o Strava para ver aqui!</p>
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 snap-x">
              {recentActivities.map(activity => (
                <a 
                  key={activity.id} 
                  href={activity.stravaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 w-[240px] flex-shrink-0 snap-start lg:w-auto hover:scale-[1.02] active:scale-[0.98] transition-transform group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#FC4C02]/10 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#FC4C02]" fill="currentColor">
                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                      {new Date(activity.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate mb-3 group-hover:text-[#FC4C02] transition-colors">{activity.name}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Distância</span>
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{activity.distanceKm} <span className="text-[10px] text-zinc-500 font-medium">km</span></span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Pace Médio</span>
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{Math.floor(activity.paceSecPerKm / 60)}:{Math.round(activity.paceSecPerKm % 60).toString().padStart(2, '0')} <span className="text-[10px] text-zinc-500 font-medium">/km</span></span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Recent Clubs ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold tracking-tight">Novos Clubes</h2>
          <Link to="/clubs" className="text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-0.5">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-2.5 lg:grid lg:grid-cols-3 lg:gap-2.5 lg:space-y-0">
          {recentClubs.length === 0 ? (
            <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 text-center col-span-3">
              <Users className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">Nenhum clube encontrado.</p>
              <Link to="/clubs/new" className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mt-2 inline-block hover:underline">Criar o primeiro →</Link>
            </div>
          ) : (
            recentClubs.map((club) => (
              <Link
                to={`/clubs/${club.id}`}
                key={club.id}
                className="flex items-center gap-3.5 bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.4rem] p-3.5 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 hover:scale-[1.015] hover:shadow-clay dark:hover:bg-zinc-800/80 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-pastel-lavender/30 dark:bg-purple-900/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner dark:shadow-none">
                  {club.logo_url ? (
                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-purple-800 dark:text-purple-300">{club.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{club.name}</h3>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">{club.description}</p>
                  {club.cidade && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {club.cidade}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
