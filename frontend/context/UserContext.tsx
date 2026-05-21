/** Auth state and login/register/logout actions, backed by the userserve API. */
"use client"

import { createContext, useContext, useState, useEffect } from "react"
import type { User, SexualLevel, ViolenceLevel } from "@/lib/types"
import { api, setSessionExpiredHandler, clearStoredSession } from "@/lib/api"

interface UserContextType {
  user: User | null
  isLoading: boolean
  defaultSexualLevel: SexualLevel
  defaultViolenceLevel: ViolenceLevel
  register: (username: string, email: string, password: string, code: string) => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateDefaultSexualLevel: (v: SexualLevel) => void
  updateDefaultViolenceLevel: (v: ViolenceLevel) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) throw new Error("useUserContext must be used within a UserProvider")
  return context
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [defaultSexualLevel, setDefaultSexualLevel] = useState<SexualLevel>(
    () => (typeof window !== "undefined" ? (localStorage.getItem("defaultSexualLevel") as SexualLevel) || "safe" : "safe")
  )
  const [defaultViolenceLevel, setDefaultViolenceLevel] = useState<ViolenceLevel>(
    () => (typeof window !== "undefined" ? (localStorage.getItem("defaultViolenceLevel") as ViolenceLevel) || "tame" : "tame")
  )

  const updateDefaultSexualLevel = (v: SexualLevel) => {
    localStorage.setItem("defaultSexualLevel", v)
    setDefaultSexualLevel(v)
  }
  const updateDefaultViolenceLevel = (v: ViolenceLevel) => {
    localStorage.setItem("defaultViolenceLevel", v)
    setDefaultViolenceLevel(v)
  }

  // Re-establish the session on mount. The username hint marks a session that
  // may still be alive; the API layer transparently refreshes an expired access
  // cookie, and a fully stale session is discarded.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    const initializeUser = async () => {
      if (localStorage.getItem("username")) {
        try {
          const userData = await api.user.me()
          setUser(userData)
        } catch {
          clearStoredSession()
        }
      }
      setIsLoading(false)
    }
    initializeUser()
  }, [])

  // Auth transitions reload the page so every Server Component re-renders for
  // the new session. The auth tokens are set as httpOnly cookies by the server;
  // only the (non-sensitive) username is cached, as a hint that a session is
  // active — and server-normalised (trimmed) so later lookups match.
  const register = async (username: string, email: string, password: string, code: string) => {
    const response = await api.user.register(username, email, password, code)
    localStorage.setItem("username", response.username)
    const userData = await api.user.me()
    setUser(userData)
    window.location.reload()
  }

  const login = async (username: string, password: string) => {
    const response = await api.user.login(username, password)
    localStorage.setItem("username", response.username)
    const userData = await api.user.me()
    setUser(userData)
    window.location.reload()
  }

  const logout = async () => {
    try {
      await api.user.logout()
    } catch {
      // Best-effort server-side revoke; clear the local session regardless.
    }
    clearStoredSession()
    setUser(null)
    window.location.reload()
  }

  return (
    <UserContext.Provider value={{ user, register, login, logout, isLoading, defaultSexualLevel, defaultViolenceLevel, updateDefaultSexualLevel, updateDefaultViolenceLevel }}>
      {children}
    </UserContext.Provider>
  )
}
