import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Gift, Save, Check, Target, Image, Hash, AlignLeft } from 'lucide-react'
import { useToast } from '../components/Toast'

export function CreateRewardPage() {
  const { id: clubId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preSelectedChallengeId = searchParams.get('challenge')
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [club, setClub] = useState(null)
  const [challenges, setChallenges] = useState([])
  
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    challenge_id: preSelectedChallengeId || '',
    monthly_limit: 10,
  })

  useEffect(() => {
    async function checkAdminAndFetch() {
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

      const { data: challengesData } = await supabase
        .from('challenges')
        .select('id, title')
        .eq('club_id', clubId)
      setChallenges(challengesData || [])
      
      if (challengesData && challengesData.length > 0 && !preSelectedChallengeId) {
        setForm(prev => ({ ...prev, challenge_id: challengesData[0].id }))
      }
    }
    checkAdminAndFetch()
  }, [clubId, navigate, preSelectedChallengeId])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.challenge_id) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }
    setSaving(true)
    setSaved(false)
    try {
      let uploadedImageUrl = null

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${clubId}/${fileName}`
        
        // Vamos usar o bucket 'rewards' para armazenar as imagens.
        // Certifique-se de que este bucket exista e tenha políticas públicas de leitura/escrita apropriadas.
        const { error: uploadError } = await supabase.storage
          .from('rewards')
          .upload(filePath, imageFile, { upsert: true })

        if (uploadError) {
          console.error("Upload Error:", uploadError)
          toast.error("Erro ao fazer upload da imagem.")
          setSaving(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('rewards')
          .getPublicUrl(filePath)
          
        uploadedImageUrl = publicUrl
      }

      const { error } = await supabase
        .from('rewards')
        .insert([{
          club_id: clubId,
          challenge_id: form.challenge_id,
          title: form.title,
          description: form.description,
          monthly_limit: parseInt(form.monthly_limit) || 10,
          image_url: uploadedImageUrl,
        }])

      if (error) throw error

      setSaved(true)
      toast.success('Prêmio criado com sucesso!')
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
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shadow-clay-sm dark:shadow-none">
          <Gift className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Novo Prêmio</h1>
          <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">{club.name}</p>
        </div>
      </div>
      
      {/* Upload de Imagem Visual */}
      <div className="flex justify-center mb-6">
        <label className="relative cursor-pointer group">
          <div className="w-24 h-24 rounded-[1.4rem] bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex items-center justify-center overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-600 group-hover:border-amber-400 transition-all">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Image className="w-6 h-6 mx-auto text-zinc-300 dark:text-zinc-500 mb-1" />
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">Imagem</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageChange}
            className="hidden" 
          />
        </label>
      </div>

      <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.8rem] p-6 shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Nome do Prêmio
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Tênis de Corrida, Desconto..."
              className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Descrição
            </Label>
            <textarea 
              id="description" 
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhes sobre o prêmio..."
              rows={3}
              className="w-full rounded-2xl p-4 text-sm bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:focus:ring-amber-500/30 focus:bg-white dark:focus:bg-zinc-900 transition-all resize-none dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="challenge_id" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Desafio Vinculado
            </Label>
            <select
              id="challenge_id"
              value={form.challenge_id}
              onChange={(e) => setForm(prev => ({ ...prev, challenge_id: e.target.value }))}
              className="w-full rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:focus:ring-amber-500/30 transition-all dark:text-zinc-100"
            >
              {challenges.length === 0 ? (
                <option value="">Nenhum desafio encontrado</option>
              ) : (
                challenges.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="limit" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Limite Mensal
            </Label>
            <Input
              id="limit"
              type="number"
              value={form.monthly_limit}
              onChange={(e) => setForm(prev => ({ ...prev, monthly_limit: e.target.value }))}
              placeholder="Ex: 10"
              className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>

          <Button
            type="submit"
            disabled={saving || challenges.length === 0}
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
              <><Save className="w-4 h-4" /> Criar Prêmio</>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
