"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Image } from "@/components/image/Image"
import { VN } from "@/lib/types"
import { AlertTriangle } from "lucide-react"

interface VNScreenshotsPanelProps {
  vn: VN
  sexualLevel: "safe" | "suggestive" | "explicit"
  violenceLevel: "tame" | "violent" | "brutal"
}

export function VNScreenshotsPanel({ vn, sexualLevel, violenceLevel }: VNScreenshotsPanelProps) {
  const screenshots = vn.screenshots

  if (!screenshots || screenshots.length === 0) return null

  const filteredScreenshots = screenshots.map(ss => {
    const sexual = ss.sexual || 0
    const violence = ss.violence || 0
    const redAlert = (sexualLevel !== "explicit" && sexual > 1) || (violenceLevel !== "brutal" && violence > 1)
    const yellowAlert = (sexualLevel === "safe" && sexual > 0.5) || (violenceLevel === "tame" && violence > 0.5)
    return { ...ss, redAlert, yellowAlert }
  })

  return (
    <div className="bg-[#0F2942]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold">Screenshots</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredScreenshots.map((ss, index) => (
          <div key={index} className="relative">
            {ss.redAlert ? (
              <div className="flex items-center justify-center aspect-video bg-white/5 rounded">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            ) : ss.yellowAlert ? (
              <div className="flex items-center justify-center aspect-video bg-white/5 rounded">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            ) : (
              <Image
                url={ss.url}
                thumbnail={ss.thumbnail}
                image_dims={ss.dims}
                thumbnail_dims={ss.thumbnail_dims}
              />
            )}
            {ss.release && (
              <p className="text-[10px] text-white/30 mt-1 truncate">{ss.release.title}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}