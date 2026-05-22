/** Auth state and login/register/logout actions, backed by the userserve API. */
"use client"

import { createContext, useContext, useState, useEffect } from "react"
import type { User, SexualLevel, ViolenceLevel, ImageSource } from "@/lib/types"
import { api, setSessionExpiredHandler, clearStoredSession } from "@/lib/api"

interface UserContextType {
  user: User | null
  isLoading: boolean
  defaultSexualLevel: SexualLevel
  defaultViolenceLevel: ViolenceLevel
  imageSource: ImageSource
  register: (username: string, email: string, password: string, code: string, invitationCode: string) => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changeEmail: (newEmail: string, code: string, password: string) => Promise<void>
  updateDefaultSexualLevel: (v: SexualLevel) => void
  updateDefaultViolenceLevel: (v: ViolenceLevel) => void
  updateImageSource: (v: ImageSource) => void
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
  const [imageSource, setImageSource] = useState<ImageSource>(
    () => (typeof window !== "undefined" ? (localStorage.getItem("imageSource") as ImageSource) || "imgserve" : "imgserve")
  )

  const updateDefaultSexualLevel = (v: SexualLevel) => {
    localStorage.setItem("defaultSexualLevel", v)
    setDefaultSexualLevel(v)
  }
  const updateDefaultViolenceLevel = (v: ViolenceLevel) => {
    localStorage.setItem("defaultViolenceLevel", v)
    setDefaultViolenceLevel(v)
  }
  // Read at image-fetch time by `convertToImgserveUrl`; already-loaded images
  // keep their URLs until the next fetch/navigation.
  const updateImageSource = (v: ImageSource) => {
    localStorage.setItem("imageSource", v)
    setImageSource(v)
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
  const register = async (username: string, email: string, password: string, code: string, invitationCode: string) => {
    const response = await api.user.register(username, email, password, code, invitationCode)
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

  // Rebind the account email. The session itself is unaffected (the user id
  // never changes), so only the cached user object is patched in place.
  const changeEmail = async (newEmail: string, code: string, password: string) => {
    const response = await api.user.changeEmail(newEmail, code, password)
    setUser((u) => (u ? { ...u, email: response.email } : u))
  }

  return (
    <UserContext.Provider value={{ user, register, login, logout, changeEmail, isLoading, defaultSexualLevel, defaultViolenceLevel, imageSource, updateDefaultSexualLevel, updateDefaultViolenceLevel, updateImageSource }}>
      {children}
    </UserContext.Provider>
  )
}
