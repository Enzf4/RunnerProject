import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, MapPin, Timer, Mail, Camera, LogOut, Save, Check, AlignLeft } from 'lucide-react'
import { useToast } from '../components/Toast'

export function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  
  const [profile, setProfile] = useState({
    name: '',
    pace_medio: '',
    cidade: '',
    photo_url: '',
    bio: ''
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (data) {
          setProfile({
            name: data.name || '',
            pace_medio: data.pace_medio || '',
            cidade: data.cidade || '',
            photo_url: data.photo_url || '',
            bio: data.bio || ''
          })
        }
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-pastel-lavender border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return null

  return (
    <div className="px-5 pt-8 pb-4 animate-fade-in-up">
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
      <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.8rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 mb-4">
        <div className="flex items-center gap-5">
          <label className="relative cursor-pointer group">
            <div className="w-20 h-20 rounded-[1.2rem] bg-pastel-lavender/40 dark:bg-purple-900/30 shadow-inner dark:shadow-none flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-pastel-lavender/60 dark:group-hover:border-purple-500/40 transition-all">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-purple-400 dark:text-purple-500" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-200 flex items-center justify-center shadow-lg group-hover:bg-zinc-700 dark:group-hover:bg-white transition-colors">
              <Camera className="w-3.5 h-3.5 text-white dark:text-zinc-800" />
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
            {uploading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-black/50 rounded-[1.2rem] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </label>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold truncate">{profile.name || 'Corredor'}</h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 font-medium truncate">{profile.cidade || 'Nenhuma cidade'}</p>
            <div className="flex items-center gap-1 mt-1 text-zinc-300 dark:text-zinc-600">
              <Mail className="w-3 h-3" />
              <span className="text-xs truncate">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Chips */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-fuchsia-200/60 dark:bg-fuchsia-950/40 rounded-[1.2rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-fuchsia-900/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/50 dark:bg-white/10 flex items-center justify-center">
            <Timer className="w-4 h-4 text-fuchsia-700 dark:text-fuchsia-300" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-fuchsia-700/60 dark:text-fuchsia-400/60 uppercase tracking-wider">Pace</p>
            <p className="text-lg font-black text-fuchsia-900 dark:text-fuchsia-200 leading-none">{profile.pace_medio || '--:--'}</p>
          </div>
        </div>
        <div className="bg-pastel-green/40 dark:bg-green-950/40 rounded-[1.2rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-green-900/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/50 dark:bg-white/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-green-700 dark:text-green-300" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-green-700/60 dark:text-green-400/60 uppercase tracking-wider">Cidade</p>
            <p className="text-sm font-black text-green-900 dark:text-green-200 leading-tight truncate">{profile.cidade || '—'}</p>
          </div>
        </div>
      </div>
      
      {/* Edit Form */}
      <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.8rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40">
        <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">Editar Informações</h3>
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nome Completo
            </Label>
            <Input 
              id="name" 
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              placeholder="João Corredor"
              className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Bio
            </Label>
            <textarea 
              id="bio" 
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Conte um pouco sobre você como corredor..."
              rows={3}
              className="w-full rounded-2xl p-4 text-sm bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 dark:focus:ring-purple-500/30 focus:bg-white dark:focus:bg-zinc-900 transition-all resize-none dark:text-zinc-100"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pace" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Pace
              </Label>
              <Input 
                id="pace" 
                value={profile.pace_medio}
                onChange={(e) => setProfile(prev => ({ ...prev, pace_medio: e.target.value }))}
                placeholder="05:30"
                className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cidade" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Cidade
              </Label>
              <Input 
                id="cidade" 
                value={profile.cidade}
                onChange={(e) => setProfile(prev => ({ ...prev, cidade: e.target.value }))}
                placeholder="São Paulo"
                className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={saving}
            className={`w-full rounded-2xl h-12 text-sm font-bold shadow-xl dark:shadow-none transition-all flex items-center justify-center gap-2 group ${
              saved 
                ? 'bg-green-600 hover:bg-green-600 text-white' 
                : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white active:scale-[0.98] text-white dark:text-zinc-900'
            }`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <>
                <Check className="w-4 h-4" /> Salvo!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Salvar Perfil
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
