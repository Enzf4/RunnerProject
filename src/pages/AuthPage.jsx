import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, ArrowRight, Users, MapPin, Timer } from 'lucide-react'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setErrorMsg('')
        alert('Verifique seu email para confirmar o cadastro!')
      }
    } catch (error) {
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) setErrorMsg(error.message)
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(135deg, #E6E6FA 0%, #FFDAB9 50%, #B0E0E6 100%)' }}
    >
      {/* Floating 3D Abstract Shapes */}
      <div className="absolute top-10 left-6 w-28 h-28 rounded-[2rem] bg-pastel-peach/60 shadow-clay-sm animate-float rotate-12 blur-[1px]" />
      <div className="absolute top-32 right-8 w-20 h-20 rounded-full bg-pastel-blue/70 shadow-clay-sm animate-float-reverse blur-[0.5px]" />
      <div className="absolute bottom-24 left-10 w-16 h-16 rounded-2xl bg-pastel-lavender/80 shadow-clay-sm animate-float-reverse rotate-45" />
      <div className="absolute bottom-40 right-6 w-24 h-24 rounded-[1.5rem] bg-pastel-green/50 shadow-clay-sm animate-float rotate-[-20deg]" />
      <div className="absolute top-1/2 left-4 w-12 h-12 rounded-xl bg-pastel-pink/60 shadow-clay-sm animate-float rotate-[30deg]" />

      {/* Main Card */}
      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-zinc-900 shadow-2xl mb-4">
            <Users className="w-10 h-10 text-pastel-lavender" />
          </div>
          <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight leading-none">
            Runner Hub
          </h1>
          <p className="text-zinc-600 mt-2 text-sm font-medium">
            Encontre sua tribo pelo pace e localização
          </p>
        </div>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-[1.2rem] p-3 shadow-clay-sm text-center animate-pulse-soft" style={{ animationDelay: '0s' }}>
            <Users className="w-5 h-5 mx-auto text-purple-600 mb-1" />
            <span className="text-xs font-bold text-zinc-700 block">Clubs</span>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-[1.2rem] p-3 shadow-clay-sm text-center animate-pulse-soft" style={{ animationDelay: '1s' }}>
            <Timer className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <span className="text-xs font-bold text-zinc-700 block">Pace</span>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-[1.2rem] p-3 shadow-clay-sm text-center animate-pulse-soft" style={{ animationDelay: '2s' }}>
            <MapPin className="w-5 h-5 mx-auto text-orange-600 mb-1" />
            <span className="text-xs font-bold text-zinc-700 block">City</span>
          </div>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-7 shadow-clay">
          <h2 className="text-xl font-bold text-zinc-900 mb-1">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="text-zinc-500 text-sm mb-6">
            {isLogin ? 'Entre para continuar correndo.' : 'Junte-se à comunidade de corredores.'}
          </p>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full rounded-2xl h-12 text-sm font-bold bg-white border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] text-zinc-700 shadow-sm transition-all flex items-center justify-center gap-3 mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-zinc-200" />
            <span className="text-xs text-zinc-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-600 text-xs font-semibold ml-1 uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="rounded-2xl h-12 pl-11 bg-zinc-50/80 border-zinc-200/80 shadow-inner focus:bg-white transition-all"
                  placeholder="runner@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-600 text-xs font-semibold ml-1 uppercase tracking-wider">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={6}
                  className="rounded-2xl h-12 pl-11 bg-zinc-50/80 border-zinc-200/80 shadow-inner focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-red-600 text-sm font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">
                {errorMsg}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-2xl h-12 text-sm font-bold bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar Conta'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg('') }}
              className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500/70 text-xs mt-6 font-medium">
          Strava encontra Meetup — para corredores de verdade.
        </p>
      </div>
    </div>
  )
}
