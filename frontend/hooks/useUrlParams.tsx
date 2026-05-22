/** Hook for reading and updating the Next.js URL query string. */

import { useRouter, usePathname, useSearchParams } from "next/navigation"

export const useUrlParams = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateKey = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const updateMultipleKeys = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => newParams.set(key, value))
    router.push(`${pathname}?${newParams.toString()}`)
  }

  return { updateKey, updateMultipleKeys }
}
