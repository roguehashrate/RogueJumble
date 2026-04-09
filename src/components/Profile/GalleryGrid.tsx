import { ExtendedKind } from '@/constants'
import { getImetaInfosFromEvent } from '@/lib/event'
import { TImetaInfo } from '@/types'
import { getNoteBech32Id } from '@/lib/event'
import { toNote } from '@/lib/link'
import { useSecondaryPage } from '@/PageManager'
import client from '@/services/client.service'
import { Event, kinds } from 'nostr-tools'
import { useEffect, useMemo, useState } from 'react'
import Image from '../Image'

export default function GalleryGrid({ pubkey }: { pubkey: string }) {
  const [mediaEvents, setMediaEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true)
      try {
        const relayList = await client.fetchRelayList(pubkey)
        const urls = relayList.write.slice(0, 8)

        const sub = client.subscribe(
          urls,
          {
            authors: [pubkey],
            kinds: [
              kinds.ShortTextNote,
              ExtendedKind.PICTURE,
              ExtendedKind.VIDEO,
              ExtendedKind.SHORT_VIDEO
            ]
          },
          {
            onevent: (event) => {
              const imetaInfos = getImetaInfosFromEvent(event)
              if (imetaInfos.length > 0) {
                setMediaEvents((prev) => {
                  if (prev.some((e) => e.id === event.id)) return prev
                  return [...prev, event]
                })
              }
            },
            oneose: () => {
              setLoading(false)
            }
          }
        )

        return () => {
          sub.close()
        }
      } catch {
        setLoading(false)
      }
    }

    fetchMedia()
  }, [pubkey])

  const items = useMemo(() => {
    return mediaEvents.map((event) => {
      const imetaInfos = getImetaInfosFromEvent(event)
      const isVideo =
        event.kind === ExtendedKind.VIDEO ||
        event.kind === ExtendedKind.SHORT_VIDEO ||
        event.kind === ExtendedKind.ADDRESSABLE_NORMAL_VIDEO ||
        event.kind === ExtendedKind.ADDRESSABLE_SHORT_VIDEO

      const firstImage = imetaInfos.find((img) =>
        /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(img.url || '')
      )
      const firstVideo = imetaInfos.find((vid) =>
        /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(vid.url || '')
      )

      const noteId = getNoteBech32Id(event)

      return {
        event,
        noteId,
        isVideo,
        image: firstImage,
        video: firstVideo
      }
    })
  }, [mediaEvents])

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1 p-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No media yet
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1 p-2">
      {items.map((item) => (
        <GalleryItem key={item.event.id} item={item} />
      ))}
    </div>
  )
}

function GalleryItem({
  item
}: {
  item: {
    event: Event
    noteId?: string
    isVideo: boolean
    image?: TImetaInfo
    video?: TImetaInfo
  }
}) {
  const { push } = useSecondaryPage()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.noteId) {
      push(toNote(item.noteId))
    }
  }

  if (item.isVideo && item.video) {
    return (
      <div
        className="relative aspect-square w-full cursor-pointer touch-manipulation overflow-hidden bg-muted"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as any)
          }
        }}
      >
        {item.image ? (
          <Image
            image={item.image}
            className="h-full w-full object-cover"
            classNames={{ wrapper: 'h-full w-full' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800">
            <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80">
            <svg className="ml-1 h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  if (item.image) {
    return (
      <div
        className="aspect-square w-full cursor-pointer touch-manipulation"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as any)
          }
        }}
      >
        <Image
          image={item.image}
          className="h-full w-full object-cover"
          classNames={{ wrapper: 'h-full w-full' }}
        />
      </div>
    )
  }

  return null
}
