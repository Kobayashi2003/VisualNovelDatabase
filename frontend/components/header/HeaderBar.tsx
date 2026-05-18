/** Top header bar: brand/back nav + search field + user controls. */

import { cn } from "@/lib/utils"
import { HeaderNavi } from "./HeaderNavi"
import { UserHeader } from "./UserHeader"
import { SearchHeader } from "./SearchHeader"

interface HeaderBarProps {
  hidden?: boolean
  className?: string
}

export function HeaderBar({ hidden = false, className }: HeaderBarProps) {
  return (
    <header className={cn("px-4 border-b border-white/10", className)}>
      <div className="flex flex-wrap items-center py-3 gap-2">
        <HeaderNavi className="order-1 shrink-0" />
        <UserHeader hidden={hidden} className="order-2 ml-auto shrink-0 lg:order-3 lg:ml-0" />
        <SearchHeader hidden={hidden} className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1 lg:mx-3 lg:justify-center" />
      </div>
    </header>
  )
}
