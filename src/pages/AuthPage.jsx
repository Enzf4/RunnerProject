import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, ArrowRight, Users, MapPin, Timer } from 'lucide-react'
import { useToast } from '../components/Toast'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()
  const { toast } = useToast()

  const words = ['experientes', 'iniciantes', 'dedicados', 'apaixonados', 'de verdade']
  const [wordIndex, setWordIndex] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setWordIndex(prev => (prev + 1) % words.length)
        setFade(true)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

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
        toast.success('Verifique seu email para confirmar o cadastro!')
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
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-6 py-12 bg-zinc-50 dark:bg-zinc-950"
    >
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-fuchsia-300/20 dark:bg-fuchsia-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[55%] h-[55%] rounded-full bg-green-300/20 dark:bg-green-400/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40%] h-[30%] rounded-full bg-purple-300/15 dark:bg-purple-500/8 blur-[80px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[25%] rounded-full bg-orange-300/15 dark:bg-orange-400/6 blur-[80px] animate-pulse-soft" />
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }} />

      {/* Main Card */}
      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-zinc-900 dark:bg-white/10 dark:backdrop-blur-sm border border-zinc-800 dark:border-white/10 shadow-2xl mb-4">
            <Users className="w-10 h-10 text-fuchsia-300 dark:text-fuchsia-400" />
          </div>
          <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none">
            Runner Hub
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">
            Encontre sua tribo pelo pace e localização
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-[2rem] p-7 border border-zinc-200/60 dark:border-white/10 shadow-clay-sm dark:shadow-none">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
            {isLogin ? 'Entre para continuar correndo.' : 'Junte-se à comunidade de corredores.'}
          </p>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full rounded-2xl h-12 text-sm font-bold bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/15 active:scale-[0.98] text-zinc-700 dark:text-white shadow-sm dark:shadow-none transition-all flex items-center justify-center gap-3 mb-5"
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
            <div className="flex-1 h-px bg-zinc-200 dark:bg-white/10" />
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">ou</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-white/10" />
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-600 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="rounded-2xl h-12 pl-11 bg-zinc-50/80 dark:bg-white/5 border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-white/10 shadow-inner dark:shadow-none transition-all"
                  placeholder="runner@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-600 dark:text-zinc-400 text-xs font-semibold ml-1 uppercase tracking-wider">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={6}
                  className="rounded-2xl h-12 pl-11 bg-zinc-50/80 dark:bg-white/5 border-zinc-200/80 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-white/10 shadow-inner dark:shadow-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isLogin && (
              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) { setErrorMsg('Digite seu email acima para recuperar a senha.'); return }
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: window.location.origin
                    })
                    if (error) setErrorMsg(error.message)
                    else { setErrorMsg(''); toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.') }
                  }}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="text-red-600 dark:text-red-400 text-sm font-medium text-center bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-100 dark:border-red-500/20">
                {errorMsg}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-2xl h-12 text-sm font-bold bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] text-white dark:text-zinc-900 shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-white dark:border-zinc-300 dark:border-t-zinc-900 rounded-full animate-spin" />
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
              className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-400 dark:text-zinc-600 text-xs mt-6 font-medium">
          Para corredores <span className={`inline-block transition-all duration-300 ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>{words[wordIndex]}</span>.
        </p>
      </div>
    </div>
  )
}
