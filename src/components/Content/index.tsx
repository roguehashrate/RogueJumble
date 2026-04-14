import { useTranslatedEvent } from '@/hooks'
import {
  EmbeddedEmojiParser,
  EmbeddedEventParser,
  EmbeddedHashtagParser,
  EmbeddedLNInvoiceParser,
  EmbeddedMentionParser,
  EmbeddedUrlParser,
  EmbeddedWebsocketUrlParser,
  Bech32EventParser,
  GroupLinkParser,
  parseContent
} from '@/lib/content-parser'
import { getImetaInfosFromEvent } from '@/lib/event'
import { containsMarkdown } from '@/lib/markdown'
import customEmojiService from '@/services/custom-emoji.service'
import { getEmojiInfosFromEmojiTags, getImetaInfoFromImetaTag } from '@/lib/tag'
import { EMOJI_REGEX } from '@/constants'
import { cn } from '@/lib/utils'
import mediaUpload from '@/services/media-upload.service'
import { TImetaInfo } from '@/types'
import { Event } from 'nostr-tools'
import { useMemo, useRef, useState } from 'react'
import {
  EmbeddedHashtag,
  EmbeddedLNInvoice,
  EmbeddedMention,
  EmbeddedNote,
  EmbeddedWebsocketUrl
} from '../Embedded'
import Emoji from '../Emoji'
import ExternalLink from '../ExternalLink'
import GroupLink from '../GroupLink'
import HighlightButton from '../HighlightButton'
import ImageGallery from '../ImageGallery'
import MarkdownContent from '../MarkdownContent'
import MediaPlayer from '../MediaPlayer'
import PostEditor from '../PostEditor'
import WebPreview from '../WebPreview'
import XEmbeddedPost from '../XEmbeddedPost'
import YoutubeEmbeddedPlayer from '../YoutubeEmbeddedPlayer'

export default function Content({
  event,
  content,
  className,
  mustLoadMedia,
  enableHighlight = false,
  displayMode,
  disableEmojiOnly = false
}: {
  event?: Event
  content?: string
  className?: string
  mustLoadMedia?: boolean
  enableHighlight?: boolean
  displayMode?: 'imageMode' | 'textOnlyMode'
  disableEmojiOnly?: boolean
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [showHighlightEditor, setShowHighlightEditor] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const translatedEvent = useTranslatedEvent(event?.id)
  const resolvedContent = translatedEvent?.content ?? event?.content ?? content
  const isMarkdown = useMemo(
    () => (resolvedContent ? containsMarkdown(resolvedContent) : false),
    [resolvedContent]
  )
  const { nodes, allImages, lastNormalUrl, emojiInfos } = useMemo(() => {
    if (!resolvedContent || isMarkdown) return {}
    const _content = resolvedContent

    const nodes = parseContent(_content, [
      EmbeddedEventParser,
      Bech32EventParser,
      GroupLinkParser,
      EmbeddedMentionParser,
      EmbeddedUrlParser,
      EmbeddedLNInvoiceParser,
      EmbeddedWebsocketUrlParser,
      EmbeddedHashtagParser,
      EmbeddedEmojiParser
    ])

    const imetaInfos = event ? getImetaInfosFromEvent(event) : []
    const allImages = nodes
      .map((node) => {
        if (node.type === 'image') {
          const imageInfo = imetaInfos.find((image) => image.url === node.data)
          if (imageInfo) {
            return imageInfo
          }
          const tag = mediaUpload.getImetaTagByUrl(node.data)
          return tag
            ? getImetaInfoFromImetaTag(tag, event?.pubkey)
            : { url: node.data, pubkey: event?.pubkey }
        }
        if (node.type === 'images') {
          const urls = Array.isArray(node.data) ? node.data : [node.data]
          return urls.map((url) => {
            const imageInfo = imetaInfos.find((image) => image.url === url)
            return imageInfo ?? { url, pubkey: event?.pubkey }
          })
        }
        return null
      })
      .filter(Boolean)
      .flat() as TImetaInfo[]

    const emojiInfos = getEmojiInfosFromEmojiTags(event?.tags)

    const lastNormalUrlNode = nodes.findLast((node) => node.type === 'url')
    const lastNormalUrl =
      typeof lastNormalUrlNode?.data === 'string' ? lastNormalUrlNode.data : undefined

    return { nodes, allImages, emojiInfos, lastNormalUrl }
  }, [event, resolvedContent, isMarkdown])

  const isEmojiOnly = useMemo(() => {
    if (disableEmojiOnly) return false
    if (!nodes || nodes.length === 0) return false
    const nonWhitespace = nodes.filter((node) => !(node.type === 'text' && /^\s*$/.test(node.data)))
    let emojiCount = 0
    for (const node of nonWhitespace) {
      if (node.type === 'emoji') {
        emojiCount++
      } else if (node.type === 'text') {
        const matches = node.data.match(new RegExp(EMOJI_REGEX.source, 'gu'))
        if (!matches || node.data.replace(new RegExp(EMOJI_REGEX.source, 'gu'), '').trim() !== '') {
          return false
        }
        emojiCount += matches.length
      } else {
        return false
      }
    }
    return emojiCount > 0 && emojiCount <= 3
  }, [nodes, disableEmojiOnly])

  const handleHighlight = (text: string) => {
    setSelectedText(text)
    setShowHighlightEditor(true)
  }

  if (!resolvedContent) {
    return null
  }

  if (isMarkdown) {
    // Text Only Mode: strip images, media, embeds from markdown
    const cleanedContent =
      displayMode === 'textOnlyMode'
        ? resolvedContent
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/^[^\S\n]*https?:\/\/(www\.)?youtu(be\.com|\.be)\//gim, '')
            .replace(/^[^\S\n]*https?:\/\/(x\.com|twitter\.com)\//gim, '')
        : resolvedContent

    return (
      <>
        <div ref={contentRef} className={cn('text-wrap break-words', className)}>
          <MarkdownContent content={cleanedContent} event={event} />
        </div>
        {enableHighlight && (
          <HighlightButton onHighlight={handleHighlight} containerRef={contentRef} />
        )}
        {enableHighlight && (
          <PostEditor
            highlightedText={selectedText}
            parentStuff={event}
            open={showHighlightEditor}
            setOpen={setShowHighlightEditor}
          />
        )}
      </>
    )
  }

  if (!nodes || nodes.length === 0) {
    return null
  }

  let imageIndex = 0

  // Text Only Mode: ONLY text and emojis - strip ALL media, links, embeds
  if (displayMode === 'textOnlyMode') {
    return (
      <>
        <div
          ref={contentRef}
          className={cn('whitespace-pre-wrap text-wrap break-words', className)}
        >
          {nodes.map((node, index) => {
            if (node.type === 'text') {
              return node.data
            }
            if (node.type === 'image' || node.type === 'images') {
              imageIndex += Array.isArray(node.data) ? node.data.length : 1
              return null
            }
            if (node.type === 'media') return null
            if (node.type === 'url') return null
            if (node.type === 'invoice') return null
            if (node.type === 'websocket-url') return null
            if (node.type === 'event') return null
            if (node.type === 'mention') {
              return <EmbeddedMention key={index} userId={node.data.split(':')[1]} />
            }
            if (node.type === 'hashtag') {
              return <EmbeddedHashtag hashtag={node.data} key={index} />
            }
            if (node.type === 'emoji') {
              const shortcode = node.data.split(':')[1]
              const emoji =
                emojiInfos.find((e) => e.shortcode === shortcode) ||
                customEmojiService.getEmojiById(shortcode)
              if (!emoji) return node.data
              return <Emoji classNames={{ img: 'mb-1' }} emoji={emoji} key={index} />
            }
            if (node.type === 'youtube') return null
            return null
          })}
        </div>
        {enableHighlight && (
          <HighlightButton onHighlight={handleHighlight} containerRef={contentRef} />
        )}
        {enableHighlight && (
          <PostEditor
            highlightedText={selectedText}
            parentStuff={event}
            open={showHighlightEditor}
            setOpen={setShowHighlightEditor}
          />
        )}
      </>
    )
  }

  // Image Mode: show images/media first (large), then text below
  if (displayMode === 'imageMode') {
    const mediaNodes = nodes.filter(
      (n) =>
        n.type === 'image' ||
        n.type === 'images' ||
        n.type === 'media' ||
        n.type === 'youtube' ||
        n.type === 'x-post'
    )
    const textNodes = nodes.filter(
      (n) =>
        n.type !== 'image' &&
        n.type !== 'images' &&
        n.type !== 'media' &&
        n.type !== 'youtube' &&
        n.type !== 'x-post' &&
        n.type !== 'url'
    )

    return (
      <>
        {mediaNodes.length > 0 && (
          <div className="mb-3">
            {mediaNodes.map((node, index) => {
              if (node.type === 'image' || node.type === 'images') {
                const urls = Array.isArray(node.data) ? node.data : [node.data]
                const images = urls.map((url) => {
                  const imageInfo = (event ? getImetaInfosFromEvent(event) : []).find(
                    (img) => img.url === url
                  )
                  return imageInfo ?? { url, pubkey: event?.pubkey }
                })
                return (
                  <ImageGallery
                    className="overflow-hidden rounded-lg"
                    key={index}
                    images={images}
                    start={0}
                    end={images.length}
                    mustLoad={mustLoadMedia}
                  />
                )
              }
              if (node.type === 'media') {
                return (
                  <MediaPlayer
                    className="mt-2"
                    key={index}
                    src={node.data}
                    mustLoad={mustLoadMedia}
                  />
                )
              }
              if (node.type === 'youtube') {
                return (
                  <YoutubeEmbeddedPlayer
                    key={index}
                    url={node.data}
                    className="mt-2"
                    mustLoad={mustLoadMedia}
                  />
                )
              }
              if (node.type === 'x-post') {
                return (
                  <XEmbeddedPost
                    key={index}
                    url={node.data}
                    className="mt-2"
                    mustLoad={mustLoadMedia}
                  />
                )
              }
              return null
            })}
          </div>
        )}
        <div
          ref={contentRef}
          className={cn('whitespace-pre-wrap text-wrap break-words', className)}
        >
          {textNodes.map((node, index) => {
            if (node.type === 'text') {
              return node.data
            }
            if (node.type === 'url') return <ExternalLink url={node.data} key={index} />
            if (node.type === 'invoice') {
              return <EmbeddedLNInvoice invoice={node.data} key={index} className="mt-2" />
            }
            if (node.type === 'websocket-url')
              return <EmbeddedWebsocketUrl url={node.data} key={index} />
            if (node.type === 'event') {
              const id = node.data.split(':')[1]
              return <EmbeddedNote key={index} noteId={id} className="mt-2" />
            }
            if (node.type === 'bech32-event') {
              return <EmbeddedNote key={index} noteId={node.data} className="mt-2" />
            }
            if (node.type === 'group-link') {
              const match = node.data.match(/nostr:group:([a-z0-9-_]+)@([^\s]+)/i)
              if (match) {
                const [, groupId, relayUrl] = match
                return <GroupLink key={index} groupId={groupId} relayUrl={relayUrl} />
              }
            }
            if (node.type === 'mention') {
              return <EmbeddedMention key={index} userId={node.data.split(':')[1]} />
            }
            if (node.type === 'hashtag') {
              return <EmbeddedHashtag hashtag={node.data} key={index} />
            }
            if (node.type === 'emoji') {
              const shortcode = node.data.split(':')[1]
              const emoji = emojiInfos.find((e) => e.shortcode === shortcode)
              if (!emoji) return node.data
              return <Emoji classNames={{ img: 'mb-1' }} emoji={emoji} key={index} />
            }
            return null
          })}
        </div>
        {enableHighlight && (
          <HighlightButton onHighlight={handleHighlight} containerRef={contentRef} />
        )}
        {enableHighlight && (
          <PostEditor
            highlightedText={selectedText}
            parentStuff={event}
            open={showHighlightEditor}
            setOpen={setShowHighlightEditor}
          />
        )}
      </>
    )
  }

  // Normal mode
  return (
    <>
      <div
        ref={contentRef}
        className={cn(
          'whitespace-pre-wrap text-wrap break-words',
          isEmojiOnly && 'flex items-end gap-1',
          className
        )}
      >
        {nodes.map((node, index) => {
          if (node.type === 'text') {
            if (isEmojiOnly) {
              return (
                <span key={index} className="text-7xl leading-none">
                  {node.data}
                </span>
              )
            }
            return node.data
          }
          if (node.type === 'image' || node.type === 'images') {
            const start = imageIndex
            const end = imageIndex + (Array.isArray(node.data) ? node.data.length : 1)
            imageIndex = end
            return (
              <ImageGallery
                className="mt-2"
                key={index}
                images={allImages}
                start={start}
                end={end}
                mustLoad={mustLoadMedia}
              />
            )
          }
          if (node.type === 'media') {
            return (
              <MediaPlayer className="mt-2" key={index} src={node.data} mustLoad={mustLoadMedia} />
            )
          }
          if (node.type === 'url') {
            return <ExternalLink url={node.data} key={index} />
          }
          if (node.type === 'invoice') {
            return <EmbeddedLNInvoice invoice={node.data} key={index} className="mt-2" />
          }
          if (node.type === 'websocket-url') {
            return <EmbeddedWebsocketUrl url={node.data} key={index} />
          }
          if (node.type === 'event') {
            const id = node.data.split(':')[1]
            return <EmbeddedNote key={index} noteId={id} className="mt-2" />
          }
          if (node.type === 'bech32-event') {
            return <EmbeddedNote key={index} noteId={node.data} className="mt-2" />
          }
          if (node.type === 'group-link') {
            const match = node.data.match(/nostr:group:([a-z0-9-_]+)@([^\s]+)/i)
            if (match) {
              const [, groupId, relayUrl] = match
              return <GroupLink key={index} groupId={groupId} relayUrl={relayUrl} />
            }
          }
          if (node.type === 'mention') {
            return <EmbeddedMention key={index} userId={node.data.split(':')[1]} />
          }
          if (node.type === 'hashtag') {
            return <EmbeddedHashtag hashtag={node.data} key={index} />
          }
          if (node.type === 'emoji') {
            const shortcode = node.data.split(':')[1]
            const emoji = emojiInfos.find((e) => e.shortcode === shortcode)
            if (!emoji) return node.data
            return (
              <Emoji
                classNames={{ img: isEmojiOnly ? 'size-20' : 'mb-1' }}
                emoji={emoji}
                key={index}
              />
            )
          }
          if (node.type === 'youtube') {
            return (
              <YoutubeEmbeddedPlayer
                key={index}
                url={node.data}
                className="mt-2"
                mustLoad={mustLoadMedia}
              />
            )
          }
          if (node.type === 'x-post') {
            return (
              <XEmbeddedPost
                key={index}
                url={node.data}
                className="mt-2"
                mustLoad={mustLoadMedia}
              />
            )
          }
          return null
        })}
        {lastNormalUrl && <WebPreview className="mt-2" url={lastNormalUrl} />}
      </div>
      {enableHighlight && (
        <HighlightButton onHighlight={handleHighlight} containerRef={contentRef} />
      )}
      {enableHighlight && (
        <PostEditor
          highlightedText={selectedText}
          parentStuff={event}
          open={showHighlightEditor}
          setOpen={setShowHighlightEditor}
        />
      )}
    </>
  )
}
