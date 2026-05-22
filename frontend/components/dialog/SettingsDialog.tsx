/** User settings: content-level defaults, email change, and password change. */
"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import { SexualLevelSelector } from "@/components/selector/SexualLevelSelector"
import { ViolenceLevelSelector } from "@/components/selector/ViolenceLevelSelector"
import { ImageSourceSelector } from "@/components/selector/ImageSourceSelector"
import { BaseDialog } from "@/components/dialog/BaseDialog"
import { PasswordInput } from "@/components/input/PasswordInput"
import { validatePassword, validateEmail } from "@/lib/validation"

interface SettingsDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
}

// Account fields keep the Settings dialog's own (more compact) styling.
const FIELD_CLASS =
  "w-full px-3 py-2 rounded-md bg-surface border border-white/8 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
// Password fields leave room on the right for the show/hide toggle.
const PW_INPUT_CLASS = FIELD_CLASS.replace("px-3 py-2", "px-3 py-2 pr-10")

const RESEND_COOLDOWN_SECONDS = 60

export function SettingsDialog({ open, setOpen }: SettingsDialogProps) {
  const {
    user, changeEmail,
    defaultSexualLevel, defaultViolenceLevel,
    updateDefaultSexualLevel, updateDefaultViolenceLevel,
    imageSource, updateImageSource,
  } = useUserContext()

  /* ─── Change Email ────────────────────────────────────────────────────────── */

  const [newEmail, setNewEmail]           = useState("")
  const [emailCode, setEmailCode]         = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [emailLoading, setEmailLoading]   = useState(false)
  const [emailError, setEmailError]       = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess]   = useState(false)
  const [codeSending, setCodeSending]     = useState(false)
  const [codeNotice, setCodeNotice]       = useState("")
  const [cooldown, setCooldown]           = useState(0)

  // Tick down the "resend" cooldown once a code has been sent.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const resetEmailFeedback = () => { setEmailError(null); setEmailSuccess(false) }

  const handleSendEmailCode = async () => {
    const error = validateEmail(newEmail)
    if (error) { setEmailError(error); return }
    resetEmailFeedback()
    setCodeNotice("")
    setCodeSending(true)
    try {
      // The code is sent to the *new* address — receiving it proves ownership.
      await api.user.sendVerificationCode(newEmail)
      setCodeNotice("Verification code sent — check the new address.")
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Could not send the code. Please try again.")
    } finally {
      setCodeSending(false)
    }
  }

  const handleChangeEmail = async () => {
    resetEmailFeedback()
    const error = validateEmail(newEmail)
    if (error) { setEmailError(error); return }
    if (!emailCode.trim()) { setEmailError("Enter the verification code sent to your new email."); return }
    if (!emailPassword) { setEmailError("Enter your current password."); return }
    setEmailLoading(true)
    try {
      await changeEmail(newEmail, emailCode, emailPassword)
      setEmailSuccess(true)
      setNewEmail("")
      setEmailCode("")
      setEmailPassword("")
      setCodeNotice("")
    } catch (e) {
      // userserve returns a human-readable message in the error body.
      setEmailError(e instanceof Error ? e.message : "Failed to change email")
    } finally {
      setEmailLoading(false)
    }
  }

  const sendCodeLabel = cooldown > 0 ? `Resend in ${cooldown}s` : codeSending ? "Sending…" : "Send code"

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
      await api.user.changePassword(oldPassword, newPassword)
      // Changing the password revokes every prior token; the server re-issues
      // fresh auth cookies on the response so this device stays signed in.
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

        {/* ─── Image Source ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-widest">Image Source</p>
          <div className="grid grid-cols-[5rem_1fr] items-center gap-x-5">
            <span className="text-sm text-white/70">Source</span>
            <ImageSourceSelector imageSource={imageSource} setImageSource={updateImageSource} />
          </div>
          <p className="text-xs text-muted">
            Proxy loads images through the imgserve cache. Direct fetches them straight from VNDB.
          </p>
        </div>

        <div className="border-t border-white/8" />

        {/* ─── Change Email ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-widest">Change Email</p>
          {user?.email && (
            <p className="text-xs text-muted">Current: <span className="text-white/70">{user.email}</span></p>
          )}
          <div className="flex flex-col gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); resetEmailFeedback() }}
              placeholder="New email address"
              className={FIELD_CLASS}
            />
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={emailCode}
                onChange={e => { setEmailCode(e.target.value); resetEmailFeedback() }}
                placeholder="6-digit code"
                className={FIELD_CLASS}
              />
              <button
                type="button"
                onClick={handleSendEmailCode}
                disabled={codeSending || cooldown > 0}
                className="shrink-0 px-3 rounded-md border border-white/8 text-sm text-white hover:border-white/25 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
              >
                {sendCodeLabel}
              </button>
            </div>
            <PasswordInput
              value={emailPassword}
              onChange={v => { setEmailPassword(v); resetEmailFeedback() }}
              placeholder="Current password"
              className={PW_INPUT_CLASS}
              onKeyDown={e => e.key === "Enter" && !emailLoading && handleChangeEmail()}
            />
          </div>

          {codeNotice    && <p className="text-xs text-muted">{codeNotice}</p>}
          {emailError    && <p className="text-xs text-red-400">{emailError}</p>}
          {emailSuccess  && <p className="text-xs text-green-400">Email changed successfully</p>}

          <button
            onClick={handleChangeEmail}
            disabled={emailLoading || !newEmail || !emailCode || !emailPassword}
            className="self-end px-4 py-1.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-35 disabled:cursor-not-allowed text-sm font-semibold text-black transition-colors"
          >
            {emailLoading ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="border-t border-white/8" />

        {/* ─── Change Password ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-widest">Change Password</p>
          <div className="flex flex-col gap-2">
            <PasswordInput
              value={oldPassword}
              onChange={v => { setOldPassword(v); setPwError(null); setPwSuccess(false) }}
              placeholder="Current password"
              className={PW_INPUT_CLASS}
            />
            <PasswordInput
              value={newPassword}
              onChange={v => { setNewPassword(v); setPwError(null); setPwSuccess(false) }}
              placeholder="New password"
              className={PW_INPUT_CLASS}
            />
            <PasswordInput
              value={confirmPassword}
              onChange={v => { setConfirmPassword(v); setPwError(null); setPwSuccess(false) }}
              placeholder="Confirm new password"
              className={PW_INPUT_CLASS}
              onKeyDown={e => e.key === "Enter" && !pwLoading && handleChangePassword()}
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
