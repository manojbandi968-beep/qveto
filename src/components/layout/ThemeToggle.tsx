import type { FC } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/useTheme.ts'

export const ThemeToggle: FC = () => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="relative flex h-8 w-16 items-center rounded-full border border-slate-800 bg-slate-900/90 p-1 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 light:border-slate-300 light:bg-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
    >
      {/* Sliding pill indicator */}
      <span
        className={`absolute h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-md transition-transform duration-200 flex items-center justify-center ${
          isDark ? 'translate-x-0 text-white' : 'translate-x-8 text-white'
        }`}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>

      {/* Background static icons for track */}
      <div className="flex w-full items-center justify-between px-1 text-slate-400">
        <Moon className={`h-3.5 w-3.5 transition-opacity ${isDark ? 'opacity-0' : 'opacity-60'}`} />
        <Sun className={`h-3.5 w-3.5 transition-opacity ${isDark ? 'opacity-60' : 'opacity-0'}`} />
      </div>
    </button>
  )
}
