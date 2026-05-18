/** Brand link + back button (back button hidden on the home page). */
"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/button/BackButton"

interface HeaderNaviProps {
  className?: string
}

export function HeaderNavi({ className }: HeaderNaviProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  return (
    <div className={cn("flex flex-row items-center gap-1 select-none", className)}>
      {!isHomePage && (
        <BackButton handleBack={() => router.back()} />
      )}
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <h1 className="font-serif font-black italic text-xl text-white tracking-tight">VNDB</h1>
      </Link>
    </div>
  )
}
