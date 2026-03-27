import Link from "next/link"
import { cn } from "@/lib/utils"
import { ICON } from "@/lib/icons"
import { ENUMS } from "@/lib/enums"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { VN } from "@/lib/types"

export function VNReleasesPanel({ vn }: { vn: VN }) {
  const releases = vn.releases

  if (!releases || releases.length === 0) return null

  return (
    <div className="bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold">Releases</h2>
      <div className="flex flex-col gap-2">
        {releases.map(release => {
          const rtype = release.vns?.find(v => v.id === vn.id)?.rtype
          return (
            <div key={release.id} className="flex flex-col gap-1.5 p-3 rounded-md bg-white/5 border border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/r/${release.id.slice(1)}`}
                  className="text-blue-400 hover:text-blue-500 transition-colors text-sm font-medium"
                >
                  {release.title}
                </Link>
                {rtype && (
                  <span className="text-xs text-white/40 px-1.5 py-0.5 rounded bg-white/5">
                    {ENUMS.RTYPE[rtype as keyof typeof ENUMS.RTYPE] || rtype}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                {release.released && (
                  <span>{release.released}</span>
                )}
                {release.languages && release.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    {release.languages.map((lang) => {
                      const langCode = typeof lang === "string" ? lang : lang.lang
                      return (
                        <Tooltip key={langCode}>
                          <TooltipTrigger asChild>
                            <span className={cn(ICON.LANGUAGE[langCode as keyof typeof ICON.LANGUAGE])} />
                          </TooltipTrigger>
                          <TooltipContent className="bg-black/50 text-white text-xs">
                            {ENUMS.LANGUAGE[langCode as keyof typeof ENUMS.LANGUAGE] || langCode}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )}
                {release.platforms && release.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    {release.platforms.map((platform: string) => (
                      <Tooltip key={platform}>
                        <TooltipTrigger asChild>
                          <span className={cn(ICON.PLATFORM[platform as keyof typeof ICON.PLATFORM])} />
                        </TooltipTrigger>
                        <TooltipContent className="bg-black/50 text-white text-xs">
                          {ENUMS.PLATFORM[platform as keyof typeof ENUMS.PLATFORM] || platform}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
              {release.producers && release.producers.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs text-white/50">
                  {release.producers.filter(p => p.developer).map(p => (
                    <Link key={p.id} href={`/p/${p.id.slice(1)}`} className="text-blue-400/60 hover:text-blue-500 transition-colors">
                      {p.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}