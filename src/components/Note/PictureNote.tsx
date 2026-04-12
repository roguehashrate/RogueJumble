import { getImetaInfosFromEvent } from '@/lib/event'
import { Event } from 'nostr-tools'
import { useMemo } from 'react'
import Content from '../Content'
import ImageGallery from '../ImageGallery'

export default function PictureNote({ event, className }: { event: Event; className?: string }) {
  const imageInfos = useMemo(() => getImetaInfosFromEvent(event), [event])

  // Strip image URLs from caption text so Content doesn't show [Image] placeholders
  const captionContent = useMemo(() => {
    let text = event.content
    imageInfos.forEach(({ url }) => {
      text = text.replace(url, '').replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    })
    return { ...event, content: text.trim() }
  }, [event, imageInfos])

  return (
    <div className={className}>
      {imageInfos.length > 0 && <ImageGallery images={imageInfos} />}
      {captionContent.content && <Content event={captionContent} disableEmojiOnly />}
    </div>
  )
}
