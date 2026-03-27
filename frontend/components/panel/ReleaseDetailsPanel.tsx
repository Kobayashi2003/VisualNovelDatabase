import Link from "next/link"
import { cn } from "@/lib/utils"
import { Image } from "@/components/image/Image"
import { Row } from "@/components/row/Row"
import { PlatformsRow } from "@/components/row/PlatformsRow"
import { ExtlinksRow } from "@/components/row/ExtlinksRow"
import { DescriptionRow } from "@/components/row/DescriptionRow"
import { Release } from "@/lib/types"
import { ENUMS } from "@/lib/enums"

export function ReleaseDetailsPanel({ release }: { release: Release }) {
  const mainTitle = release.title
  const subTitle = release.alttitle || ""
  const mainLang = release.languages?.find(l => l.main)
  const otherLangs = release.languages?.filter(l => !l.main) || []
  const allLangs = release.languages?.map(l => ENUMS.LANGUAGE[l.lang as keyof typeof ENUMS.LANGUAGE] || l.lang) || []
  const developers = release.producers?.filter(p => p.developer) || []
  const publishers = release.producers?.filter(p => p.publisher) || []
  const voiced = release.voiced ? ENUMS.VOICED[release.voiced as keyof typeof ENUMS.VOICED] : undefined
  const media = release.media?.map(m =>
    `${ENUMS.MEDIUM[m.medium as keyof typeof ENUMS.MEDIUM] || m.medium}${m.qty > 1 ? ` ×${m.qty}` : ""}`
  ).join(", ")

  const extlinks = [...release.extlinks,
    {
      url: `https://vndb.org/${release.id}`,
      label: "VNDB",
      name: "VNDB",
      id: `https://vndb.org/${release.id}`
    }
  ]

  const flags = [
    release.patch && "Patch",
    release.freeware && "Freeware",
    release.uncensored && "Uncensored",
    !release.official && "Unofficial",
    release.has_ero && "Has Ero",
  ].filter(Boolean).join(", ")

  return (
    <div className="flex flex-col gap-3 bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{mainTitle}</h1>
        {subTitle && <h2 className="text-sm text-gray-500">{subTitle}</h2>}
      </div>
      <div className="flex flex-col gap-2">
        <Row label="Release Date" value={release.released} />
        <Row label="Languages" value={allLangs.join(", ")} />
        <PlatformsRow platforms={release.platforms || []} />
        <Row label="Media" value={media} />
        {release.minage !== undefined && release.minage !== null && (
          <Row label="Age Rating" value={release.minage === 0 ? "All Ages" : `${release.minage}+`} />
        )}
        <Row label="Voiced" value={voiced} />
        <Row label="Engine" value={release.engine} />
        <Row label="Resolution" value={release.resolution} />
        {flags && <Row label="Flags" value={flags} />}
        {release.vns && release.vns.length > 0 && (
          <Row label="Visual Novels" value={
            <div className="flex flex-col gap-0.5">
              {release.vns.map(vn => (
                <div key={vn.id} className="flex gap-1 items-center">
                  <Link href={`/${vn.id[0]}/${vn.id.slice(1)}`} className="text-blue-400 hover:text-blue-500 transition-colors">
                    {vn.title}
                  </Link>
                  <span className="text-white/40 text-xs">
                    ({ENUMS.RTYPE[vn.rtype as keyof typeof ENUMS.RTYPE] || vn.rtype})
                  </span>
                </div>
              ))}
            </div>
          } />
        )}
        {developers.length > 0 && (
          <Row label="Developers" value={
            <div className="flex flex-wrap gap-1 items-center">
              {developers.map((dev, index) => (
                <div key={dev.id}>
                  <Link href={`/${dev.id[0]}/${dev.id.slice(1)}`} className="text-blue-400 hover:text-blue-500 transition-colors">
                    {dev.name}
                  </Link>
                  {index < developers.length - 1 && <span className="px-1">&</span>}
                </div>
              ))}
            </div>
          } />
        )}
        {publishers.length > 0 && (
          <Row label="Publishers" value={
            <div className="flex flex-wrap gap-1 items-center">
              {publishers.map((pub, index) => (
                <div key={pub.id}>
                  <Link href={`/${pub.id[0]}/${pub.id.slice(1)}`} className="text-blue-400 hover:text-blue-500 transition-colors">
                    {pub.name}
                  </Link>
                  {index < publishers.length - 1 && <span className="px-1">&</span>}
                </div>
              ))}
            </div>
          } />
        )}
        {release.gtin && <Row label="GTIN/UPC" value={release.gtin} />}
        {release.catalog && <Row label="Catalog" value={release.catalog} />}
        <ExtlinksRow extlinks={extlinks} />
        <DescriptionRow description={release.notes} />
      </div>
      {release.images && release.images.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-white/70">Images</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {release.images.map((img) => (
              <Image
                key={img.id}
                url={img.url}
                thumbnail={img.thumbnail}
                image_dims={img.dims}
                thumbnail_dims={img.thumbnail_dims}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
