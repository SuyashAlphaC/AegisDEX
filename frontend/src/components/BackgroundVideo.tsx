'use client'

import React, { useEffect, useRef } from 'react'

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const src = 'https://stream.mux.com/9JXDljEVWYwWu02008iWREy600f600S701.m3u8'
    const video = videoRef.current
    if (!video) return

    let hls: any

    import('hls.js').then((HlsModule) => {
      const Hls = HlsModule.default
      if (Hls.isSupported()) {
        hls = new Hls({
          capLevelToPlayerSize: true,
        })
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.warn('Autoplay prevented:', e))
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = src
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.warn('Autoplay prevented:', e))
        })
      }
    }).catch(err => {
      console.error('Failed to load hls.js:', err)
    })

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto object-cover -translate-x-1/2 -translate-y-1/2 opacity-75"
          loop
          muted
          playsInline
          autoPlay
        />
      </div>
      
      {/* Black linear-gradient overlay at top and bottom (200px) */}
      <div className="fixed inset-x-0 top-0 h-[200px] z-[-1] pointer-events-none bg-gradient-to-b from-black to-transparent" />
      <div className="fixed inset-x-0 bottom-0 h-[200px] z-[-1] pointer-events-none bg-gradient-to-t from-black to-transparent" />
      <div className="fixed inset-0 z-[-1] pointer-events-none bg-black/20" />
    </>
  )
}
