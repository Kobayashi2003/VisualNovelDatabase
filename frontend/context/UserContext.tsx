/** Auth state and login/register/logout actions, backed by the userserve API. */
"use client"

import { createContext, useContext, useState, useEffect } from "react"
import type { User, SexualLevel, ViolenceLevel } from "@/lib/types"
import { api } from "@/lib/api"

interface UserContextType {
  user: User | null
  isLoading: boolean
  defaultSexualLevel: SexualLevel
  defaultViolenceLevel: ViolenceLevel
  register: (username: string, password: string) => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
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

  // Re-establish the session on mount. A stale/invalid token is silently
  // discarded so the app falls back to the logged-out state.
  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem("access_token")
      const username = localStorage.getItem("username")
      if (token && username) {
        try {
          const userData = await api.user.get(username)
          setUser(userData)
        } catch {
          localStorage.removeItem("access_token")
          localStorage.removeItem("username")
        }
      }
      setIsLoading(false)
    }
    initializeUser()
  }, [])

  // Auth transitions reload the page so every Server Component re-renders
  // with the new token (simpler than threading it through context everywhere).
  const register = async (username: string, password: string) => {
    const response = await api.user.register(username, password)
    localStorage.setItem("access_token", response.access_token)
    // Use the server-normalised (trimmed) username so later lookups match.
    localStorage.setItem("username", response.username)
    const userData = await api.user.get(response.username)
    setUser(userData)
    window.location.reload()
  }

  const login = async (username: string, password: string) => {
    const response = await api.user.login(username, password)
    localStorage.setItem("access_token", response.access_token)
    localStorage.setItem("username", response.username)
    const userData = await api.user.get(response.username)
    setUser(userData)
    window.location.reload()
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("username")
    setUser(null)
    window.location.reload()
  }

  return (
    <UserContext.Provider value={{ user, register, login, logout, isLoading, defaultSexualLevel, defaultViolenceLevel, updateDefaultSexualLevel, updateDefaultViolenceLevel }}>
      {children}
    </UserContext.Provider>
  )
}
