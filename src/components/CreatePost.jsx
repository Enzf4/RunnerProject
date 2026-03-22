import { useState, useRef } from 'react'
import { uploadPostImage, createPost } from '../lib/postApi'
import { useToast } from '../components/Toast'
import { 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Calendar
} from 'lucide-react'

export function Avatar({ src, name, size = 'md' }) {
  const sizes = { 
    sm: 'w-8 h-8 text-xs', 
    md: 'w-10 h-10 text-sm', 
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg'
  }
  const initials = (name || '?').slice(0, 2).toUpperCase()
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
      />
    )
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials}
    </div>
  )
}

export function CreatePost({ currentUser, currentProfile, challenges, onPostCreated }) {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [shareAfterPost, setShareAfterPost] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [selectedChallengeId, setSelectedChallengeId] = useState('')
  const fileInputRef = useRef(null)
  const { toast } = useToast()
  const textareaRef = useRef(null)

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async () => {
    if (!caption.trim() && !file) return
    if (!currentUser?.id) {
      toast.error('Faça login para postar')
      return
    }

    setUploading(true)
    try {
      let imageUrl = null
      if (file) {
        imageUrl = await uploadPostImage(file)
      }

      const postData = {
        imageUrl,
        caption: caption.trim() || null,
        challengeId: selectedChallengeId || null,
        activityId: null,
      }

      const newPost = await createPost(postData, currentUser.id)
      
      // Enrich with profile data
      const enriched = {
        ...newPost,
        likeCount: 0,
        likedByMe: false,
        profiles: currentProfile
          ? { name: currentProfile.name, photo_url: currentProfile.photo_url }
          : null,
      }

      onPostCreated(enriched, { shareAfterPost })
      
      // Reset
      setCaption('')
      setFile(null)
      setPreview(null)
      setSelectedChallengeId('')
      setShareAfterPost(false)
      toast.success('Post publicado!')
    } catch (err) {
      toast.error(err.message || 'Erro ao publicar')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isDisabled = uploading || (!caption.trim() && !file)
  const charCount = caption.length
  const maxChars = 280

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.6rem] p-4 shadow-clay-sm dark:shadow-none mb-6">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <Avatar src={currentProfile?.photo_url} name={currentProfile?.name} size="md" />
        </div>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, maxChars))}
            placeholder="Compartilhe seu treino..."
            className="w-full bg-transparent text-base text-zinc-900 dark:text-white placeholder-zinc-400 resize-none outline-none min-h-[60px]"
            rows={2}
          />
          
          {/* Image Preview */}
          {preview && (
            <div className="relative mt-3 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
              <img src={preview} alt="Preview" className="w-full max-h-[300px] object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-2 left-2 p-1.5 bg-zinc-900/70 hover:bg-zinc-900 text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Challenge Selector */}
          {showPicker && challenges.length > 0 && (
            <div className="mt-3 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs font-semibold text-zinc-500 mb-2 px-2">Selecionar desafio</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                <button
                  onClick={() => { setSelectedChallengeId(''); setShowPicker(false) }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    !selectedChallengeId ? 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Nenhum desafio
                </button>
                {challenges.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedChallengeId(c.id); setShowPicker(false) }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedChallengeId === c.id ? 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Challenge */}
          {selectedChallengeId && !showPicker && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full w-fit">
              <Calendar className="w-3.5 h-3.5" />
              <span>{challenges.find(c => c.id === selectedChallengeId)?.title}</span>
              <button onClick={() => setSelectedChallengeId('')} className="text-emerald-400 hover:text-emerald-600 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !!preview}
                  className="p-2 text-fuchsia-500 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 rounded-full transition-colors disabled:opacity-50"
                  title="Adicionar imagem"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  disabled={uploading || challenges.length === 0}
                  className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-colors disabled:opacity-50"
                  title="Adicionar desafio"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shareAfterPost}
                  onChange={(e) => setShareAfterPost(e.target.checked)}
                  disabled={uploading}
                  className="w-4 h-4 rounded border-zinc-300 text-fuchsia-600 focus:ring-fuchsia-500"
                />
                Compartilhar no Instagram após publicar
              </label>
            </div>

            <div className="flex items-center gap-3">
              {/* Character Count */}
              {charCount > 0 && (
                <span className={`text-xs ${charCount > maxChars * 0.8 ? 'text-amber-500' : 'text-zinc-400'}`}>
                  {maxChars - charCount}
                </span>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={isDisabled}
                className="px-5 py-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white dark:text-zinc-900 font-bold text-sm rounded-full transition-all disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Publicar'
                )}
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>
    </div>
  )
}
