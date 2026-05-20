/** Header user widget: avatar + logout when signed in, login + register otherwise. */
"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Settings as SettingsIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserContext } from "@/context/UserContext"
import { GhostButton } from "@/components/button/GhostButton"
import { LetterButton } from "@/components/button/LetterButton"
import { LoginButton } from "@/components/button/LoginButton"
import { RegisterButton } from "@/components/button/RegisterButton"
import { LogoutButton } from "@/components/button/LogoutButton"
import { LoginDialog } from "@/components/dialog/LoginDialog"
import { RegisterDialog } from "@/components/dialog/RegisterDialog"
import { ForgotPasswordDialog } from "@/components/dialog/ForgotPasswordDialog"
import { ConfirmDialog } from "@/components/dialog/ConfirmDialog"
import { SettingsDialog } from "@/components/dialog/SettingsDialog"

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

  return (
    <div className={cn("flex flex-row items-center gap-1", className)}>
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
            <LetterButton
              letter={user.username.charAt(0).toUpperCase()}
              onClick={() => router.push("/u/c")}
              disabled={hidden}
            />
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-lg bg-surface border border-white/6 shadow-2xl shadow-black/60 overflow-hidden">
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
          <LogoutButton
            handleLogout={() => setLogoutDialogOpen(true)}
            disabled={hidden}
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
          <LoginButton
            handleLogin={() => setLoginDialogOpen(true)}
            disabled={hidden}
          />
          <RegisterButton
            handleRegister={() => setRegisterDialogOpen(true)}
            disabled={hidden}
          />
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
