import { isInsecureUrl } from '@/lib/url'
import { cn, isInViewport } from '@/lib/utils'
import { useContentPolicy } from '@/providers/ContentPolicyProvider'
import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import mediaManager from '@/services/media-manager.service'
import { Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ExternalLink from '../ExternalLink'

export default function VideoPlayer({ src, className }: { src: string; className?: string }) {
  const { autoplay, videoLoop } = useContentPolicy()
  const { muteMedia, updateMuteMedia, allowInsecureConnection } = useUserPreferences()
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current

    if (!video || !container || error) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && autoplay) {
          setTimeout(() => {
            if (isInViewport(container)) {
              mediaManager.autoPlay(video)
            }
          }, 200)
        }

        if (!entry.isIntersecting) {
          mediaManager.pause(video)
        }
      },
      { threshold: 1 }
    )

    observer.observe(container)

    return () => {
      observer.unobserve(container)
    }
  }, [autoplay, error])

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current

    const handleVolumeChange = () => {
      updateMuteMedia(video.muted)
    }

    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || video.muted === muteMedia) return

    if (muteMedia) {
      video.muted = true
    } else {
      video.muted = false
    }
  }, [muteMedia])

  if (error || (!allowInsecureConnection && isInsecureUrl(src))) {
    return <ExternalLink url={src} />
  }

  return (
    <div ref={containerRef} className="group relative">
      <video
        ref={videoRef}
        controls
        playsInline
        loop={videoLoop}
        className={cn('max-h-[80vh] rounded-xl border sm:max-h-[60vh]', className)}
        src={src}
        onClick={(e) => e.stopPropagation()}
        onPlay={(event) => {
          mediaManager.play(event.currentTarget)
        }}
        muted={muteMedia}
        onError={() => setError(true)}
      />
      <button
        onClick={(e) => {
          e.stopPropagation()
          const a = document.createElement('a')
          a.href = src
          a.target = '_blank'
          a.download = src.split('/').pop() || 'video'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }}
        className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  )
}
