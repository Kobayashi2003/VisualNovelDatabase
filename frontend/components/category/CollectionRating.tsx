/** "My Rating" star control on detail pages — reads and edits the user's
 *  personal 1–5 rating for the entity. */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useUserContext } from "@/context/UserContext"
import { COLLECTION_TYPE_MAP } from "@/lib/constants"
import { StarRating } from "@/components/common/StarRating"

type ResourceType = "vn" | "release" | "character" | "producer" | "staff" | "tag" | "trait"

interface CollectionRatingProps {
  type: ResourceType
  id: string
}

export function CollectionRating({ type, id }: CollectionRatingProps) {
  const { user } = useUserContext()
  const [rating, setRating] = useState(0)
  const markId = parseInt(id.replace(new RegExp(`^${COLLECTION_TYPE_MAP[type].route}`), ""), 10)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    api.rating.getOne(type, markId)
      .then(value => { if (!cancelled) setRating(value) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user, type, markId])

  if (!user) return null

  const handleChange = async (value: number) => {
    const prev = rating
    setRating(value)
    try {
      if (value === 0) await api.rating.clear(type, markId)
      else await api.rating.set(type, markId, value)
    } catch {
      setRating(prev)
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-sm text-muted">My Rating</span>
      <StarRating value={rating} onChange={handleChange} size={20} />
    </div>
  )
}
