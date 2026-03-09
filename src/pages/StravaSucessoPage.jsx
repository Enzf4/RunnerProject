import { Link } from 'react-router-dom'
import { CheckCircle, ArrowLeft } from 'lucide-react'

export function StravaSucessoPage() {
  return (
    <div className="px-5 lg:px-8 pt-16 pb-4 animate-fade-in-up flex flex-col items-center justify-center min-h-[70vh] text-center">
      {/* Success Icon */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-[2rem] bg-pastel-green/40 dark:bg-green-900/30 shadow-clay dark:shadow-none dark:border dark:border-green-800/30 flex items-center justify-center">
          <CheckCircle className="w-14 h-14 text-green-600 dark:text-green-400 animate-bounce" style={{ animationDuration: '2s' }} />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-orange-200/60 dark:bg-orange-900/30 flex items-center justify-center shadow-clay-sm dark:shadow-none">
          <span className="text-lg">🏃</span>
        </div>
      </div>

      {/* Text */}
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
        Strava Conectado!
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium max-w-xs mb-8">
        Sua conta do Strava foi vinculada com sucesso. Agora seus desafios serão sincronizados automaticamente com suas corridas.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/profile"
          className="flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold px-6 py-3.5 rounded-2xl shadow-xl transition-all active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o Perfil
        </Link>
      </div>
    </div>
  )
}
