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

export async function sharePostToInstagramStory(post, authorProfile = null) {
  const authorName = post?.profiles?.name || authorProfile?.name || 'Corredor'
  const authorCity = post?.profiles?.cidade || authorProfile?.cidade || ''
  const challengeTitle = post?.challenges?.title || ''
  const caption = post?.caption || ''
  const displayCaption = caption.length > 120 ? `${caption.slice(0, 117)}...` : caption

  // Helper to create elements
  const create = (tag, styles, text) => {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(styles)) el.style[k] = v
    if (text) el.textContent = text
    return el
  }

  // Root container - 9:16 story format
  const root = create('div', {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: '1080px',
    height: '1920px',
    background: '#0a0a0f',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  })

  // Top section: Logo + City
  const top = create('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '60px 64px 40px',
  })
  
  top.appendChild(create('div', {
    fontSize: '40px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  }, 'RunApp'))

  if (authorCity) {
    top.appendChild(create('div', {
      fontSize: '24px',
      fontWeight: '500',
      color: 'rgba(255,255,255,0.6)',
      padding: '6px 16px',
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '20px',
    }, authorCity))
  }
  root.appendChild(top)

  // Image section - centered, preserves aspect ratio
  if (post?.image_url) {
    const imgWrapper = create('div', {
      flex: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 64px',
      minHeight: '0',
    })

    const img = create('img', {
      maxWidth: '952px',
      maxHeight: '100%',
      width: 'auto',
      height: 'auto',
      borderRadius: '24px',
    })
    img.src = post.image_url
    img.crossOrigin = 'anonymous'
    imgWrapper.appendChild(img)
    root.appendChild(imgWrapper)
  } else {
    // No image fallback
    const fallback = create('div', {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 64px',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      margin: '0 64px',
      borderRadius: '24px',
    })
    fallback.appendChild(create('div', { fontSize: '80px', marginBottom: '24px' }, '🏃'))
    if (caption) {
      fallback.appendChild(create('div', {
        fontSize: '36px',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: '1.4',
        color: 'rgba(255,255,255,0.8)',
      }, caption))
    }
    root.appendChild(fallback)
  }

  // Bottom section: Author info
  const bottom = create('div', {
    padding: '48px 64px 72px',
  })

  // Author name
  bottom.appendChild(create('div', {
    fontSize: '56px',
    fontWeight: '700',
    letterSpacing: '-1px',
    marginBottom: '12px',
  }, authorName))

  // Caption
  if (displayCaption) {
    bottom.appendChild(create('div', {
      fontSize: '26px',
      fontWeight: '400',
      lineHeight: '1.4',
      color: 'rgba(255,255,255,0.5)',
      marginBottom: '16px',
    }, displayCaption))
  }

  // Challenge badge
  if (challengeTitle) {
    bottom.appendChild(create('div', {
      display: 'inline-block',
      fontSize: '22px',
      fontWeight: '600',
      color: '#c084fc',
      background: 'rgba(192,132,252,0.15)',
      padding: '8px 16px',
      borderRadius: '16px',
      marginBottom: '20px',
    }, `🏁 ${challengeTitle}`))
  }

  // Brand line
  const brand = create('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  })
  brand.appendChild(create('div', {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#c084fc',
  }))
  brand.appendChild(create('div', {
    fontSize: '20px',
    color: 'rgba(255,255,255,0.35)',
  }, 'Compartilhado pelo RunApp'))
  bottom.appendChild(brand)

  root.appendChild(bottom)
  document.body.appendChild(root)

  try {
    const imgs = root.querySelectorAll('img')
    await Promise.all(
      [...imgs].map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.onload = res
                img.onerror = res
                setTimeout(res, 4000)
              })
      )
    )

    const canvas = await html2canvas(root, { useCORS: true, scale: 1, allowTaint: false })
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), 'image/png')
    })

    const file = new File([blob], 'runapp-story.png', { type: 'image/png' })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Meu treino no RunApp',
        text: caption || `Treino de ${authorName}`,
        files: [file],
      })
      return
    }

    const link = document.createElement('a')
    link.download = 'runapp-story.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    root.remove()
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
