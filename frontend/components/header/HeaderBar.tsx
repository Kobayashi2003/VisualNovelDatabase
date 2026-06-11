/** Top header bar: brand/back nav + search field + user controls. */
"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { IconButton } from "@/components/button/IconButton"
import { UserHeader } from "./UserHeader"
import { SearchHeader } from "./SearchHeader"

interface HeaderBarProps {
  hidden?: boolean
  className?: string
}

export function HeaderBar({ hidden = false, className }: HeaderBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  return (
    <header className={cn("px-4 border-b border-white/10", className)}>
      <div className="flex flex-wrap items-center py-3 gap-2">
        {/* Brand + back nav (back hidden on the home page). */}
        <div className="order-1 shrink-0 flex items-center gap-1 select-none">
          {!isHomePage && (
            <IconButton icon={<ChevronLeft className="w-5 h-5" />} onClick={() => router.back()} ariaLabel="Go back" />
          )}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="font-serif font-black italic text-xl text-white tracking-tight">VNDB</h1>
          </Link>
        </div>
        <UserHeader hidden={hidden} className="order-2 ml-auto shrink-0 lg:order-3 lg:ml-0" />
        <SearchHeader hidden={hidden} className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1 lg:mx-3 lg:justify-center" />
      </div>
    </header>
  )
}
