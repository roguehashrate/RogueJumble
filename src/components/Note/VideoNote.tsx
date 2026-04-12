import { ExtendedKind } from '@/constants'
import { getImetaInfosFromEvent } from '@/lib/event'
import { getVideoMetadataFromEvent } from '@/lib/event-metadata'
import { Event } from 'nostr-tools'
import { useMemo } from 'react'
import Content from '../Content'
import { EmbeddedHashtag } from '../Embedded'
import MediaPlayer from '../MediaPlayer'

export default function VideoNote({ event, className }: { event: Event; className?: string }) {
  const videoInfos = useMemo(() => getImetaInfosFromEvent(event), [event])
  const isAddressable =
    event.kind === ExtendedKind.ADDRESSABLE_NORMAL_VIDEO ||
    event.kind === ExtendedKind.ADDRESSABLE_SHORT_VIDEO
  const metadata = useMemo(
    () => (isAddressable ? getVideoMetadataFromEvent(event) : null),
    [event, isAddressable]
  )

  // Strip video URLs from caption text so Content doesn't show [Media] placeholders
  const captionContent = useMemo(() => {
    let text = event.content
    videoInfos.forEach(({ url }) => {
      text = text.replace(url, '').replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    })
    return { ...event, content: text.trim() }
  }, [event, videoInfos])

  return (
    <div className={className}>
      {videoInfos.map((video) => (
        <MediaPlayer src={video.url} key={video.url} className="mt-2" />
      ))}
      {metadata?.title && <div className="mt-2 font-semibold">{metadata.title}</div>}
      {captionContent.content && <Content event={captionContent} disableEmojiOnly />}
      {metadata && metadata.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {metadata.tags.map((tag) => (
            <EmbeddedHashtag key={tag} hashtag={tag} />
          ))}
        </div>
      )}
    </div>
  )
}
