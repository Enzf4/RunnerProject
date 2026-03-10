import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { fetchWithAuth } from '../lib/api'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, MapPin, Timer, Mail, Camera, LogOut, Save, Check, AlignLeft, Link2, Link2Off, Loader2, Activity, Calendar, Zap, Mountain, ExternalLink } from 'lucide-react'
import { useToast } from '../components/Toast'
import { CitySelect } from '../components/CitySelect'

export function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stravaConnecting, setStravaConnecting] = useState(false)
  const [stravaDisconnecting, setStravaDisconnecting] = useState(false)
  const [stravaSuccess, setStravaSuccess] = useState(false)
  const [isStravaConnected, setIsStravaConnected] = useState(false)
  const [stravaActivities, setStravaActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [averagePace, setAveragePace] = useState(null)
  const { toast } = useToast()
  
  const [profile, setProfile] = useState({
    name: '',
    pace_medio: '',
    cidade: '',
    photo_url: '',
    bio: ''
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('strava_athlete_id')) {
      setStravaSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (stravaSuccess) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [stravaSuccess])

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        
        // Load profile and strava connection in parallel
        const [profileResponse, stravaResponse] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('user_strava_tokens').select('user_id').maybeSingle()
        ])
        
        const profileData = profileResponse.data
        if (profileData) {
          setProfile({
            name: profileData.name || '',
            pace_medio: profileData.pace_medio || '',
            cidade: profileData.cidade || '',
            photo_url: profileData.photo_url || '',
            bio: profileData.bio || ''
          })
        }

        if (stravaResponse.data) {
          setIsStravaConnected(true)
          fetchRecentActivities()
          fetchAveragePace()
        }
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const fetchRecentActivities = async () => {
    setLoadingActivities(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const userId = session?.user?.id
      if (!token || !userId) return

      // Usando axios diretamente pois a assinatura com headers nativos estava montada fixa
      const response = await axios({
        method: 'GET',
        url: `https://api-projetointegrador-kmmg.onrender.com/api/strava/activities?userId=${userId}&count=3`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.status >= 200 && response.status < 300) {
        setStravaActivities(response.data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar atividades do Strava:', error)
    } finally {
      setLoadingActivities(false)
    }
  }

  const fetchAveragePace = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const response = await fetch(`https://api-projetointegrador-kmmg.onrender.com/api/Strava/average-pace`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data && data.averagePace) {
          setAveragePace(data.averagePace)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar pace médio do Strava:', error)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          pace_medio: profile.pace_medio,
          cidade: profile.cidade,
          bio: profile.bio
        })
        .eq('id', user.id)
        
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const filePath = `public/${user.id}.png`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => ({ ...prev, photo_url: publicUrl }))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  const conectarStrava = async () => {
    setStravaConnecting(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        toast.error('Usuário não autenticado.')
        return
      }

      window.location.href = `https://api-projetointegrador-kmmg.onrender.com/api/strava/login?userId=${currentUser.id}`
      
    } catch (error) {
      console.error('Erro ao iniciar login com Strava', error)
      toast.error('Erro de conexão com o Strava.')
      setStravaConnecting(false)
    }
  }

  const desconectarStrava = async () => {
    setStravaDisconnecting(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        toast.error('Usuário não autenticado.')
        return
      }

      const response = await fetchWithAuth(`/api/strava/disconnect?userId=${currentUser.id}`, { 
        method: 'DELETE' 
      })

      if (response.status >= 200 && response.status < 300) {
        setIsStravaConnected(false)
        setStravaActivities([])
        toast.success('Strava desconectado com sucesso!')
      } else {
        toast.error('Erro ao desconectar.')
      }
    } catch (error) {
      console.error('Erro ao desconectar Strava', error)
      toast.error('Erro ao desconectar.')
    } finally {
      setStravaDisconnecting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return null

  return (
    <div className="px-5 lg:px-8 pt-8 pb-4 animate-fade-in-up">
      {/* Strava Success Modal */}
      {stravaSuccess && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setStravaSuccess(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 rounded-[1.5rem] bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#FC4C02]" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">Strava Conectado! 🎉</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Sua conta do Strava foi vinculada com sucesso. Suas atividades serão sincronizadas automaticamente.</p>
            </div>
            <button
              onClick={() => setStravaSuccess(false)}
              className="w-full bg-[#FC4C02] hover:bg-[#E04400] text-white font-bold text-sm py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
            >
              Ótimo!
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Perfil</h1>
          <p className="text-zinc-400 dark:text-zinc-500 mt-1 text-sm font-medium">Gerencie sua identidade de corredor.</p>
        </div>
        <button 
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/auth'
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/30 px-3.5 py-2 rounded-full transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </div>
      
      {/* Avatar Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 transition-all hover:shadow-md hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30 flex flex-col mb-4">
        <div className="flex items-center gap-5">
          <label className="relative cursor-pointer group">
            <div className="w-20 h-20 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 flex items-center justify-center flex-shrink-0 border-2 border-transparent group-hover:border-fuchsia-100/50 dark:group-hover:border-fuchsia-500/20 transition-all overflow-hidden">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-fuchsia-500" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-200 flex items-center justify-center shadow-lg group-hover:bg-zinc-700 dark:group-hover:bg-white transition-colors">
              <Camera className="w-3.5 h-3.5 text-white dark:text-zinc-800" />
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
            {uploading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-black/50 rounded-2xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-fuchsia-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </label>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white truncate">{profile.name || 'Corredor'}</h2>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">{profile.cidade || 'Nenhuma cidade'}</p>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800 w-fit">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Chips */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2">
          <Timer className="w-4 h-4 text-fuchsia-500" />
          <span className="text-sm font-bold text-zinc-900 dark:text-white">
            {averagePace || profile.pace_medio || '--:--'} {!averagePace && <span className="text-zinc-500 text-xs font-medium">/km</span>}
          </span>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">
            {profile.cidade || '—'}
          </span>
        </div>
      </div>
      
      {/* Edit Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 transition-all hover:shadow-md hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30 mb-6 flex flex-col">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-5">Editar Informações</h3>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nome Completo
            </Label>
            <Input 
              id="name" 
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              placeholder="João Corredor"
              className="w-full rounded-xl h-11 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 dark:text-zinc-100 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Bio
            </Label>
            <textarea 
              id="bio" 
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Conte um pouco sobre você como corredor..."
              rows={3}
              className="w-full rounded-xl p-3 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all resize-none dark:text-zinc-100"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pace" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Pace
              </Label>
              <Input 
                id="pace" 
                value={profile.pace_medio}
                onChange={(e) => setProfile(prev => ({ ...prev, pace_medio: e.target.value }))}
                placeholder="05:30"
                className="w-full rounded-xl h-11 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 dark:text-zinc-100 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cidade" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Cidade
              </Label>
              <div className="w-full [&>div>button]:h-11 [&>div>button]:rounded-xl [&>div]:bg-white [&>div>button]:bg-white dark:[&>div]:bg-zinc-800 dark:[&>div>button]:bg-zinc-800 focus-within:ring-fuchsia-500/50">
                <CitySelect
                  value={profile.cidade}
                  onChange={(val) => setProfile(prev => ({ ...prev, cidade: val }))}
                  placeholder="Selecione..."
                />
              </div>
            </div>
          </div>
          
          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-5 py-6 rounded-2xl shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 ${
                saved 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900'
              }`}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-zinc-400 dark:border-zinc-600 border-t-zinc-100 dark:border-t-zinc-900 rounded-full animate-spin" />
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" /> Perfil Salvo
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Strava Integration Card */}
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 transition-all hover:shadow-md hover:border-orange-200 dark:hover:border-orange-500/30 flex flex-col mb-4">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#FC4C02]/10 dark:bg-[#FC4C02]/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center mb-5">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-[#FC4C02]/10 flex items-center justify-center border border-[#FC4C02]/20">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#FC4C02]" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
             </div>
             <div>
               <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Strava</h3>
               <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Integração</p>
             </div>
            {isStravaConnected && (
               <div className="flex items-center gap-1.5 ml-3 border text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg">
                 <Check className="w-3.5 h-3.5" /> Conectado
               </div>
            )}
           </div>
         </div>
         
         <p className="relative z-10 text-sm text-zinc-600 dark:text-zinc-400 font-medium mb-6">
           Conecte sua conta do Strava para sincronizar automaticamente suas atividades e validar desafios no clube.
         </p>
         
         <div className="relative z-10 flex flex-col sm:flex-row gap-3">
           {!isStravaConnected ? (
             <button
               onClick={conectarStrava}
               disabled={stravaConnecting}
               className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-[#FC4C02] hover:bg-[#E04400] active:scale-[0.99] text-white text-sm font-semibold px-5 py-3.5 rounded-2xl shadow-sm transition-all disabled:opacity-60"
             >
               {stravaConnecting ? (
                 <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
               ) : (
                 <><Link2 className="w-4 h-4" /> Conectar com Strava</>
               )}
             </button>
           ) : (
             <div className="flex-1 flex items-center gap-3 px-5 py-3.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl">
               <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center flex-shrink-0">
                 <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
               </div>
               <div>
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate">Conta Sincronizada</p>
                  <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 font-medium truncate">Suas corridas atualizam automaticamente.</p>
               </div>
             </div>
           )}

           {isStravaConnected && (
             <button
               onClick={desconectarStrava}
               disabled={stravaDisconnecting}
               className="flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 text-sm font-semibold px-5 py-3.5 rounded-2xl transition-all disabled:opacity-60 active:scale-[0.99] border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-500/20"
             >
               {stravaDisconnecting ? (
                 <><Loader2 className="w-4 h-4 animate-spin" /> Desconectando...</>
               ) : (
                 <><Link2Off className="w-4 h-4" /> Desconectar</>
               )}
             </button>
           )}
         </div>

         {/* Extensão de Atividades */}
         {isStravaConnected && (
           <div className="relative z-10 mt-6 pt-6 border-t border-zinc-200/60 dark:border-zinc-700/50">
             <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
               <Activity className="w-4 h-4 text-[#FC4C02]" /> Atividades Recentes
             </h4>
             
             {loadingActivities ? (
               <div className="flex items-center justify-center py-6">
                 <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
               </div>
             ) : stravaActivities.length > 0 ? (
               <div className="space-y-3">
                 {stravaActivities.map((activity) => (
                   <a 
                     key={activity.id}
                     href={activity.stravaUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="block bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 transition-all group"
                   >
                     <div className="flex justify-between items-start mb-3">
                       <div>
                         <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#FC4C02] transition-colors">{activity.name}</p>
                         <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wider">
                           <Calendar className="w-3.5 h-3.5" />
                           {new Date(activity.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                         </div>
                       </div>
                       <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-[#FC4C02] transition-colors mt-0.5" />
                     </div>
                     
                     <div className="grid grid-cols-3 gap-2 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                       <div className="text-center">
                         <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Distância</span>
                         <span className="text-sm font-black text-zinc-900 dark:text-white">{activity.distanceKm} km</span>
                       </div>
                       <div className="text-center border-l border-r border-zinc-100 dark:border-zinc-800">
                         <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Pace</span>
                         <span className="text-sm font-black text-zinc-900 dark:text-white">{activity.paceFormatted}/km</span>
                       </div>
                       <div className="text-center">
                         <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-0.5">Tempo</span>
                         <span className="text-sm font-black text-zinc-900 dark:text-white">{Math.round((activity.movingTimeSeconds || 0) / 60)} min</span>
                       </div>
                     </div>
                   </a>
                 ))}
               </div>
             ) : (
               <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl p-5 text-center border border-zinc-200/60 dark:border-zinc-700/50">
                 <p className="text-sm text-zinc-500 font-medium">Nenhuma atividade recente encontrada no Strava.</p>
               </div>
             )}
           </div>
         )}
       </div>
     </div>
   )
 }
