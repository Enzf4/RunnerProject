import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Calendar, ShieldCheck, FileText, Users, Pencil, X, Save, Check, Image, Crown, MapPin, UserPlus, LogOut, UserCircle, ChevronRight, Trash2, Target, Gift, Search } from 'lucide-react'
import { useToast } from '../components/Toast'
import { CitySelect } from '../components/CitySelect'
import { TelaRanking } from '../components/TelaRanking'

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
  const [memberStatus, setMemberStatus] = useState(null)
  const [members, setMembers] = useState([])
  const [pendingMembers, setPendingMembers] = useState([])
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteRunnerSearch, setInviteRunnerSearch] = useState('')
  const [inviteRunnerResults, setInviteRunnerResults] = useState([])
  const [inviteRunnerSearching, setInviteRunnerSearching] = useState(false)
  const [joiningOrLeaving, setJoiningOrLeaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCidade, setEditCidade] = useState('')
  const [editRegras, setEditRegras] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)

  const isAdmin = currentUser && club && currentUser.id === club.admin_id

  useEffect(() => {
    if (!loading && club && window.location.hash === '#ranking') {
      const el = document.getElementById('ranking')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, club])

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
      setEditIsPublic(clubData.is_public)

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
          .select('id, status')
          .eq('club_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (memberData) {
          setIsMember(true)
          setMemberStatus(memberData.status || 'active')
        } else {
          setIsMember(false)
          setMemberStatus(null)
        }
      }

      // Fetch members with profile info
      const { data: membersData } = await supabase
        .from('club_members')
        .select(`
          user_id,
          status,
          profiles (
            id,
            name,
            photo_url,
            pace_medio,
            cidade
          )
        `)
        .eq('club_id', id)

      const activeList = []
      const pendingList = []
      membersData?.forEach(m => {
        if (!m.profiles) return
        if (m.status === 'active' || !m.status) activeList.push(m.profiles)
        else if (m.status === 'pending') pendingList.push(m.profiles)
      })
      
      setMembers(activeList)
      setPendingMembers(pendingList)

      setLoading(false)
    }
    fetchData()
  }, [id, navigate])

  // Buscar corredores para convite (debounced)
  useEffect(() => {
    if (!inviteRunnerSearch.trim() || !club) {
      setInviteRunnerResults([])
      return
    }
    const timer = setTimeout(async () => {
      setInviteRunnerSearching(true)
      const excludedIds = [
        club.admin_id,
        currentUser?.id,
        ...members.map(m => m.id),
        ...pendingMembers.map(m => m.id)
      ].filter(Boolean)
      let query = supabase
        .from('profiles')
        .select('id, name, photo_url, cidade, pace_medio')
        .ilike('name', `%${inviteRunnerSearch.trim()}%`)
        .limit(20)
      const { data, error } = await query
      setInviteRunnerSearching(false)
      if (error) {
        setInviteRunnerResults([])
        return
      }
      const filtered = (data || []).filter(p => !excludedIds.includes(p.id))
      setInviteRunnerResults(filtered)
    }, 350)
    return () => clearTimeout(timer)
  }, [inviteRunnerSearch, club, currentUser?.id, members, pendingMembers])

  const handleJoin = async () => {
    if (!currentUser) return
    setJoiningOrLeaving(true)
    try {
      const newStatus = club.is_public ? 'active' : 'pending'
      const { error } = await supabase
        .from('club_members')
        .insert({ club_id: id, user_id: currentUser.id, status: newStatus })
      if (error) throw error
      
      setIsMember(true)
      setMemberStatus(newStatus)

      if (newStatus === 'active') {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('id, name, photo_url, pace_medio, cidade')
          .eq('id', currentUser.id)
          .single()
        if (myProfile) setMembers(prev => [...prev, myProfile])
        toast.success('Você entrou no clube!')
      } else {
        toast.success('Solicitação enviada. Aguardando aprovação!')
      }
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
      setMemberStatus(null)
      setMembers(prev => prev.filter(m => m.id !== currentUser.id))
      toast.success('Você saiu do clube.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setJoiningOrLeaving(false)
    }
  }

  const inviteUserIdToDb = async (userIdToInvite) => {
    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: id, user_id: userIdToInvite, status: 'invited' })
    if (error) throw error
  }

  const handleInvite = async () => {
    const input = inviteUserId.trim()
    if (!input) return
    setInviting(true)
    try {
      let userIdToInvite = input
      if (input.includes('@')) {
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', input)
          .maybeSingle()
        if (lookupError || !profile) {
          toast.error('Usuário não encontrado com este e-mail. Use o ID (UUID) se o perfil não tiver e-mail.')
          setInviting(false)
          return
        }
        userIdToInvite = profile.id
      }
      if (userIdToInvite === currentUser?.id) {
        toast.error('Você não pode se convidar para o clube.')
        setInviting(false)
        return
      }
      await inviteUserIdToDb(userIdToInvite)
      toast.success('Convite enviado!')
      setInviteUserId('')
    } catch (error) {
      toast.error('Erro ao convidar: ' + error.message)
    } finally {
      setInviting(false)
    }
  }

  const handleInviteRunner = async (runner) => {
    if (runner.id === currentUser?.id) {
      toast.error('Você não pode se convidar para o clube.')
      return
    }
    setInviting(true)
    try {
      await inviteUserIdToDb(runner.id)
      toast.success(`Convite enviado para ${runner.name || 'corredor'}!`)
      setInviteRunnerSearch('')
      setInviteRunnerResults([])
    } catch (error) {
      toast.error('Erro ao convidar: ' + error.message)
    } finally {
      setInviting(false)
    }
  }

  const handleAcceptMember = async (userIdToAccept) => {
    try {
      const { error } = await supabase
        .from('club_members')
        .update({ status: 'active' })
        .match({ club_id: id, user_id: userIdToAccept })
      if (error) throw error
      
      const acceptedProfile = pendingMembers.find(p => p.id === userIdToAccept)
      if (acceptedProfile) {
        setMembers(prev => [...prev, acceptedProfile])
        setPendingMembers(prev => prev.filter(p => p.id !== userIdToAccept))
      }
      toast.success('Membro aceito!')
    } catch (error) {
      toast.error('Erro ao aceitar membro: ' + error.message)
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
          regras: editRegras,
          is_public: editIsPublic
        })
        .eq('id', club.id)

      if (error) throw error

      setClub(prev => ({ ...prev, name: editName, description: editDescription, cidade: editCidade, regras: editRegras, is_public: editIsPublic }))
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
      <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin" />
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
          <div className="w-28 h-28 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 overflow-hidden flex items-center justify-center mb-4 relative shadow-sm">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-4xl text-emerald-600 dark:text-emerald-400">{club.name.charAt(0)}</span>
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
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-center text-2xl font-bold rounded-2xl h-12 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm focus:ring-2 focus:ring-emerald-500/50 max-w-xs transition-all" />
        ) : (
          <h1 className="text-2xl font-bold tracking-tight text-center text-zinc-900 dark:text-zinc-50">{club.name}</h1>
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
          <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-200/50 dark:border-emerald-500/20">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{club.cidade}</span>
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
              className="flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 active:scale-[0.99] text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-sm transition-all disabled:opacity-60"
            >
              {joiningOrLeaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Participar
                </>
              )}
            </button>
          )}

          {!isAdmin && isMember && memberStatus === 'pending' && (
            <button
              onClick={handleLeave}
              disabled={joiningOrLeaving}
              className="flex items-center justify-center gap-2 bg-orange-50 dark:bg-orange-950/30 text-orange-600 hover:text-orange-700 text-sm font-semibold px-5 py-2.5 rounded-2xl border border-orange-200 dark:border-orange-900/40 transition-all disabled:opacity-60 active:scale-[0.99]"
            >
              {joiningOrLeaving ? (
                <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
              ) : (
                <>Cancelar Solicitação</>
              )}
            </button>
          )}

          {!isAdmin && isMember && (memberStatus === 'active' || memberStatus === 'invited') && (
            <button
              onClick={handleLeave}
              disabled={joiningOrLeaving}
              className="flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 hover:text-red-600 text-sm font-semibold px-5 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-500/20 transition-all disabled:opacity-60 active:scale-[0.99]"
            >
              {joiningOrLeaving ? (
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-4 h-4" /> Sair do Clube
                </>
              )}
            </button>
          )}

          {isMember && !isAdmin && (memberStatus === 'active' || !memberStatus) && (
            <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-200/50 dark:border-emerald-500/20">
              <Check className="w-3.5 h-3.5" /> Membro
            </span>
          )}

          {isMember && !isAdmin && memberStatus === 'pending' && (
            <span className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold px-3 py-2 rounded-lg border border-orange-200/50 dark:border-orange-500/20">
              Pendente
            </span>
          )}

          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:shadow-sm transition-all">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          )}

          {isAdmin && !editing && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-500/30 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
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
              <button onClick={() => { setEditing(false); setEditName(club.name); setEditDescription(club.description); setEditCidade(club.cidade || ''); setEditRegras(club.regras); setEditIsPublic(club.is_public) }} className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-red-500 bg-white/60 dark:bg-zinc-800/60 px-3 py-2 rounded-full transition-colors">
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
          className="block bg-fuchsia-50 dark:bg-fuchsia-500/5 border border-fuchsia-100 dark:border-fuchsia-500/20 rounded-3xl p-5 mb-6 flex items-center gap-4 hover:shadow-md hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-fuchsia-100/50 dark:border-fuchsia-500/20 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
            {admin.photo_url ? <img src={admin.photo_url} alt={admin.name} className="w-full h-full object-cover" /> : <Crown className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-fuchsia-700/60 dark:text-fuchsia-400/60 uppercase tracking-wider mb-0.5">Administrador</p>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">{admin.name || 'Corredor'}</p>
            {admin.cidade && <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">{admin.cidade}</p>}
          </div>
          {admin.pace_medio && (
            <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-3 py-2 flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Pace</p>
              <p className="text-sm font-black text-zinc-900 dark:text-white">{admin.pace_medio}</p>
            </div>
          )}
        </Link>
      )}
      
      {/* About Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Sobre</h2>
        </div>
        {editing ? (
          <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="w-full rounded-2xl p-4 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all resize-none dark:text-zinc-100" />
        ) : (
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{club.description}</p>
        )}
      </div>

      {/* Gamification Navigation */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link
          to={`/clubs/${id}/challenges`}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-500/30 flex flex-col items-start gap-4 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
            <Target className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="w-full">
            <div className="flex justify-between items-center mb-1">
              <p className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Desafios</p>
              <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-emerald-500 transition-colors" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Metas e conquistas</p>
          </div>
        </Link>
        <Link
          to={`/clubs/${id}/rewards`}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 hover:shadow-md hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30 flex flex-col items-start gap-4 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-100 dark:border-fuchsia-500/20">
            <Gift className="w-6 h-6 text-fuchsia-500" />
          </div>
          <div className="w-full">
            <div className="flex justify-between items-center mb-1">
              <p className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">Prêmios</p>
              <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-fuchsia-500 transition-colors" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Recompensas</p>
          </div>
        </Link>
      </div>

      {/* Admin Management Section */}
      {isAdmin && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-800/70 dark:text-purple-400/70">Gerenciamento (Admin)</h2>
          </div>

          <div className="space-y-6">
            {/* Invite: buscar corredor */}
            <div>
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">Convidar Usuário</h3>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-3">Busque um corredor por nome ou convide por ID / e-mail.</p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <Input
                  value={inviteRunnerSearch}
                  onChange={(e) => setInviteRunnerSearch(e.target.value)}
                  placeholder="Buscar corredor por nome..."
                  className="pl-9 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-sm h-11"
                />
                {inviteRunnerSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {inviteRunnerResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 divide-y divide-zinc-100 dark:divide-zinc-700 mb-3">
                  {inviteRunnerResults.map((runner) => (
                    <div
                      key={runner.id}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                        {runner.photo_url ? (
                          <img src={runner.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-full h-full text-zinc-400 dark:text-zinc-500 p-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{runner.name || 'Corredor'}</p>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                          {runner.cidade && <span>{runner.cidade}</span>}
                          {runner.pace_medio && <span>• {runner.pace_medio}/km</span>}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleInviteRunner(runner)}
                        disabled={inviting}
                        className="rounded-lg px-3 py-1.5 h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                      >
                        {inviting ? '...' : 'Convidar'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">Ou por ID / e-mail:</span>
                <Input
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  placeholder="ID (UUID) ou e-mail"
                  className="flex-1 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-sm h-10 min-w-0"
                />
                <Button onClick={handleInvite} type="button" disabled={inviting || !inviteUserId.trim()} className="rounded-xl px-4 h-10 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0">
                  {inviting ? '...' : 'Convidar'}
                </Button>
              </div>
            </div>

            {/* Pending Requests */}
            {pendingMembers.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                  <span>Solicitações Pendentes</span>
                  <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-[10px]">{pendingMembers.length}</span>
                </h3>
                <div className="space-y-2">
                  {pendingMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                          {member.photo_url ? <img src={member.photo_url} className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full text-zinc-400 dark:text-zinc-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{member.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate" title={member.id}>{member.id}</p>
                        </div>
                      </div>
                      <button onClick={() => handleAcceptMember(member.id)} className="text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors shrink-0 shadow-sm">
                        Aceitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules Card */}
      <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/20 rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange-800/70 dark:text-orange-400/70">Regras do Clube</h2>
        </div>
        {editing ? (
          <textarea value={editRegras} onChange={(e) => setEditRegras(e.target.value)} rows={3} className="w-full rounded-2xl p-4 text-sm bg-white dark:bg-zinc-800 border border-orange-200 dark:border-orange-900/30 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-none dark:text-zinc-100 shadow-sm" />
        ) : (
          <div className="bg-white/60 dark:bg-black/20 rounded-2xl p-4 border border-orange-100/50 dark:border-orange-900/10">
            <p className="text-orange-900/80 dark:text-orange-200/80 text-sm font-medium leading-relaxed whitespace-pre-wrap">{club.regras}</p>
          </div>
        )}
      </div>

      {/* Ranking Section */}
      <div id="ranking">
        <TelaRanking clubId={id} />
      </div>

      {/* Members Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 mt-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Users className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Membros</h2>
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
            {members.length}
          </span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <UserCircle className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-zinc-400 dark:text-zinc-500 text-xs font-medium">Nenhum membro ainda. Seja o primeiro!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Link
                key={member.id}
                to={`/runners/${member.id}`}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:shadow-sm border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 active:scale-[0.99] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 border border-fuchsia-100/50 dark:border-fuchsia-500/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-fuchsia-400 dark:text-fuchsia-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-fuchsia-600 transition-colors">{member.name || 'Corredor'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {member.cidade && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {member.cidade}
                      </span>
                    )}
                    {member.pace_medio && (
                      <span className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-semibold bg-fuchsia-50 dark:bg-fuchsia-500/10 px-1.5 py-0.5 rounded-md">
                        {member.pace_medio}
                      </span>
                    )}
                  </div>
                </div>
                {member.id === club.admin_id && (
                  <span className="text-[9px] font-bold text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-100 dark:bg-fuchsia-900/30 px-2.5 py-1 rounded-full uppercase tracking-wider">Admin</span>
                )}
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
