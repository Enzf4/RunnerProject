import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, Type, FileText, ShieldCheck, Image, ArrowRight, MapPin } from 'lucide-react'
import { useToast } from '../components/Toast'

export function CreateClubPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cidade, setCidade] = useState('')
  const [regras, setRegras] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Você precisa estar logado para criar um clube.')

      const { data: newClub, error: dbError } = await supabase
        .from('clubs')
        .insert([{
          name,
          description,
          cidade,
          regras,
          admin_id: user.id
        }])
        .select()
        .single()
        
      if (dbError) throw dbError

      if (logoFile) {
        const filePath = `${newClub.id}/logo.png`
        const { error: uploadError } = await supabase.storage
          .from('club_logos')
          .upload(filePath, logoFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('club_logos')
          .getPublicUrl(filePath)

        const { error: updateError } = await supabase
          .from('clubs')
          .update({ logo_url: publicUrl })
          .eq('id', newClub.id)

        if (updateError) throw updateError
      }

      navigate(`/clubs/${newClub.id}`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-5 pt-8 pb-4 animate-fade-in-up">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-pastel-peach" />
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Novo</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Criar Clube</h1>
        <p className="text-zinc-400 dark:text-zinc-500 mt-1 text-sm font-medium">Comece sua própria comunidade de corrida.</p>
      </header>
      
      {/* Logo Upload */}
      <div className="flex justify-center mb-6">
        <label className="relative cursor-pointer group">
          <div className="w-24 h-24 rounded-[1.4rem] bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm shadow-clay-sm dark:shadow-none dark:border dark:border-zinc-700/40 flex items-center justify-center overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-600 group-hover:border-pastel-lavender dark:group-hover:border-purple-400 transition-all">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Image className="w-6 h-6 mx-auto text-zinc-300 dark:text-zinc-500 mb-1" />
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">Logo</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleLogoChange}
            className="hidden" 
          />
        </label>
      </div>

      <div className="bg-white/70 dark:bg-zinc-800/60 backdrop-blur-sm rounded-[1.8rem] p-6 shadow-clay dark:shadow-none dark:border dark:border-zinc-700/40">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Nome do Clube
            </Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Ibirapuera Speed Runners"
              className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cidade" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Cidade
            </Label>
            <Input 
              id="cidade" 
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: São Paulo"
              className="rounded-2xl h-12 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Descrição
            </Label>
            <textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Sobre o que é o seu clube..."
              className="w-full rounded-2xl p-4 text-sm bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 dark:focus:ring-purple-500/30 focus:bg-white dark:focus:bg-zinc-900 transition-all resize-none dark:text-zinc-100"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="regras" className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Regras
            </Label>
            <textarea 
              id="regras" 
              value={regras}
              onChange={(e) => setRegras(e.target.value)}
              required
              rows={2}
              placeholder="1. Não caminhar na subida"
              className="w-full rounded-2xl p-4 text-sm bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700/50 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 dark:focus:ring-purple-500/30 focus:bg-white dark:focus:bg-zinc-900 transition-all resize-none dark:text-zinc-100"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-2xl h-12 text-sm font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white active:scale-[0.98] text-white dark:text-zinc-900 shadow-xl dark:shadow-none transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
            ) : (
              <>
                Criar Clube
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
