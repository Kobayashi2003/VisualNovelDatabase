import { cn } from "@/lib/utils"
import { Image } from "@/components/image/Image"
import { Row } from "@/components/row/Row"
import { TitlesRow } from "@/components/row/TitlesRow"
import { PlatformsRow } from "@/components/row/PlatformsRow"
import { DevelopersRow } from "@/components/row/DevelopersRow"
import { PublishersRow } from "@/components/row/PublishersRow"
import { RelationsRow } from "@/components/row/RelationsRow"
import { ExtlinksRow } from "@/components/row/ExtlinksRow"
import { DescriptionRow } from "@/components/row/DescriptionRow"
import { VN } from "@/lib/types"
import { ENUMS } from "@/lib/enums"
import { ICON } from "@/lib/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { AlertTriangle, ImageOff } from "lucide-react"

interface VNDetailsPanelProps {
  vn: VN
  sexualLevel: "safe" | "suggestive" | "explicit"
  violenceLevel: "tame" | "violent" | "brutal"
}

export function VNDetailsPanel({ vn, sexualLevel, violenceLevel }: VNDetailsPanelProps) {

  const mainTitle = vn.title
  const subTitle = vn.titles.find((t) => t.official && t.main)?.title || ""
  const image_url = vn.image?.url
  const image_dims = vn.image?.dims
  const image_thumbnail = vn.image?.thumbnail
  const image_thumbnail_dims = vn.image?.thumbnail_dims
  const image_sexual = vn.image?.sexual || 0
  const image_violence = vn.image?.violence || 0
  const red_alert = (sexualLevel !== "explicit" && image_sexual > 1) || (violenceLevel !== "brutal" && image_violence > 1)
  const yellow_alert = (sexualLevel === "safe" && image_sexual > 0.5) || (violenceLevel === "tame" && image_violence > 0.5)

  const titles = vn.titles
  const aliases = vn.aliases
  const released = vn.released
  const platforms = vn.platforms
  const developers = vn.developers
  const publishers = vn.publishers
  const length = vn.length
  const lengthHours = vn.length_minutes && Math.floor(vn.length_minutes / 60)
  const lengthMinutes = vn.length_minutes && vn.length_minutes % 60
  const lengthVotes = vn.length_votes
  const relations = vn.relations
  const olang = vn.olang
  const devstatus = vn.devstatus
  const languages = vn.languages
  const rating = vn.rating
  const votecount = vn.votecount
  const extlinks = [...vn.extlinks,
    {
      url: `https://vndb.org/${vn.id}`,
      label: 'VNDB',
      name: 'VNDB',
      id: `https://vndb.org/${vn.id}`
    }
  ];

  const description = vn.description

  return (
    <div className="flex flex-col gap-3 bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 md:p-6">
      <div>
        {/* TITLE */}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{mainTitle}</h1>
          {devstatus !== undefined && devstatus !== 0 && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded font-medium",
              devstatus === 1 && "bg-blue-500/20 text-blue-400",
              devstatus === 2 && "bg-red-500/20 text-red-400"
            )}>
              {ENUMS.DEVSTATUS[devstatus as keyof typeof ENUMS.DEVSTATUS]}
            </span>
          )}
        </div>
        <h2 className="text-sm text-gray-500">{subTitle}</h2>
      </div>
      <div className={cn(
        "grid gap-4",
        image_url && "md:grid-cols-[220px_1fr]"
      )}>
        {/* IMAGE */}
        {red_alert ? (
          <div className="flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
        ) : yellow_alert ? (
          <div className="flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-yellow-500" />
          </div>
        ) : !image_url ? (
          <div className="flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-gray-500" />
          </div>
        ) : (
          <Image
            url={image_url}
            thumbnail={image_thumbnail}
            image_dims={image_dims}
            thumbnail_dims={image_thumbnail_dims}
          />
        )}
        {/* Details */}
        <div className="flex flex-col gap-2">
          {rating !== undefined && rating !== null && (
            <Row label="Rating" value={
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-bold text-lg",
                  rating >= 80 ? "text-green-400" :
                  rating >= 60 ? "text-yellow-400" :
                  rating >= 40 ? "text-orange-400" : "text-red-400"
                )}>
                  {(rating / 10).toFixed(2)}
                </span>
                <span className="text-white/40 text-xs">
                  ({votecount} votes)
                </span>
              </div>
            } />
          )}
          <TitlesRow titles={titles} />
          <Row label="Aliases" value={aliases.join(", ")} />
          {olang && (
            <Row label="Original Language" value={
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(ICON.LANGUAGE[olang as keyof typeof ICON.LANGUAGE])} />
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/50 text-white text-xs">
                    {ENUMS.LANGUAGE[olang as keyof typeof ENUMS.LANGUAGE]}
                  </TooltipContent>
                </Tooltip>
                <span>{ENUMS.LANGUAGE[olang as keyof typeof ENUMS.LANGUAGE] || olang}</span>
              </div>
            } />
          )}
          {languages && languages.length > 0 && (
            <Row label="Languages" value={
              <div className="flex flex-wrap gap-1.5 items-center">
                {languages.map(lang => (
                  <Tooltip key={lang}>
                    <TooltipTrigger asChild>
                      <span className={cn(ICON.LANGUAGE[lang as keyof typeof ICON.LANGUAGE])} />
                    </TooltipTrigger>
                    <TooltipContent className="bg-black/50 text-white text-xs">
                      {ENUMS.LANGUAGE[lang as keyof typeof ENUMS.LANGUAGE] || lang}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            } />
          )}
          <Row label="Play Time" value={length != null ? (
            ENUMS.LENGTH[length as keyof typeof ENUMS.LENGTH]
            + ((lengthHours || lengthMinutes)
              ? ` (${lengthHours ? `${lengthHours}h` : ``}${lengthMinutes ? `${lengthMinutes}m` : ``} from ${lengthVotes} votes)`
              : ``)
          ) : undefined} />
          <Row label="Release Date" value={released} />
          <PlatformsRow platforms={platforms} />
          <DevelopersRow developers={developers} />
          <PublishersRow publishers={publishers} />
          <RelationsRow relations={relations} />
          <ExtlinksRow extlinks={extlinks} />
          <DescriptionRow description={description} />
        </div>
      </div>
    </div>
  )
}
