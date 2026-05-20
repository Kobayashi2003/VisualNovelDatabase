/** Registration form dialog. */
"use client"

import { useState, useEffect } from "react"
import { BaseDialog } from "./BaseDialog"
import { PasswordInput } from "@/components/input/PasswordInput"
import { Loader2, ArrowRight } from "lucide-react"
import { api } from "@/lib/api"
import { validateUsername, validateEmail, validatePassword, PASSWORD_MIN_LENGTH } from "@/lib/validation"

interface RegisterDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  handleRegister: (username: string, email: string, password: string, code: string) => Promise<void>
  disabled?: boolean
  className?: string
}

const RESEND_COOLDOWN_SECONDS = 60

export function RegisterDialog({ open, setOpen, handleRegister, disabled, className }: RegisterDialogProps) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [codeSending, setCodeSending] = useState(false)
  const [codeNotice, setCodeNotice] = useState("")
  const [cooldown, setCooldown] = useState(0)

  // Tick down the "resend" cooldown once a code has been sent.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSendCode = async () => {
    const emailError = validateEmail(email)
    if (emailError) { setError(emailError); return }
    setError("")
    setCodeNotice("")
    setCodeSending(true)
    try {
      await api.user.sendVerificationCode(email)
      setCodeNotice("Verification code sent — check your email.")
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code. Please try again.")
    } finally {
      setCodeSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Mirror the backend rules so typos are caught before a round-trip.
    const usernameError = validateUsername(username)
    if (usernameError) { setError(usernameError); return }
    const emailError = validateEmail(email)
    if (emailError) { setError(emailError); return }
    if (!code.trim()) { setError("Enter the verification code sent to your email."); return }
    const passwordError = validatePassword(password)
    if (passwordError) { setError(passwordError); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }

    setLoading(true)
    setError("")
    try {
      await handleRegister(username, email, password, code)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const sendCodeLabel = cooldown > 0 ? `Resend in ${cooldown}s` : codeSending ? "Sending..." : "Send code"

  return (
    <BaseDialog open={open} setOpen={setOpen} title="Sign up" className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            required
            className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder:text-muted focus:outline-none focus:border-white/30"
          />
        </div>
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
          <p className="text-xs text-muted">Used to recover your account if you forget your password.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Verification code</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              required
              className="flex-1 px-4 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder:text-muted focus:outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={codeSending || cooldown > 0}
              className="shrink-0 px-3 py-2 rounded-lg border border-white/10 text-white text-sm hover:border-white/30 disabled:opacity-40 transition-colors"
            >
              {sendCodeLabel}
            </button>
          </div>
          {codeNotice && <p className="text-xs text-muted">{codeNotice}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Password</label>
          <PasswordInput value={password} onChange={setPassword} placeholder="Choose a password" />
          <p className="text-xs text-muted">At least {PASSWORD_MIN_LENGTH} characters.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Confirm password</label>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter your password" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={disabled || loading}
          className="w-full py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </BaseDialog>
  )
}
