import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Calendar, ShieldCheck, FileText, Users, Pencil, X, Save, Check, Image, Crown, MapPin } from 'lucide-react'
import { useToast } from '../components/Toast'

export function ClubDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCidade, setEditCidade] = useState('')
  const [editRegras, setEditRegras] = useState('')

  const isAdmin = currentUser && club && currentUser.id === club.admin_id

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      const { data: clubData, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single()
        
      if (error || !clubData) {
        navigate('/clubs')
        return
      }
      setClub(clubData)
      setEditName(clubData.name)
      setEditDescription(clubData.description)
      setEditCidade(clubData.cidade || '')
      setEditRegras(clubData.regras)

      if (clubData.admin_id) {
        const { data: adminData } = await supabase
          .from('profiles')
          .select('name, photo_url, cidade, pace_medio')
          .eq('id', clubData.admin_id)
          .single()
        setAdmin(adminData)
      }

      setLoading(false)
    }
    fetchData()
  }, [id, navigate])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          name: editName,
          description: editDescription,
          cidade: editCidade,
          regras: editRegras
        })
        .eq('id', club.id)

      if (error) throw error

      setClub(prev => ({ ...prev, name: editName, description: editDescription, cidade: editCidade, regras: editRegras }))
      setSaved(true)
      setTimeout(() => { setSaved(false); setEditing(false) }, 1200)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const filePath = `${club.id}/logo.png`
      const { error: uploadError } = await supabase.storage
        .from('club_logos')
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('club_logos')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('clubs')
        .update({ logo_url: publicUrl })
        .eq('id', club.id)
      if (updateError) throw updateError

      setClub(prev => ({ ...prev, logo_url: publicUrl + '?t=' + Date.now() }))
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
  if (!club) return null

  return (
    <div className="px-5 pt-6 pb-4 animate-fade-in-up">
      <button 
        onClick={() => navigate('/clubs')} 
        className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Hero */}
      <div className="flex flex-col items-center mb-6">
        <label className={`relative ${isAdmin ? 'cursor-pointer group' : ''}`}>
          <div className="w-28 h-28 rounded-[1.6rem] bg-pastel-green/30 dark:bg-green-900/30 shadow-clay dark:shadow-none dark:border dark:border-green-800/30 overflow-hidden flex items-center justify-center mb-4 relative">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-black text-4xl text-green-800 dark:text-green-300">{club.name.charAt(0)}</span>
            )}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded-[1.6rem]">
                <Image className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-black/50 flex items-center justify-center rounded-[1.6rem]">
                <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {isAdmin && <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />}
        </label>

        {editing ? (
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-center text-2xl font-extrabold rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none max-w-xs" />
        ) : (
          <h1 className="text-2xl font-extrabold tracking-tight text-center text-zinc-900 dark:text-zinc-50">{club.name}</h1>
        )}

        {editing ? (
          <div className="mt-2 w-full max-w-xs">
            <Input value={editCidade} onChange={(e) => setEditCidade(e.target.value)} placeholder="Cidade do clube" className="text-center rounded-2xl h-10 text-sm bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none" />
          </div>
        ) : club.cidade ? (
          <div className="flex items-center gap-1 mt-2 bg-pastel-green/30 dark:bg-green-900/30 px-3 py-1 rounded-full">
            <MapPin className="w-3 h-3 text-green-700 dark:text-green-400" />
            <span className="text-xs font-bold text-green-800 dark:text-green-300">{club.cidade}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 mt-2 text-zinc-400 dark:text-zinc-500">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Fundado em {new Date(club.created_at).toLocaleDateString('pt-BR')}</span>
        </div>

        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)} className="mt-3 flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Editar Clube
          </button>
        )}
        {isAdmin && editing && (
          <div className="mt-3 flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-full shadow-xl transition-all ${saved ? 'bg-green-600' : 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white active:scale-95'}`}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : saved ? <><Check className="w-3.5 h-3.5" /> Salvo!</> : <><Save className="w-3.5 h-3.5" /> Salvar</>}
            </button>
            <button onClick={() => { setEditing(false); setEditName(club.name); setEditDescription(club.description); setEditCidade(club.cidade || ''); setEditRegras(club.regras) }} className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-red-500 bg-white/60 dark:bg-zinc-800/60 px-3 py-2 rounded-full transition-colors">
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Admin Badge */}
      {admin && (
        <div className="bg-pastel-lavender/30 dark:bg-purple-950/40 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-purple-900/30 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-white/10 shadow-inner dark:shadow-none overflow-hidden flex items-center justify-center flex-shrink-0">
            {admin.photo_url ? <img src={admin.photo_url} alt={admin.name} className="w-full h-full object-cover" /> : <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-purple-700/60 dark:text-purple-400/60 uppercase tracking-wider">Administrador</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{admin.name || 'Corredor'}</p>
            {admin.cidade && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{admin.cidade}</p>}
          </div>
          {admin.pace_medio && (
            <div className="bg-white/50 dark:bg-white/10 rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <p className="text-[9px] font-bold text-zinc-400 uppercase">Pace</p>
              <p className="text-xs font-black text-zinc-700 dark:text-zinc-200">{admin.pace_medio}</p>
            </div>
          )}
        </div>
      )}
      
      {/* About Card */}
      <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-pastel-blue/40 dark:bg-blue-900/40 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-blue-800 dark:text-blue-300" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Sobre</h2>
        </div>
        {editing ? (
          <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="w-full rounded-2xl p-4 text-sm bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 dark:focus:ring-purple-500/30 transition-all resize-none dark:text-zinc-100" />
        ) : (
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{club.description}</p>
        )}
      </div>

      {/* Rules Card */}
      <div className="bg-pastel-peach/30 dark:bg-orange-950/30 backdrop-blur-sm rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-orange-900/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-orange-200/60 dark:bg-orange-900/40 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-800 dark:text-orange-300" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange-800/70 dark:text-orange-400/70">Regras do Clube</h2>
        </div>
        {editing ? (
          <textarea value={editRegras} onChange={(e) => setEditRegras(e.target.value)} rows={3} className="w-full rounded-2xl p-4 text-sm bg-white/80 dark:bg-zinc-900/60 border border-orange-200/80 dark:border-orange-900/30 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-pastel-peach/50 dark:focus:ring-orange-500/30 transition-all resize-none dark:text-zinc-100" />
        ) : (
          <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4">
            <p className="text-orange-900/80 dark:text-orange-200/80 text-sm font-medium leading-relaxed whitespace-pre-wrap">{club.regras}</p>
          </div>
        )}
      </div>
    </div>
  )
}
