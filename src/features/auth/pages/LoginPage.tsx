import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { GoogleIcon } from '../../../components/common/GoogleIcon.tsx'

export const LoginPage: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const searchParams = new URLSearchParams(window.location.search)

    const errorDesc = hashParams.get('error_description') || searchParams.get('error_description')
    const errorMsg = hashParams.get('error') || searchParams.get('error')

    if (errorDesc) {
      return decodeURIComponent(errorDesc.replace(/\+/g, ' '))
    }
    if (errorMsg) {
      return decodeURIComponent(errorMsg.replace(/\+/g, ' '))
    }
    return null
  })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address to resend confirmation.')
      return
    }

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      })

      if (error) {
        setErrorMessage(error.message)
      } else {
        setSuccessMessage('Confirmation email resent! Please check your inbox and spam folder.')
        setErrorMessage(null)
      }
    } catch {
      setErrorMessage('Failed to resend confirmation email.')
    } finally {
      setIsResending(false)
    }
  }

  const validateForm = (): string | null => {
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      return 'Email address is required.'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address (e.g. name@example.com).'
    }

    if (!password) {
      return 'Password is required.'
    }

    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      if (data.user) {
        setSuccessMessage('Signed in successfully! Redirecting to your dashboard...')
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
        setTimeout(() => {
          navigate(from, { replace: true })
        }, 500)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setErrorMessage(error.message)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign in could not be started.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="text-xs text-slate-400">
          Enter your credentials to access your workspaces
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex flex-col gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          {errorMessage.toLowerCase().includes('email not confirmed') && (
            <div className="mt-1 pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2">
              <span className="text-[11px] text-rose-300/80">Didn&apos;t receive it?</span>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={isResending}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer shrink-0"
              >
                {isResending ? 'Sending...' : 'Resend confirmation'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-700 bg-slate-900/90 py-2.5 px-4 text-sm font-semibold text-slate-100 transition-all hover:border-slate-500 hover:bg-slate-800/80 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <GoogleIcon className="h-4 w-4 shrink-0" />
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center py-1">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="px-3 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
            or continue with email
          </span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300" htmlFor="login-email">
            Work Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="login-email"
              type="email"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              autoComplete="email"
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300" htmlFor="login-password">
              Password
            </label>
            <span className="text-[11px] text-slate-400">
              Secured with Supabase
            </span>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="login-password"
              type="password"
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 active:scale-[0.99] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Link to Register */}
      <p className="text-center text-xs text-slate-400">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Create one now
        </Link>
      </p>
    </div>
  )
}
