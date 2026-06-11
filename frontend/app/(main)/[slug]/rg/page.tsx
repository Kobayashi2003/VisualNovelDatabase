/** `/[slug]/rg` route — the relation graph for a single visual novel. */
"use client"

import { useParams } from "next/navigation"

import { RelationGraphPage } from "./_components/RelationGraphPage"
import { NotFound } from "@/components/status/StatusPanel"

// Only VN ids carry a relation graph (e.g. `/v16106/rg`).
const VN_ID = /^v\d+$/

export default function RelationGraphRoute() {
  const params = useParams()
  const slug = (params.slug as string) || ""

  if (!VN_ID.test(slug)) {
    return (
      <main className="container mx-auto flex-1 flex items-center justify-center p-4">
        <NotFound message={`No relation graph for /${slug}`} />
      </main>
    )
  }

  return <RelationGraphPage id={parseInt(slug.slice(1), 10)} />
}
