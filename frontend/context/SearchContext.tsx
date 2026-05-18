/** Global search/sort state for the header and search panel, persisted to localStorage. */
"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface SearchContextType {
  searchFrom: string
  searchType: string
  sortBy: string
  showOriginal: boolean
  setSearchFrom: (from: string) => void
  setSearchType: (type: string) => void
  setSortBy: (by: string) => void
  setShowOriginal: (v: boolean) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function useSearchContext() {
  const context = useContext(SearchContext)
  if (context === undefined) throw new Error("useSearchContext must be used within a SearchProvider")
  return context
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchFrom, setSearchFromState] = useState<string>("both")
  const [searchType, setSearchTypeState] = useState<string>("v")
  const [sortBy, setSortByState] = useState<string>("id")
  const [showOriginal, setShowOriginalState] = useState<boolean>(false)

  const setSearchFrom = (from: string) => {
    setSearchFromState(from)
    localStorage.setItem("searchFrom", from)
  }

  const setSearchType = (type: string) => {
    setSearchTypeState(type)
    localStorage.setItem("searchType", type)
  }

  // sortBy is stored per (type, from) pair, so switching either restores the
  // last sort the user picked for that combination rather than a global one.
  const setSortBy = (by: string) => {
    setSortByState(by)
    localStorage.setItem(`sortBy-${searchType}-${searchFrom}`, by)
  }

  const setShowOriginal = (v: boolean) => {
    setShowOriginalState(v)
    localStorage.setItem("showOriginal", v ? "1" : "0")
  }

  // Hydrate from localStorage after mount (avoids SSR/CSR markup mismatch).
  useEffect(() => {
    const from = localStorage.getItem("searchFrom") || "both"
    const type = localStorage.getItem("searchType") || "v"
    const sort = localStorage.getItem(`sortBy-${type}-${from}`) || "id"
    const orig = localStorage.getItem("showOriginal") === "1"
    setSearchFromState(from)
    setSearchTypeState(type)
    setSortByState(sort)
    setShowOriginalState(orig)
  }, [])

  // Re-pull sortBy when the (type, from) pair changes — see setSortBy.
  useEffect(() => {
    const sort = localStorage.getItem(`sortBy-${searchType}-${searchFrom}`) || "id"
    setSortByState(sort)
  }, [searchFrom, searchType])

  return (
    <SearchContext.Provider value={{ searchFrom, searchType, sortBy, showOriginal, setSearchFrom, setSearchType, setSortBy, setShowOriginal }}>
      {children}
    </SearchContext.Provider>
  )
}
