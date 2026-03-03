import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SplashScreen } from './SplashScreen'

export function AuthGuard({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [showSplash, setShowSplash] = useState(true)

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-pastel-lavender border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {children}
    </>
  )
}
