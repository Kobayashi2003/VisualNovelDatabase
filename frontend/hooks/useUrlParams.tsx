/** Hook for reading and updating the Next.js URL query string. */

import { useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export const useUrlParams = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Stable identities (per URL state) so consumers can safely list these in
  // effect dependencies — e.g. the collection page's debounced search commit.
  const updateKey = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const updateMultipleKeys = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => params.set(key, value))
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return { updateKey, updateMultipleKeys }
}
