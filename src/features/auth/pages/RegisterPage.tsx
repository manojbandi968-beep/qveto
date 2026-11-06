import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { GoogleIcon } from '../../../components/common/GoogleIcon.tsx'

export const RegisterPage: FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)

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

    if (password.length < 6) {
      return 'Password must be at least 6 characters long.'
    }

    if (!confirmPassword) {
      return 'Please confirm your password.'
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.'
    }

    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setRequiresConfirmation(false)

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      // Check if user already exists (Supabase returns empty identities array when email enumeration protection is on)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setErrorMessage('An account with this email address already exists. Please sign in instead.')
        return
      }

      // If session is present, Supabase auto-confirmed the user
      if (data.session) {
        setSuccessMessage('Account created successfully! Redirecting to your dashboard...')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1000)
      } else {
        // Email confirmation is required by Supabase project settings
        setRequiresConfirmation(true)
        setSuccessMessage(
          `Confirmation email sent to ${email.trim()}! Please verify your email before logging in.`
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during registration.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setRequiresConfirmation(false)
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
      const message = err instanceof Error ? err.message : 'Google sign up could not be started.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-white">Create your account</h1>
        <p className="text-xs text-slate-400">
          Sign up to collaborate with your team on ProjectFlow
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success / Email confirmation message */}
      {successMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
          <div className="space-y-1">
            <p>{successMessage}</p>
            {requiresConfirmation && (
              <p className="text-[11px] text-emerald-400/80">
                Tip: You can proceed to the{' '}
                <Link to="/login" className="font-semibold underline hover:text-white">
                  Sign In page
                </Link>{' '}
                once verified.
              </p>
            )}
          </div>
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
            or sign up with email
          </span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>
      </div>

      {!requiresConfirmation ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="register-email">
              Work Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="register-email"
                type="email"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="register-password">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="register-password"
                type="password"
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Confirm Password input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="register-confirm-password">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="register-confirm-password"
                type="password"
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
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
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="pt-2">
          <Link
            to="/login"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Link to Login */}
      <p className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
