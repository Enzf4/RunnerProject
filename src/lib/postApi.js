import { supabase } from './supabase'
import html2canvas from 'html2canvas'

const API_BASE_URL = 'https://api-projetointegrador-kmmg.onrender.com'


// ── Fluxo 1: Upload de imagem ─────────────────────────────────────────────────

export async function uploadPostImage(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`

  const { error } = await supabase.storage
    .from('post_images')
    .upload(fileName, file)

  if (error) {
    throw new Error(`Erro no upload da imagem: ${error.message}`)
  }

  const { data: publicUrlData } = supabase.storage
    .from('post_images')
    .getPublicUrl(fileName)

  return publicUrlData.publicUrl
}

// ── Fluxo 1: Criar Post na API C# (SEM autenticação JWT) ─────────────────────

export async function createPost(postData, userId) {
  const url = `${API_BASE_URL}/api/Post`
  const payload = {
    userId,
    imageUrl: postData.imageUrl || '',
    caption: postData.caption || null,
    challengeId: postData.challengeId || null,
    activityId: postData.activityId || null,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(error.error || `Erro ${response.status}`)
  }

  return response.json()
}

// ── Fluxo 2: Toggle Like na API C# (SEM autenticação JWT) ────────────────────

export async function togglePostLike(postId, userId) {
  const url = `${API_BASE_URL}/api/Post/${userId}/${postId}/like`

  const response = await fetch(url, {
    method: 'POST'
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(error.error || `Erro ${response.status}`)
  }

  return response.json()
}

// ── Fluxo 3: Partilha nativa (Web Share API + html2canvas) ───────────────────

export async function sharePost(postElementId, postTitle) {
  const element = document.getElementById(postElementId)
  if (!element) return

  try {
    const canvas = await html2canvas(element, { useCORS: true })

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'runapp-post.png', { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'O meu treino no RunApp!',
          text: postTitle || 'Olha o meu resultado!',
          files: [file],
        })
      } else {
        const link = document.createElement('a')
        link.download = 'runapp-post.png'
        link.href = canvas.toDataURL()
        link.click()
      }
    })
  } catch (error) {
    console.error('Erro ao partilhar o post:', error)
    throw error
  }
}

// ── Feed: Buscar posts do Supabase diretamente ────────────────────────────────

export async function fetchFeedPosts(currentUserId, page = 0, pageSize = 10) {
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      id,
      image_url,
      caption,
      activity_id,
      challenge_id,
      created_at,
      user_id,
      profiles:user_id ( name, photo_url, cidade ),
      challenges:challenge_id ( id, title, club_id )
    `)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

  const postIds = posts.map((p) => p.id)

  const [likesRes, myLikesRes] = await Promise.all([
    supabase
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds.length ? postIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds.length ? postIds : ['00000000-0000-0000-0000-000000000000']),
  ])

  const likeCounts = {}
  const likedByMe = new Set()

  ;(likesRes.data || []).forEach((l) => {
    likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1
  })
  ;(myLikesRes.data || []).forEach((l) => likedByMe.add(l.post_id))

  return posts.map((p) => ({
    ...p,
    likeCount: likeCounts[p.id] || 0,
    likedByMe: likedByMe.has(p.id),
  }))
}

// ── Perfil: Buscar posts de um usuário específico ────────────────────────────────

export async function fetchUserPosts(userId, currentUserId, page = 0, pageSize = 10) {
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      id,
      image_url,
      caption,
      activity_id,
      challenge_id,
      created_at,
      user_id,
      profiles:user_id ( name, photo_url, cidade ),
      challenges:challenge_id ( id, title, club_id )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

  const postIds = posts.map((p) => p.id)

  const [likesRes, myLikesRes] = await Promise.all([
    supabase
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds.length ? postIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds.length ? postIds : ['00000000-0000-0000-0000-000000000000']),
  ])

  const likeCounts = {}
  const likedByMe = new Set()

  ;(likesRes.data || []).forEach((l) => {
    likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1
  })
  ;(myLikesRes.data || []).forEach((l) => likedByMe.add(l.post_id))

  return posts.map((p) => ({
    ...p,
    likeCount: likeCounts[p.id] || 0,
    likedByMe: likedByMe.has(p.id),
  }))
}
