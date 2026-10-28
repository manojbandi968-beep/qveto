import type { FC } from 'react'
import { Layers, Loader2 } from 'lucide-react'

export const LoadingScreen: FC<{ message?: string }> = ({ message = 'Loading workspace...' }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="relative flex items-center justify-center mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-500/25 animate-pulse">
          <Layers className="h-7 w-7" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        <span>{message}</span>
      </div>
    </div>
  )
}
