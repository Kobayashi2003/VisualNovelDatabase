"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface SearchContextType {
  searchFrom: string
  searchType: string
  sortBy: string
  setSearchFrom: (from: string) => void
  setSearchType: (type: string) => void
  setSortBy: (by: string) => void
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

  const setSearchFrom = (from: string) => {
    setSearchFromState(from)
    localStorage.setItem("searchFrom", from)
  }

  const setSearchType = (type: string) => {
    setSearchTypeState(type)
    localStorage.setItem("searchType", type)
  }

  const setSortBy = (by: string) => {
    setSortByState(by)
    localStorage.setItem(`sortBy-${searchType}-${searchFrom}`, by)
  }

  useEffect(() => {
    const from = localStorage.getItem("searchFrom") || "both"
    const type = localStorage.getItem("searchType") || "v"
    const sort = localStorage.getItem(`sortBy-${type}-${from}`) || "id"
    setSearchFromState(from)
    setSearchTypeState(type)
    setSortByState(sort)
  }, [])

  useEffect(() => {
    const sort = localStorage.getItem(`sortBy-${searchType}-${searchFrom}`) || "id"
    setSortByState(sort)
  }, [searchFrom, searchType])

  return (
    <SearchContext.Provider value={{ searchFrom, searchType, sortBy, setSearchFrom, setSearchType, setSortBy }}>
      {children}
    </SearchContext.Provider>
  )
}
