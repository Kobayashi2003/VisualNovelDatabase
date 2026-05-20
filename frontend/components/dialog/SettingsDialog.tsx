/** User settings: content-level defaults and password change. */
"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { BaseDialog } from "@/components/dialog/BaseDialog"
import { validatePassword } from "@/lib/validation"

interface SettingsDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function SettingsDialog({ open, setOpen }: SettingsDialogProps) {
  const { defaultSexualLevel, defaultViolenceLevel, updateDefaultSexualLevel, updateDefaultViolenceLevel } = useUserContext()

  /* ─── Change Password ─────────────────────────────────────────────────────── */

  const [oldPassword, setOldPassword]         = useState("")
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwLoading, setPwLoading]             = useState(false)
  const [pwError, setPwError]                 = useState<string | null>(null)
  const [pwSuccess, setPwSuccess]             = useState(false)

  const handleChangePassword = async () => {
    setPwError(null)
    setPwSuccess(false)
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setPwError(passwordError)
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match")
      return
    }
    setPwLoading(true)
    try {
      const res = await api.user.changePassword(oldPassword, newPassword)
      // Changing the password revokes every prior token; adopt the fresh pair
      // so this device stays signed in.
      localStorage.setItem("access_token", res.access_token)
      localStorage.setItem("refresh_token", res.refresh_token)
      setPwSuccess(true)
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e) {
      // userserve returns a human-readable message in the error body.
      setPwError(e instanceof Error ? e.message : "Failed to change password")
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <BaseDialog open={open} setOpen={setOpen} title="Settings" className="max-w-sm">
      <div className="flex flex-col gap-5">

        {/* ─── Content Defaults ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-widest">Content Defaults</p>
          <div className="grid grid-cols-[5rem_1fr] items-center gap-y-3 gap-x-5">
            <span className="text-sm text-white/70">Sexual</span>
            <SexualLevelSelector
              sexualLevel={defaultSexualLevel}
              setSexualLevel={updateDefaultSexualLevel}
            />
            <span className="text-sm text-white/70">Violence</span>
            <ViolenceLevelSelector
              violenceLevel={defaultViolenceLevel}
              setViolenceLevel={updateDefaultViolenceLevel}
            />
          </div>
        </div>

        <div className="border-t border-white/8" />

        {/* ─── Change Password ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-widest">Change Password</p>
          <div className="flex flex-col gap-2">
            <input
              type="password"
              placeholder="Current password"
              value={oldPassword}
              onChange={e => { setOldPassword(e.target.value); setPwError(null); setPwSuccess(false) }}
              className="w-full px-3 py-2 rounded-md bg-surface border border-white/8 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPwError(null); setPwSuccess(false) }}
              className="w-full px-3 py-2 rounded-md bg-surface border border-white/8 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPwError(null); setPwSuccess(false) }}
              onKeyDown={e => e.key === "Enter" && !pwLoading && handleChangePassword()}
              className="w-full px-3 py-2 rounded-md bg-surface border border-white/8 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
            />
          </div>

          {pwError   && <p className="text-xs text-red-400">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-green-400">Password changed successfully</p>}

          <button
            onClick={handleChangePassword}
            disabled={pwLoading || !oldPassword || !newPassword || !confirmPassword}
            className="self-end px-4 py-1.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-35 disabled:cursor-not-allowed text-sm font-semibold text-black transition-colors"
          >
            {pwLoading ? "Saving…" : "Save"}
          </button>
        </div>

      </div>
    </BaseDialog>
  )
}
