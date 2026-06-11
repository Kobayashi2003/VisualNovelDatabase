/** Header user widget: avatar + logout when signed in, login + register otherwise. */
"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Settings as SettingsIcon, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserContext } from "@/context/UserContext"
import { IconButton } from "@/components/button/IconButton"
import { LoginDialog } from "@/components/dialog/LoginDialog"
import { RegisterDialog } from "@/components/dialog/RegisterDialog"
import { ForgotPasswordDialog } from "@/components/dialog/ForgotPasswordDialog"
import { ConfirmDialog } from "@/components/dialog/ConfirmDialog"
import { SettingsDialog } from "@/components/dialog/SettingsDialog"

// Pill skeleton shown while the auth state is resolving. Local to this file —
// the header is its only use.
function GhostButton({ className }: { className?: string }) {
  return <div className={cn("h-8 w-20 rounded-full bg-white/5 animate-pulse", className)} />
}

interface UserHeaderProps {
  hidden?: boolean
  className?: string
}

export function UserHeader({ hidden = false, className }: UserHeaderProps) {
  const router = useRouter()
  const { user, isLoading, login, register, logout } = useUserContext()

  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {isLoading ? (
        <>
          <GhostButton />
          <GhostButton className="delay-300" />
        </>
      ) : user ? (
        <>
          <div
            ref={menuRef}
            className="relative"
            onContextMenu={e => { e.preventDefault(); setMenuOpen(v => !v) }}
          >
            <button
              onClick={() => router.push("/u/c")}
              disabled={hidden}
              className={cn(
                "w-8 h-8 rounded-full bg-accent text-white font-bold text-sm",
                "hover:bg-accent-hover hover:scale-105 transition-all duration-200",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              {user.username.charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-lg bg-surface border border-white/6 shadow-2xl shadow-black/60 overflow-hidden animate-slide-down-fade">
                <div className="px-3.5 py-3 border-b border-white/6">
                  <p className="text-[13px] font-semibold text-white truncate">{user.username}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setMenuOpen(false); setSettingsOpen(true) }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-white/75 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    Settings
                  </button>
                </div>
              </div>
            )}
          </div>
          <IconButton
            icon={<LogOut className="w-4 h-4" />}
            onClick={() => setLogoutDialogOpen(true)}
            disabled={hidden}
            ariaLabel="Logout"
          />
          <ConfirmDialog
            open={logoutDialogOpen}
            setOpen={setLogoutDialogOpen}
            title="Logout"
            description="Are you sure you want to logout?"
            confirmText="Logout"
            cancelText="Cancel"
            onConfirm={() => { logout(); setLogoutDialogOpen(false) }}
            onCancel={() => setLogoutDialogOpen(false)}
          />
          <SettingsDialog open={settingsOpen} setOpen={setSettingsOpen} />
        </>
      ) : (
        <>
          <button
            onClick={() => setLoginDialogOpen(true)}
            disabled={hidden}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-bold text-white",
              "border border-white/30 hover:border-white transition-all duration-200",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            Login
          </button>
          <button
            onClick={() => setRegisterDialogOpen(true)}
            disabled={hidden}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-bold text-white",
              "bg-accent hover:bg-accent-hover transition-all duration-200",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            Sign up
          </button>
          <LoginDialog
            open={loginDialogOpen}
            setOpen={setLoginDialogOpen}
            handleLogin={login}
            onForgotPassword={() => { setLoginDialogOpen(false); setForgotDialogOpen(true) }}
            disabled={hidden}
          />
          <RegisterDialog
            open={registerDialogOpen}
            setOpen={setRegisterDialogOpen}
            handleRegister={register}
            disabled={hidden}
          />
          <ForgotPasswordDialog
            open={forgotDialogOpen}
            setOpen={setForgotDialogOpen}
          />
        </>
      )}
    </div>
  )
}
