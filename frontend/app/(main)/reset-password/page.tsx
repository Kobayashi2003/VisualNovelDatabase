/** Password-reset landing page — opened from the link in the reset email. */
"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowRight } from "lucide-react"
import { api } from "@/lib/api"
import { validatePassword, PASSWORD_MIN_LENGTH } from "@/lib/validation"

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const passwordError = validatePassword(password)
    if (passwordError) { setError(passwordError); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }

    setLoading(true)
    setError("")
    try {
      await api.user.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl bg-elevated border border-white/10 shadow-2xl shadow-black/50 p-6">
      <h1 className="text-lg font-bold text-white mb-4">Reset password</h1>
      {!token ? (
        <p className="text-sm text-red-400">This reset link is missing its token. Please use the link from your email.</p>
      ) : done ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white">Your password has been reset. You can now log in with your new password.</p>
          <Link href="/" className="self-start text-sm text-accent hover:text-accent-hover transition-colors">
            Return home
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a new password"
              required
              className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder:text-muted focus:outline-none focus:border-white/30"
            />
            <p className="text-xs text-muted">At least {PASSWORD_MIN_LENGTH} characters.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              required
              className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder:text-muted focus:outline-none focus:border-white/30"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-muted" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
