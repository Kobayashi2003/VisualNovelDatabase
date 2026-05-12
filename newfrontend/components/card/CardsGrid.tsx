import { cn } from "@/lib/utils"
import { ImageCard } from "./ImageCard"
import { ImageCard2 } from "./ImageCard2"
import { TextCard } from "./TextCard"
import { ENUMS } from "@/lib/enums"

import {
  VN_Small, Release_Small, Character_Small, Producer_Small,
  Staff_Small, Tag_Small, Trait_Small
} from "@/lib/types"

type ImageProps = {
  url: string
  dims: [number, number]
  thumbnail?: string
  thumbnail_dims?: [number, number]
  sexual: number
  violence: number
}

interface GenImageCardProps {
  image?: ImageProps
  title: string
  msgs: string[]
  link?: string
  sexualLevel?: "safe" | "suggestive" | "explicit"
  violenceLevel?: "tame" | "violent" | "brutal"
  layout?: "single" | "grid"
  className?: string
}

const BLUR = "blur-lg hover:blur-none"

function getBlurClass(
  image: ImageProps | undefined,
  sexualLevel: string,
  violenceLevel: string
): string {
  if (!image) return ""
  const { sexual, violence } = image
  const isSexual = (sexualLevel === "safe" && sexual > 0.5) || (sexualLevel === "suggestive" && sexual > 1.5)
  const isViolent = (violenceLevel === "tame" && violence > 0.5) || (violenceLevel === "violent" && violence > 1.5)
  if (isSexual || isViolent) return BLUR
  return ""
}

export function GenImageCard({
  image, title, msgs, link,
  sexualLevel = "safe", violenceLevel = "tame",
  layout = "grid", className
}: GenImageCardProps) {
  const blurClass = getBlurClass(image, sexualLevel, violenceLevel)
  const imgUrl = image?.thumbnail || image?.url || ""

  return layout === "grid" ? (
    <ImageCard
      url={imgUrl}
      title={title}
      msgs={msgs}
      link={link}
      className={cn(className, blurClass, "transition-all duration-300")}
    />
  ) : (
    <ImageCard2
      url={imgUrl}
      title={title}
      msgs={msgs}
      link={link}
      className={cn(className, blurClass, "transition-all duration-300")}
    />
  )
}

const gridClass = (layout: "single" | "grid") =>
  layout === "grid"
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"
    : "flex flex-col gap-2"

// ─── VNs ────────────────────────────────────────────────────────────────────
interface VNsCardsGridProps {
  vns: VN_Small[]
  cardType?: "image" | "text"
  layout?: "single" | "grid"
  sexualLevel?: "safe" | "suggestive" | "explicit"
  violenceLevel?: "tame" | "violent" | "brutal"
}

export function VNsCardsGrid({
  vns, cardType = "image", layout = "grid",
  sexualLevel = "safe", violenceLevel = "tame"
}: VNsCardsGridProps) {
  return (
    <div className={gridClass(layout)}>
      {vns.map((vn) => {
        const developer = vn.developers?.[0]?.name || ""
        const released = vn.released || ""
        const msgs = [developer, released].filter(Boolean)

        if (cardType === "text") {
          return <TextCard key={vn.id} title={vn.title} msgs={msgs} link={`/${vn.id}`} layout={layout} />
        }
        return (
          <GenImageCard
            key={vn.id}
            image={vn.image}
            title={vn.title}
            msgs={msgs}
            link={`/${vn.id}`}
            sexualLevel={sexualLevel}
            violenceLevel={violenceLevel}
            layout={layout}
          />
        )
      })}
    </div>
  )
}

// ─── Releases ───────────────────────────────────────────────────────────────
interface ReleasesCardsGridProps {
  releases: Release_Small[]
  layout?: "single" | "grid"
}

export function ReleasesCardsGrid({ releases, layout = "grid" }: ReleasesCardsGridProps) {
  return (
    <div className={gridClass(layout)}>
      {releases.map((r) => {
        const langs = r.languages?.map(l => l.lang).join(", ") || ""
        return (
          <TextCard key={r.id} title={r.title} msgs={[r.released, langs].filter(Boolean)} link={`/${r.id}`} layout={layout} />
        )
      })}
    </div>
  )
}

// ─── Characters ─────────────────────────────────────────────────────────────
interface CharactersCardsGridProps {
  characters: Character_Small[]
  cardType?: "image" | "text"
  layout?: "single" | "grid"
  sexualLevel?: "safe" | "suggestive" | "explicit"
  violenceLevel?: "tame" | "violent" | "brutal"
}

export function CharactersCardsGrid({
  characters, cardType = "image", layout = "grid",
  sexualLevel = "safe", violenceLevel = "tame"
}: CharactersCardsGridProps) {
  return (
    <div className={gridClass(layout)}>
      {characters.map((c) => {
        const role = c.vns?.[0]?.role ? (ENUMS.CHARACTER_ROLE as Record<string, string>)[c.vns[0].role] || c.vns[0].role : ""
        const msgs = [c.original, role].filter(Boolean) as string[]

        if (cardType === "text") {
          return <TextCard key={c.id} title={c.name} msgs={msgs} link={`/${c.id}`} layout={layout} />
        }
        return (
          <GenImageCard
            key={c.id}
            image={c.image}
            title={c.name}
            msgs={msgs}
            link={`/${c.id}`}
            sexualLevel={sexualLevel}
            violenceLevel={violenceLevel}
            layout={layout}
          />
        )
      })}
    </div>
  )
}

// ─── Producers ──────────────────────────────────────────────────────────────
interface ProducersCardsGridProps {
  producers: Producer_Small[]
  layout?: "single" | "grid"
}

export function ProducersCardsGrid({ producers, layout = "grid" }: ProducersCardsGridProps) {
  return (
    <div className={gridClass(layout)}>
      {producers.map((p) => (
        <TextCard key={p.id} title={p.name} msgs={p.original ? [p.original] : []} link={`/${p.id}`} layout={layout} />
      ))}
    </div>
  )
}

// ─── Staff ──────────────────────────────────────────────────────────────────
interface StaffCardsGridProps {
  staff: Staff_Small[]
  layout?: "single" | "grid"
}

export function StaffCardsGrid({ staff, layout = "grid" }: StaffCardsGridProps) {
  return (
    <div className={gridClass(layout)}>
      {staff.map((s) => (
        <TextCard key={s.id} title={s.name} msgs={s.original ? [s.original] : []} link={`/${s.id}`} layout={layout} />
      ))}
    </div>
  )
}

// ─── Tags ───────────────────────────────────────────────────────────────────
interface TagsCardsGridProps {
  tags: Tag_Small[]
  layout?: "single" | "grid"
}

export function TagsCardsGrid({ tags, layout = "grid" }: TagsCardsGridProps) {
  return (
    <div className={gridClass(layout)}>
      {tags.map((t) => (
        <TextCard key={t.id} title={t.name} msgs={[t.category]} link={`/${t.id}`} layout={layout} />
      ))}
    </div>
  )
}

// ─── Traits ─────────────────────────────────────────────────────────────────
interface TraitsCardsGridProps {
  traits: Trait_Small[]
  layout?: "single" | "grid"
}

export function TraitsCardsGrid({ traits, layout = "grid" }: TraitsCardsGridProps) {
  return (
    <div className={gridClass(layout)}>
      {traits.map((t) => (
        <TextCard key={t.id} title={t.name} msgs={[t.group_name || ""].filter(Boolean)} link={`/${t.id}`} layout={layout} />
      ))}
    </div>
  )
}
