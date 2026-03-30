'use client'

import React, { useEffect, useRef, useMemo } from 'react'

// Pre-generate particle data to avoid hydration mismatches
function useParticles(count: number) {
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      w: ((i * 7 + 3) % 25) / 10 + 0.5,
      top: ((i * 37 + 11) % 100),
      left: ((i * 53 + 7) % 100),
      opacity: ((i * 17 + 5) % 30) / 100 + 0.05,
      duration: ((i * 13 + 9) % 20) + 20,
      delay: ((i * 41 + 3) % 30),
    })),
  [count])
}

function useConnectionLines(count: number) {
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x1: ((i * 67 + 13) % 100),
      y1: ((i * 43 + 29) % 100),
      x2: ((i * 31 + 59) % 100),
      y2: ((i * 71 + 17) % 100),
      duration: ((i * 19 + 7) % 8) + 12,
      delay: ((i * 23 + 11) % 15),
    })),
  [count])
}

function usePulseRings(count: number) {
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      top: ((i * 47 + 23) % 80) + 10,
      left: ((i * 61 + 37) % 80) + 10,
      duration: ((i * 11 + 5) % 6) + 8,
      delay: ((i * 29 + 3) % 10),
      size: ((i * 17 + 7) % 60) + 80,
    })),
  [count])
}

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const particles = useParticles(40)
  const connections = useConnectionLines(8)
  const pulseRings = usePulseRings(5)

  useEffect(() => {
    const src = 'https://stream.mux.com/9JXDljEVWYwWu02008iWREy600f600S701.m3u8'
    const video = videoRef.current
    if (!video) return

    let hls: any

    import('hls.js').then((HlsModule) => {
      const Hls = HlsModule.default
      if (Hls.isSupported()) {
        hls = new Hls({ capLevelToPlayerSize: true })
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.warn('Autoplay prevented:', e))
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.warn('Autoplay prevented:', e))
        })
      }
    }).catch(err => {
      console.error('Failed to load hls.js:', err)
    })

    return () => { if (hls) hls.destroy() }
  }, [])

  return (
    <>
      {/* ── Layer 0: HLS Video ───────────────────────────────── */}
      <div className="fixed inset-0 z-[-5] pointer-events-none overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto object-cover -translate-x-1/2 -translate-y-1/2 opacity-75"
          loop muted playsInline autoPlay
        />
      </div>

      {/* ── Layer 1: Grid overlay (trading floor feel) ───────── */}
      <div className="fixed inset-0 z-[-4] pointer-events-none overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="bgGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(0,255,135,0.03)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="gridFade" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="gridMask">
              <rect width="100%" height="100%" fill="url(#gridFade)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#bgGrid)" mask="url(#gridMask)" />
        </svg>
      </div>

      {/* ── Layer 2: Animated orbs + mesh ────────────────────── */}
      <div className="fixed inset-0 z-[-3] pointer-events-none overflow-hidden">
        {/* Large teal orb — top right */}
        <div
          className="absolute w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, #00ff87 0%, transparent 65%)',
            top: '-15%', right: '-8%', opacity: 0.06,
            animation: 'orbDrift1 25s ease-in-out infinite',
          }}
        />
        {/* Large teal orb — bottom left */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, #00ff87 0%, transparent 65%)',
            bottom: '-18%', left: '-12%', opacity: 0.05,
            animation: 'orbDrift2 30s ease-in-out infinite',
          }}
        />
        {/* Purple accent orb — center-right */}
        <div
          className="absolute w-[450px] h-[450px] rounded-full"
          style={{
            background: 'radial-gradient(circle, #a855f7 0%, transparent 65%)',
            top: '35%', left: '55%', opacity: 0.04,
            animation: 'orbDrift3 20s ease-in-out infinite',
          }}
        />
        {/* Amber orb — mid-left (matches DAO treasury color) */}
        <div
          className="absolute w-[350px] h-[350px] rounded-full"
          style={{
            background: 'radial-gradient(circle, #eab308 0%, transparent 65%)',
            top: '60%', left: '15%', opacity: 0.025,
            animation: 'orbDrift4 22s ease-in-out infinite',
          }}
        />
        {/* Small bright teal orb — top left (fast mover) */}
        <div
          className="absolute w-[250px] h-[250px] rounded-full"
          style={{
            background: 'radial-gradient(circle, #00ff87 0%, transparent 60%)',
            top: '10%', left: '20%', opacity: 0.05,
            animation: 'orbDrift5 15s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Layer 3: Connection lines (blockchain network) ──── */}
      <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff87" stopOpacity="0" />
              <stop offset="50%" stopColor="#00ff87" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00ff87" stopOpacity="0" />
            </linearGradient>
          </defs>
          {connections.map((c, i) => (
            <line
              key={`conn-${i}`}
              x1={`${c.x1}%`} y1={`${c.y1}%`}
              x2={`${c.x2}%`} y2={`${c.y2}%`}
              stroke="url(#lineGrad)"
              strokeWidth="0.5"
              style={{
                animation: `linePulse ${c.duration}s ease-in-out infinite`,
                animationDelay: `-${c.delay}s`,
              }}
            />
          ))}
          {/* Nodes at some connection endpoints */}
          {connections.slice(0, 5).map((c, i) => (
            <circle
              key={`node-${i}`}
              cx={`${c.x1}%`} cy={`${c.y1}%`}
              r="1.5"
              fill="#00ff87"
              style={{
                opacity: 0,
                animation: `nodePulse ${c.duration * 0.8}s ease-in-out infinite`,
                animationDelay: `-${c.delay}s`,
              }}
            />
          ))}
        </svg>
      </div>

      {/* ── Layer 4: Pulse rings (epoch rhythm) ──────────────── */}
      <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden">
        {pulseRings.map((ring, i) => (
          <div
            key={`ring-${i}`}
            className="absolute rounded-full border border-[#00ff87]"
            style={{
              width: ring.size + 'px',
              height: ring.size + 'px',
              top: ring.top + '%',
              left: ring.left + '%',
              transform: 'translate(-50%, -50%)',
              opacity: 0,
              animation: `ringExpand ${ring.duration}s ease-out infinite`,
              animationDelay: `-${ring.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Layer 5: Floating particles ──────────────────────── */}
      <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <div
            key={`p-${i}`}
            className="absolute rounded-full"
            style={{
              width: p.w + 'px',
              height: p.w + 'px',
              top: p.top + '%',
              left: p.left + '%',
              opacity: p.opacity,
              backgroundColor: i % 7 === 0 ? '#a855f7' : i % 5 === 0 ? '#eab308' : '#00ff87',
              animation: `particleRise ${p.duration}s linear infinite`,
              animationDelay: `-${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Layer 6: Scanning beam (MEV capture feel) ────────── */}
      <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden">
        <div
          className="absolute w-full h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,135,0.08) 20%, rgba(0,255,135,0.15) 50%, rgba(0,255,135,0.08) 80%, transparent 100%)',
            animation: 'scanBeam 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[1px] h-full"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,255,135,0.06) 20%, rgba(0,255,135,0.1) 50%, rgba(0,255,135,0.06) 80%, transparent 100%)',
            animation: 'scanBeamV 18s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Noise texture ────────────────────────────────────── */}
      <div className="fixed inset-0 z-[-2] pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />
      </div>

      {/* ── Gradient overlays for top/bottom fade ────────────── */}
      <div className="fixed inset-x-0 top-0 h-[200px] z-[-1] pointer-events-none bg-gradient-to-b from-black to-transparent" />
      <div className="fixed inset-x-0 bottom-0 h-[200px] z-[-1] pointer-events-none bg-gradient-to-t from-black to-transparent" />
      <div className="fixed inset-0 z-[-1] pointer-events-none bg-black/15" />

      {/* ── Keyframes ────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-80px, 50px) scale(1.15); }
          66% { transform: translate(40px, -40px) scale(0.9); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -60px) scale(1.2); }
          66% { transform: translate(-50px, 30px) scale(0.85); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.25); }
        }
        @keyframes orbDrift4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-30px, -40px) scale(1.1); }
          70% { transform: translate(20px, 30px) scale(0.95); }
        }
        @keyframes orbDrift5 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, 20px) scale(1.3); }
          50% { transform: translate(-20px, 60px) scale(0.8); }
          75% { transform: translate(-40px, -30px) scale(1.1); }
        }
        @keyframes particleRise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          8% { opacity: 0.4; }
          50% { opacity: 0.2; }
          92% { opacity: 0.05; }
          100% { transform: translateY(-100vh) translateX(40px); opacity: 0; }
        }
        @keyframes linePulse {
          0%, 100% { opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
        }
        @keyframes nodePulse {
          0%, 100% { opacity: 0; r: 1; }
          30% { opacity: 0.4; r: 2; }
          70% { opacity: 0.3; r: 1.5; }
        }
        @keyframes ringExpand {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.12; border-width: 1.5px; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; border-width: 0.5px; }
        }
        @keyframes scanBeam {
          0% { top: -2%; }
          50% { top: 102%; }
          50.01% { top: -2%; opacity: 0; }
          55% { opacity: 1; }
          100% { top: 102%; }
        }
        @keyframes scanBeamV {
          0% { left: -2%; }
          50% { left: 102%; }
          50.01% { left: -2%; opacity: 0; }
          55% { opacity: 1; }
          100% { left: 102%; }
        }
      `}} />
    </>
  )
}
