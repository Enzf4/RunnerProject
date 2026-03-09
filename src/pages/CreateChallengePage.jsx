import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Target, Save, Check, Calendar, Zap } from 'lucide-react'
import { useToast } from '../components/Toast'

export function CreateChallengePage() {
  const { id: clubId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [club, setClub] = useState(null)

  const [form, setForm] = useState({
    title: '',
    challenge_type: 'distance',
    target_value: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      const { data: clubData } = await supabase
        .from('clubs')
        .select('id, name, admin_id')
        .eq('id', clubId)
        .single()

      if (!clubData || !user || user.id !== clubData.admin_id) {
        navigate(`/clubs/${clubId}`)
        return
      }
      setClub(clubData)
    }
    checkAdmin()
  }, [clubId, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.target_value || !form.start_date || !form.end_date) {
      toast.error('Preencha todos os campos.')
      return
    }
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase
        .from('challenges')
        .insert([{
          club_id: clubId,
          title: form.title,
          challenge_type: form.challenge_type,
          target_value: parseFloat(form.target_value),
          start_date: form.start_date,
          end_date: form.end_date,
        }])

      if (error) throw error

      setSaved(true)
      toast.success('Desafio criado com sucesso!')
      setTimeout(() => navigate(`/clubs/${clubId}/challenges`), 1200)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!club) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-pastel-lavender border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-5 lg:px-8 pt-6 pb-4 animate-fade-in-up">
      <button
        onClick={() => navigate(`/clubs/${clubId}/challenges`)}
        className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-pastel-green/40 dark:bg-green-900/30 flex items-center justify-center shadow-clay-sm dark:shadow-none">
          <Target className="w-6 h-6 text-green-700 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Novo Desafio</h1>
          <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">{club.name}</p>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.8rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Título do Desafio
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Corra 5km nesta semana"
              className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Tipo
              </Label>
              <select
                id="type"
                value={form.challenge_type}
                onChange={(e) => setForm(prev => ({ ...prev, challenge_type: e.target.value }))}
                className="w-full rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none px-4 text-sm focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 dark:focus:ring-purple-500/30 transition-all dark:text-zinc-100"
              >
                <option value="distance">Distância (km)</option>
                <option value="pace">Pace (min/km)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Meta
              </Label>
              <Input
                id="target"
                type="number"
                step="0.1"
                value={form.target_value}
                onChange={(e) => setForm(prev => ({ ...prev, target_value: e.target.value }))}
                placeholder="Ex: 5"
                className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Início
              </Label>
              <Input
                id="start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Fim
              </Label>
              <Input
                id="end"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className={`w-full rounded-2xl h-12 text-sm font-bold shadow-xl dark:shadow-none transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-green-600 hover:bg-green-600 text-white'
                : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white active:scale-[0.98] text-white dark:text-zinc-900'
            }`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <><Check className="w-4 h-4" /> Criado!</>
            ) : (
              <><Save className="w-4 h-4" /> Criar Desafio</>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
