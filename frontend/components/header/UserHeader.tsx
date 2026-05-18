/** Header user widget: avatar + logout when signed in, login + register otherwise. */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUserContext } from "@/context/UserContext"
import { GhostButton } from "@/components/button/GhostButton"
import { LetterButton } from "@/components/button/LetterButton"
import { LoginButton } from "@/components/button/LoginButton"
import { RegisterButton } from "@/components/button/RegisterButton"
import { LogoutButton } from "@/components/button/LogoutButton"
import { LoginDialog } from "@/components/dialog/LoginDialog"
import { RegisterDialog } from "@/components/dialog/RegisterDialog"
import { ConfirmDialog } from "@/components/dialog/ConfirmDialog"

interface UserHeaderProps {
  hidden?: boolean
  className?: string
}

export function UserHeader({ hidden = false, className }: UserHeaderProps) {
  const router = useRouter()
  const { user, isLoading, login, register, logout } = useUserContext()

  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  return (
    <div className={cn("flex flex-row items-center gap-1", className)}>
      {isLoading ? (
        <>
          <GhostButton />
          <GhostButton className="delay-300" />
        </>
      ) : user ? (
        <>
          <LetterButton
            letter={user.username.charAt(0).toUpperCase()}
            onClick={() => router.push("/u/c")}
            disabled={hidden}
          />
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
            disabled={hidden}
          />
          <RegisterDialog
            open={registerDialogOpen}
            setOpen={setRegisterDialogOpen}
            handleRegister={register}
            disabled={hidden}
          />
        </>
      )}
    </div>
  )
}
