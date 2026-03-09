import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Calendar, ShieldCheck, FileText, Users, Pencil, X, Save, Check, Image, Crown, MapPin, UserPlus, LogOut, UserCircle, ChevronRight, Trash2, Target, Gift } from 'lucide-react'
import { useToast } from '../components/Toast'
import { CitySelect } from '../components/CitySelect'

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

  // Membership state
  const [isMember, setIsMember] = useState(false)
  const [members, setMembers] = useState([])
  const [joiningOrLeaving, setJoiningOrLeaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
          .select('id, name, photo_url, cidade, pace_medio')
          .eq('id', clubData.admin_id)
          .single()
        setAdmin(adminData)
      }

      // Check membership
      if (user) {
        const { data: memberData } = await supabase
          .from('club_members')
          .select('id')
          .eq('club_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        setIsMember(!!memberData)
      }

      // Fetch members with profile info
      const { data: membersData } = await supabase
        .from('club_members')
        .select(`
          user_id,
          profiles (
            id,
            name,
            photo_url,
            pace_medio,
            cidade
          )
        `)
        .eq('club_id', id)

      setMembers(membersData?.map(m => m.profiles).filter(Boolean) || [])

      setLoading(false)
    }
    fetchData()
  }, [id, navigate])

  const handleJoin = async () => {
    if (!currentUser) return
    setJoiningOrLeaving(true)
    try {
      const { error } = await supabase
        .from('club_members')
        .insert({ club_id: id, user_id: currentUser.id })
      if (error) throw error
      setIsMember(true)

      // Add current user to members list
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id, name, photo_url, pace_medio, cidade')
        .eq('id', currentUser.id)
        .single()
      if (myProfile) setMembers(prev => [...prev, myProfile])

      toast.success('Você entrou no clube!')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setJoiningOrLeaving(false)
    }
  }

  const handleLeave = async () => {
    if (!currentUser) return
    setJoiningOrLeaving(true)
    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', id)
        .eq('user_id', currentUser.id)
      if (error) throw error
      setIsMember(false)
      setMembers(prev => prev.filter(m => m.id !== currentUser.id))
      toast.success('Você saiu do clube.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setJoiningOrLeaving(false)
    }
  }

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
            <CitySelect
              value={editCidade}
              onChange={setEditCidade}
              placeholder="Cidade do clube"
              compact
            />
          </div>
        ) : club.cidade ? (
          <div className="flex items-center gap-1 mt-2 bg-pastel-green/30 dark:bg-green-900/30 px-3 py-1 rounded-full">
            <MapPin className="w-3 h-3 text-green-700 dark:text-green-400" />
            <span className="text-xs font-bold text-green-800 dark:text-green-300">{club.cidade}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Fundado em {new Date(club.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{members.length}</span>
          </div>
        </div>

        {/* Join / Leave / Edit Buttons */}
        <div className="mt-4 flex items-center gap-2">
          {!isAdmin && !isMember && (
            <button
              onClick={handleJoin}
              disabled={joiningOrLeaving}
              className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xl transition-all disabled:opacity-50"
            >
              {joiningOrLeaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> Participar
                </>
              )}
            </button>
          )}

          {!isAdmin && isMember && (
            <button
              onClick={handleLeave}
              disabled={joiningOrLeaving}
              className="flex items-center gap-2 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm text-red-500 hover:text-red-600 text-xs font-bold px-5 py-2.5 rounded-full shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 transition-all disabled:opacity-50 active:scale-95"
            >
              {joiningOrLeaving ? (
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" /> Sair do Clube
                </>
              )}
            </button>
          )}

          {isMember && !isAdmin && (
            <span className="flex items-center gap-1.5 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-2 rounded-full">
              <Check className="w-3.5 h-3.5" /> Membro
            </span>
          )}

          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Editar Clube
            </button>
          )}

          {isAdmin && !editing && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-600 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Apagar
            </button>
          )}

          {isAdmin && confirmDelete && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-full border border-red-200 dark:border-red-900/40">
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400">Tem certeza?</span>
              <button
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await supabase.from('club_members').delete().eq('club_id', id)
                    const { error } = await supabase.from('clubs').delete().eq('id', id)
                    if (error) throw error
                    navigate('/clubs')
                  } catch (err) {
                    toast.error(err.message)
                    setDeleting(false)
                    setConfirmDelete(false)
                  }
                }}
                disabled={deleting}
                className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {deleting ? 'Apagando...' : 'Sim, apagar'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded-full transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
          {isAdmin && editing && (
            <>
              <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-full shadow-xl transition-all ${saved ? 'bg-green-600' : 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white active:scale-95'}`}>
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : saved ? <><Check className="w-3.5 h-3.5" /> Salvo!</> : <><Save className="w-3.5 h-3.5" /> Salvar</>}
              </button>
              <button onClick={() => { setEditing(false); setEditName(club.name); setEditDescription(club.description); setEditCidade(club.cidade || ''); setEditRegras(club.regras) }} className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-red-500 bg-white/60 dark:bg-zinc-800/60 px-3 py-2 rounded-full transition-colors">
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Admin Badge */}
      {admin && (
        <Link
          to={`/runners/${admin.id}`}
          className="block bg-pastel-lavender/30 dark:bg-purple-950/40 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-purple-900/30 mb-4 flex items-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
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
        </Link>
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

      {/* Gamification Navigation */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link
          to={`/clubs/${id}/challenges`}
          className="bg-pastel-green/40 dark:bg-green-950/40 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-green-900/30 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-green-700 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-900 dark:text-green-200">Desafios</p>
            <p className="text-[10px] text-green-700/60 dark:text-green-400/60 font-medium">Metas e conquistas</p>
          </div>
          <ChevronRight className="w-4 h-4 text-green-600/40 dark:text-green-500/40 flex-shrink-0" />
        </Link>
        <Link
          to={`/clubs/${id}/rewards`}
          className="bg-fuchsia-200/40 dark:bg-fuchsia-950/40 backdrop-blur-sm rounded-[1.4rem] p-4 shadow-clay-sm dark:shadow-none dark:border dark:border-fuchsia-900/30 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-fuchsia-700 dark:text-fuchsia-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-fuchsia-900 dark:text-fuchsia-200">Prêmios</p>
            <p className="text-[10px] text-fuchsia-700/60 dark:text-fuchsia-400/60 font-medium">Recompensas</p>
          </div>
          <ChevronRight className="w-4 h-4 text-fuchsia-600/40 dark:text-fuchsia-500/40 flex-shrink-0" />
        </Link>
      </div>

      {/* Rules Card */}
      <div className="bg-pastel-peach/30 dark:bg-orange-950/30 backdrop-blur-sm rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-orange-900/20 mb-4">
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

      {/* Members Section */}
      <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.6rem] p-5 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-fuchsia-200/50 dark:bg-fuchsia-900/40 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-fuchsia-800 dark:text-fuchsia-300" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Membros</h2>
          </div>
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-700/50 px-2.5 py-1 rounded-full">
            {members.length}
          </span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-4">
            <UserCircle className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-zinc-400 dark:text-zinc-500 text-xs font-medium">Nenhum membro ainda. Seja o primeiro!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Link
                key={member.id}
                to={`/runners/${member.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/40 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-fuchsia-200/40 dark:bg-fuchsia-900/30 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner dark:shadow-none">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-5 h-5 text-fuchsia-400 dark:text-fuchsia-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{member.name || 'Corredor'}</p>
                  <div className="flex items-center gap-2">
                    {member.cidade && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {member.cidade}
                      </span>
                    )}
                    {member.pace_medio && (
                      <span className="text-[11px] text-fuchsia-500 dark:text-fuchsia-400 font-semibold">
                        {member.pace_medio}
                      </span>
                    )}
                  </div>
                </div>
                {member.id === club.admin_id && (
                  <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full uppercase">Admin</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
