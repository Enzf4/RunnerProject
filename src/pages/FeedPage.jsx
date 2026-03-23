import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { uploadPostImage, createPost, togglePostLike, fetchFeedPosts, sharePostToInstagramStory, fetchComments, addComment, deleteComment } from '../lib/postApi'
import { useToast } from '../components/Toast'
import { CreatePost, Avatar } from '../components/CreatePost'
import { 
  Heart, 
  Send,
  Calendar,
  Share2,
  Loader2,
  MessageCircle,
  Trash2
} from 'lucide-react'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function PostCard({ post, currentUserId, onLikeToggle, onShare }) {
  const [liked, setLiked] = useState(post.likedByMe)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [liking, setLiking] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const commentInputRef = useRef(null)

  const handleLike = async () => {
    if (liking) return
    setLiking(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1))
    try {
      await togglePostLike(post.id, currentUserId)
      onLikeToggle?.(post.id, !wasLiked)
    } catch {
      setLiked(wasLiked)
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1))
    } finally {
      setLiking(false)
    }
  }

  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const data = await fetchComments(post.id)
      const commentsArray = Array.isArray(data) ? data : []
      
      if (commentsArray.length > 0) {
        const userIds = [...new Set(commentsArray.map(c => c.user_id).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, photo_url')
            .in('id', userIds)
          
          const profilesMap = {}
          if (profilesData) {
            profilesData.forEach(p => {
              profilesMap[p.id] = p
            })
          }
          
          const enrichedComments = commentsArray.map(c => ({
            ...c,
            profiles: profilesMap[c.user_id] || c.profiles || {}
          }))
          setComments(enrichedComments)
        } else {
          setComments(commentsArray)
        }
      } else {
        setComments([])
      }
    } catch (err) {
      console.error('Erro ao carregar comentários:', err)
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      await loadComments()
    }
    setShowComments(!showComments)
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || submittingComment) return
    
    setSubmittingComment(true)
    try {
      const addedComment = await addComment(post.id, currentUserId, newComment.trim())
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, photo_url')
        .eq('id', currentUserId)
        .single()
      
      const commentWithProfile = {
        ...addedComment,
        profiles: profileData || { name: 'Você', photo_url: null }
      }
      
      setComments((prev) => [...prev, commentWithProfile])
      setNewComment('')
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(post.id, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      console.error('Erro ao excluir comentário:', err)
    }
  }

  const author = post.profiles || {}
  const authorId = post.user_id || author.id
  const canShare = currentUserId && post.user_id === currentUserId

  const handleShare = async () => {
    if (!canShare || sharing) return
    setSharing(true)
    if (sharing) return
    try {
      await sharePostToInstagramStory(post, author)
      onShare?.('success')
    } catch {
      onShare?.('error')
    } finally {
      setSharing(false)
    }
  }

  return (
    <article className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.6rem] p-4 shadow-clay-sm dark:shadow-none transition-all hover:shadow-md hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Link to={`/runners/${authorId}`}>
            <Avatar src={author.photo_url} name={author.name} size="md" />
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="font-bold text-zinc-900 dark:text-white truncate">
              {author.name || 'Corredor'}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500 text-xs">
              {timeAgo(post.created_at)}
            </span>
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
              {post.caption}
            </p>
          )}

          {/* Image */}
          {post.image_url && (
            <div className="mb-3 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
              <img
                src={post.image_url}
                alt="Post"
                className="w-full max-h-[400px] object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Challenge Badge */}
          {post.challenge_id && post.challenges?.club_id && (
            <Link
              to={`/clubs/${post.challenges.club_id}/challenges`}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-1.5 rounded-full w-fit transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{post.challenges?.title || 'Ver desafio'}</span>
            </Link>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-1.5 text-sm font-medium transition-all ${
                liked 
                  ? 'text-red-500' 
                  : 'text-zinc-500 hover:text-red-400 dark:text-zinc-400 dark:hover:text-red-400'
              }`}
            >
              <Heart className={`w-5 h-5 transition-all ${liked ? 'fill-current scale-110' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            
            <button
              onClick={handleToggleComments}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-fuchsia-500 dark:text-zinc-400 dark:hover:text-fuchsia-400 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Comentários</span>
            </button>
            
            {canShare && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-fuchsia-500 dark:text-zinc-400 dark:hover:text-fuchsia-400 transition-all disabled:opacity-60"
              >
                <Share2 className="w-5 h-5" />
                <span>{sharing ? 'Compartilhando...' : 'Compartilhar'}</span>
              </button>
            )}
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              {/* Comment Input */}
              <form onSubmit={handleSubmitComment} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="flex-1 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-fuchsia-500 dark:text-white placeholder-zinc-400"
                  disabled={submittingComment}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="px-4 py-2 bg-fuchsia-600 text-white text-sm font-medium rounded-full hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
                </button>
              </form>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {comments.map((comment) => {
                    const commentAuthor = comment.profiles || {}
                    const isOwner = comment.user_id === currentUserId
                    const isPostOwner = post.user_id === currentUserId
                    const canDelete = isOwner || isPostOwner
                    return (
                      <div key={comment.id} className="flex gap-2 items-start">
                        <Link to={`/runners/${comment.user_id}`}>
                          <Avatar 
                            src={commentAuthor.photo_url} 
                            name={commentAuthor.name || 'U'} 
                            size="sm" 
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link 
                              to={`/runners/${comment.user_id}`}
                              className="text-sm font-semibold text-zinc-900 dark:text-white hover:underline"
                            >
                              {commentAuthor.name || 'Usuário'}
                            </Link>
                            <span className="text-xs text-zinc-400">
                              {timeAgo(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5 break-words">
                            {comment.content}
                          </p>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                            title="Excluir comentário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-2">
                  Nenhum comentário ainda. Seja o primeiro a comentar!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentProfile, setCurrentProfile] = useState(null)
  const [challenges, setChallenges] = useState([])
  const { toast } = useToast()
  const PAGE_SIZE = 10

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setCurrentUser(user)

      const [profileRes, clubsRes] = await Promise.all([
        supabase.from('profiles').select('name, photo_url, cidade').eq('id', user.id).single(),
        supabase.from('clubs').select('id'),
      ])
      setCurrentProfile(profileRes.data)

      if (clubsRes.data?.length) {
        const clubIds = clubsRes.data.map((c) => c.id)
        const { data: challengesData } = await supabase
          .from('challenges')
          .select('id, title')
          .in('club_id', clubIds)
        setChallenges(challengesData || [])
      }

      try {
        const data = await fetchFeedPosts(user.id, 0, PAGE_SIZE)
        setPosts(data)
        setHasMore(data.length === PAGE_SIZE)
      } catch (err) {
        toast.error('Erro ao carregar o feed.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !currentUser) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const data = await fetchFeedPosts(currentUser.id, nextPage, PAGE_SIZE)
      setPosts((prev) => [...prev, ...data])
      setPage(nextPage)
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      toast.error('Erro ao carregar mais posts.')
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, currentUser, page])

  const handlePostCreated = async (newPost, options = {}) => {
    setPosts((prev) => [newPost, ...prev])

    if (options.shareAfterPost) {
      try {
        await sharePostToInstagramStory(newPost, currentProfile)
        toast.success('Compartilhamento iniciado com sucesso!')
      } catch {
        toast.error('Não foi possível compartilhar o post.')
      }
    }
  }

  const handleShareFeedback = (status) => {
    if (status === 'success') {
      toast.success('Compartilhamento iniciado com sucesso!')
      return
    }
    toast.error('Não foi possível compartilhar o post.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mb-2">Feed</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Faça login para ver o feed</p>
      </div>
    )
  }

  return (
    <div className="px-5 lg:px-8 pt-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Feed</h1>
          <p className="text-zinc-400 dark:text-zinc-500 mt-1 text-sm font-medium">Veja os treinos da comunidade</p>
        </div>
      </div>

      {/* Create Post */}
      <CreatePost 
        currentUser={currentUser}
        currentProfile={currentProfile}
        challenges={challenges}
        onPostCreated={handlePostCreated}
      />

      {/* Feed */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-fuchsia-100 dark:bg-fuchsia-900/20 flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-fuchsia-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              Bem-vindo ao Feed!
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xs text-sm">
              Este é o lugar onde você verá as postagens dos corredores. Comece compartilhando seu primeiro treino!
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
                onLikeToggle={() => {}}
                onShare={handleShareFeedback}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="py-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-semibold text-sm rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando...
                    </span>
                  ) : (
                    'Mostrar mais'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
