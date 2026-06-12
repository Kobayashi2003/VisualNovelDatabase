/** Page-scoped music player state for the kobayashi showcase.
 *
 *  Owns the single <audio> element (streaming from musicserve), the WebAudio
 *  analyser that the deck's VU display and the reactive background read from,
 *  the playlist (set by the page to the playable items of the current
 *  results), and the play-order mode (sequence / shuffle / repeat-one).
 *
 *  Time flows through a MotionValue updated by a rAF loop while playing —
 *  consumers animate the reels / progress off it without re-rendering. */
"use client"

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from "react"
import { useMotionValue, type MotionValue } from "motion/react"

import { api } from "@/lib/api"
import type { MusicMeta } from "@/lib/types"


/** What the player needs to show a track: the VN identity + display strings
 *  the page already has. Music-side metadata (tags, duration, embedded cover)
 *  is fetched lazily into `meta` when the track loads. */
export interface Track {
  vnid: string
  title: string
  developer: string
  /** VN cover (already content-level filtered by the caller) — the disc label
   *  falls back to it when the track has no music-side cover. */
  vnCover: string | null
  blur: boolean
}

/** Playback-order modes, cycled by the deck's order button:
 *  sequence — walk the playlist in display order (wrapping);
 *  shuffle  — jump to a random other track;
 *  repeat   — loop the current track when it ends (manual skips still step). */
export type PlayOrder = "sequence" | "shuffle" | "repeat"

interface PlayerContextValue {
  track: Track | null
  meta: MusicMeta | null
  playing: boolean
  order: PlayOrder
  duration: number
  volume: number
  playlist: Track[]
  setPlaylist: (tracks: Track[]) => void
  play: (track: Track) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  cycleOrder: () => void
  /** Current playback position in seconds; rAF-smooth while playing. */
  timeMV: MotionValue<number>
  /** Live analyser over the playing audio (null until first play). */
  analyserRef: RefObject<AnalyserNode | null>
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider")
  return ctx
}

export const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

const VOLUME_KEY = "kby-player-volume"
const ORDER_KEY = "kby-player-order"
const ORDER_CYCLE: PlayOrder[] = ["sequence", "shuffle", "repeat"]


export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const [track, setTrack] = useState<Track | null>(null)
  const [meta, setMeta] = useState<MusicMeta | null>(null)
  const [playing, setPlaying] = useState(false)
  const [order, setOrder] = useState<PlayOrder>("sequence")
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [playlist, setPlaylist] = useState<Track[]>([])

  const timeMV = useMotionValue(0)

  /* Restore persisted volume / order once on the client. */
  useEffect(() => {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "")
    if (!isNaN(v)) setVolumeState(Math.min(1, Math.max(0, v)))
    const o = localStorage.getItem(ORDER_KEY) as PlayOrder | null
    if (o && ORDER_CYCLE.includes(o)) setOrder(o)
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  /* Wire the analyser the first time playback starts. A media element can
     only ever be wrapped in ONE MediaElementSource, so this runs once; from
     then on all audio flows element → analyser → speakers. */
  const ensureAnalyser = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audioCtxRef.current) {
      audioCtxRef.current?.resume().catch(() => {})
      return
    }
    try {
      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyser.connect(ctx.destination)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
    } catch {
      // WebAudio unavailable — plain playback still works, visuals stay idle.
    }
  }, [])

  /* rAF-smooth playback clock while playing (timeupdate alone is ~4 Hz —
     too coarse for the tonearm / progress ring). */
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const a = audioRef.current
      if (a) timeMV.set(a.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, timeMV])

  /* Music-side metadata for the loaded track (duration before the stream's
     own metadata arrives, embedded title/artist, cover presence). */
  useEffect(() => {
    if (!track) { setMeta(null); return }
    const ctrl = new AbortController()
    api.music.meta(track.vnid, ctrl.signal).then(setMeta).catch(() => setMeta(null))
    return () => ctrl.abort()
  }, [track])

  const play = useCallback((t: Track) => {
    const audio = audioRef.current
    if (!audio) return
    ensureAnalyser()
    if (track?.vnid === t.vnid) {
      // Re-selecting the current track toggles rather than restarting.
      if (audio.paused) audio.play().catch(() => {})
      else audio.pause()
      return
    }
    setTrack(t)
    setDuration(0)
    timeMV.set(0)
    audio.src = api.music.url(t.vnid)
    audio.play().catch(() => {})
  }, [track, ensureAnalyser, timeMV])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    ensureAnalyser()
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [track, ensureAnalyser])

  const step = useCallback((dir: 1 | -1) => {
    if (!track || playlist.length === 0) return
    const idx = playlist.findIndex(t => t.vnid === track.vnid)
    // Current track may have dropped out of the playlist (tab/page change);
    // fall back to the playlist edge in the travel direction.
    const nextIdx = idx === -1
      ? (dir === 1 ? 0 : playlist.length - 1)
      : (idx + dir + playlist.length) % playlist.length
    play(playlist[nextIdx])
  }, [track, playlist, play])

  const playRandomOther = useCallback(() => {
    if (playlist.length === 0) return
    if (playlist.length === 1) { play(playlist[0]); return }
    const cur = playlist.findIndex(t => t.vnid === track?.vnid)
    let idx = Math.floor(Math.random() * playlist.length)
    if (idx === cur) idx = (idx + 1) % playlist.length
    play(playlist[idx])
  }, [playlist, track, play])

  /* Manual skips honour shuffle; sequence and repeat both just step (repeat
     only changes what happens when a track ENDS). */
  const next = useCallback(
    () => (order === "shuffle" ? playRandomOther() : step(1)),
    [order, playRandomOther, step])
  const prev = useCallback(
    () => (order === "shuffle" ? playRandomOther() : step(-1)),
    [order, playRandomOther, step])

  const onEnded = useCallback(() => {
    if (order === "repeat") {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = 0
      audio.play().catch(() => {})
      return
    }
    if (order === "shuffle") { playRandomOther(); return }
    step(1)
  }, [order, playRandomOther, step])

  const cycleOrder = useCallback(() => {
    setOrder(o => {
      const nextOrder = ORDER_CYCLE[(ORDER_CYCLE.indexOf(o) + 1) % ORDER_CYCLE.length]
      localStorage.setItem(ORDER_KEY, nextOrder)
      return nextOrder
    })
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    const target = Math.min(Math.max(0, seconds), duration || audio.duration || 0)
    audio.currentTime = target
    timeMV.set(target)
  }, [duration, timeMV])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    setVolumeState(clamped)
    localStorage.setItem(VOLUME_KEY, String(clamped))
  }, [])

  /* Lock-screen / media-key integration. */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return
    const ms = navigator.mediaSession
    if (track) {
      ms.metadata = new MediaMetadata({
        title: meta?.title || track.title,
        artist: meta?.artist || track.developer,
        album: track.title,
      })
    }
    ms.setActionHandler("play", () => audioRef.current?.play().catch(() => {}))
    ms.setActionHandler("pause", () => audioRef.current?.pause())
    ms.setActionHandler("previoustrack", prev)
    ms.setActionHandler("nexttrack", next)
    return () => {
      ms.setActionHandler("play", null)
      ms.setActionHandler("pause", null)
      ms.setActionHandler("previoustrack", null)
      ms.setActionHandler("nexttrack", null)
    }
  }, [track, meta, prev, next])

  const value = useMemo<PlayerContextValue>(() => ({
    track, meta, playing, order, duration, volume, playlist,
    setPlaylist, play, toggle, next, prev, seek, setVolume, cycleOrder,
    timeMV, analyserRef,
  }), [track, meta, playing, order, duration, volume, playlist,
       play, toggle, next, prev, seek, setVolume, cycleOrder, timeMV])

  return (
    <PlayerContext.Provider value={value}>
      {/* The one true audio element. Same-origin stream, so the analyser
          needs no CORS handshake. */}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
        onDurationChange={e => {
          const d = e.currentTarget.duration
          if (isFinite(d) && d > 0) setDuration(d)
        }}
        onTimeUpdate={e => { if (!playing) timeMV.set(e.currentTarget.currentTime) }}
      />
      {children}
    </PlayerContext.Provider>
  )
}
