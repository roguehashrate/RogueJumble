import { EmbeddedEmojiParser, parseContent } from '@/lib/content-parser'
import { TEmoji } from '@/types'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import Emoji from '../Emoji'

// Unicode emoji regex - matches emoji sequences including ZWJ-combined emojis
const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}))*/gu

/**
 * Component that renders text with custom emojis replaced by emoji images
 * According to NIP-30, custom emojis are defined in emoji tags and referenced as :shortcode: in text
 */
export default function TextWithEmojis({
  text,
  emojis,
  className,
  emojiClassName,
  gradient = false
}: {
  text: string
  emojis?: TEmoji[]
  className?: string
  emojiClassName?: string
  gradient?: boolean
}) {
  const nodes = useMemo(() => {
    if (!emojis || emojis.length === 0) {
      return [{ type: 'text' as const, data: text }]
    }

    // Use the existing content parser infrastructure
    return parseContent(text, [EmbeddedEmojiParser])
  }, [text, emojis])

  // Create emoji map for quick lookup
  const emojiMap = useMemo(() => {
    const map = new Map<string, TEmoji>()
    emojis?.forEach((emoji) => {
      map.set(emoji.shortcode, emoji)
    })
    return map
  }, [emojis])

  // Split text segments by Unicode emoji characters
  const splitTextByEmojis = (text: string) => {
    const parts: { isEmoji: boolean; text: string }[] = []
    const matches = [...text.matchAll(EMOJI_REGEX)]

    if (matches.length === 0) {
      return [{ isEmoji: false, text }]
    }

    let lastIndex = 0
    for (const match of matches) {
      const start = match.index!
      if (start > lastIndex) {
        parts.push({ isEmoji: false, text: text.slice(lastIndex, start) })
      }
      parts.push({ isEmoji: true, text: match[0] })
      lastIndex = start + match[0].length
    }
    if (lastIndex < text.length) {
      parts.push({ isEmoji: false, text: text.slice(lastIndex) })
    }

    return parts
  }

  const renderTextNode = (textData: string, index: number) => {
    if (!gradient) return textData

    const parts = splitTextByEmojis(textData)

    if (parts.length === 0) return textData
    if (parts.length === 1 && !parts[0].isEmoji) {
      return (
        <span
          key={index}
          className="pointer-events-none inline-block select-none bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--primary-hover))] bg-clip-text text-transparent animate-gradient"
          style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          {textData}
        </span>
      )
    }

    return (
      <span key={index} className="inline-flex items-center gap-0">
        {parts.map((part, partIndex) => {
          if (part.isEmoji) {
            return (
              <span key={partIndex} className="inline-block">
                {part.text}
              </span>
            )
          }
          return (
            <span
              key={partIndex}
              className="pointer-events-none inline-block select-none bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--primary-hover))] bg-clip-text text-transparent animate-gradient"
              style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {part.text}
            </span>
          )
        })}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-0', className)}>
      {nodes.map((node, index) => {
        if (node.type === 'text') {
          return renderTextNode(node.data, index)
        }
        if (node.type === 'emoji') {
          const shortcode = node.data.split(':')[1]
          const emoji = emojiMap.get(shortcode)
          if (!emoji) return node.data
          return (
            <span key={index} className="inline-block">
              <Emoji emoji={emoji} classNames={{ img: emojiClassName }} />
            </span>
          )
        }
        return null
      })}
    </span>
  )
}
