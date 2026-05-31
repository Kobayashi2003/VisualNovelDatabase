/** "Forgot password" dialog — emails a password-reset link to the given address. */
"use client"

import { useState } from "react"
import { BaseDialog } from "./BaseDialog"
import { Loader2, ArrowRight } from "lucide-react"
import { api } from "@/lib/api"
import { validateEmail } from "@/lib/validation"

interface ForgotPasswordDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  className?: string
}

export function ForgotPasswordDialog({ open, setOpen, className }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailError = validateEmail(email)
    if (emailError) { setError(emailError); return }

    setLoading(true)
    setError("")
    try {
      await api.user.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <BaseDialog open={open} setOpen={setOpen} title="Reset password" className={className}>
      {sent ? (
        <div className="flex flex-col gap-2 py-2 text-center">
          <p className="text-sm text-white">If that email is registered, a reset link is on its way.</p>
          <p className="text-xs text-muted">Check your inbox and follow the link to choose a new password.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Enter the email on your account and we&apos;ll send you a link to reset your password.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder:text-muted focus:outline-none focus:border-white/30"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-accent hover:bg-accent-hover text-black font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </BaseDialog>
  )
}
