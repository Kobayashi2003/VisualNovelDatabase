/** Registration form dialog. */
"use client"

import { useState } from "react"
import { BaseDialog } from "./BaseDialog"
import { Loader2, ArrowRight } from "lucide-react"

interface RegisterDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  handleRegister: (username: string, password: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function RegisterDialog({ open, setOpen, handleRegister, disabled, className }: RegisterDialogProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await handleRegister(username, password)
      setOpen(false)
    } catch {
      setError("Registration failed. Username may already exist.")
    } finally {
      setLoading(false)
    }
  }

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
          <label className="text-sm font-medium text-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password"
            required
            className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder:text-muted focus:outline-none focus:border-white/30"
          />
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
