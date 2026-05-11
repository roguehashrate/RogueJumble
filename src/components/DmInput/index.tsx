import ContentPreviewContent from '@/components/ContentPreview/Content'
import Emoji from '@/components/Emoji'
import EmojiPickerDialog from '@/components/EmojiPickerDialog'
import Uploader from '@/components/PostEditor/Uploader'
import { SimpleUserAvatar } from '@/components/UserAvatar'
import { SimpleUsername } from '@/components/Username'
import { cn } from '@/lib/utils'
import { useNostr } from '@/providers/NostrProvider'
import client from '@/services/client.service'
import customEmojiService from '@/services/custom-emoji.service'
import dmService from '@/services/dm.service'
import { TEmoji, TProfile } from '@/types'
import { ArrowUp, Paperclip, Smile, X } from 'lucide-react'
import { nip19 } from 'nostr-tools'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function DmInput({
  recipientPubkey,
  disabled = false,
  replyTo,
  onCancelReply,
  onSent
}: {
  recipientPubkey: string
  disabled?: boolean
  replyTo?: { id: string; content: string; senderPubkey: string; tags?: string[][] } | null
  onCancelReply?: () => void
  onSent?: () => void
}) {
  const { t } = useTranslation()
  const { pubkey } = useNostr()
  const [content, setContent] = useState('')
  const editableRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<{ node: Text; offset: number } | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<TProfile[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const mentionsRef = useRef<Map<string, string>>(new Map())
  const [emojiQuery, setEmojiQuery] = useState<string | null>(null)
  const [emojiResults, setEmojiResults] = useState<TEmoji[]>([])
  const [emojiIndex, setEmojiIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const emojisRef = useRef<Map<string, string>>(new Map())
  const savedRangeRef = useRef<Range | null>(null)

  const serializeContent = useCallback(() => {
    const div = editableRef.current
    if (!div) return ''
    let result = ''
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || ''
      } else if (node instanceof HTMLBRElement) {
        result += '\n'
      } else if (node instanceof HTMLImageElement && node.dataset.shortcode) {
        result += `:${node.dataset.shortcode}:`
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const isBlock = el.tagName === 'DIV' || el.tagName === 'P'
        if (isBlock && result.length > 0 && !result.endsWith('\n')) {
          result += '\n'
        }
        node.childNodes.forEach((child) => walk(child))
      }
    }
    div.childNodes.forEach((child) => walk(child))
    return result
  }, [])

  useEffect(() => {
    if (replyTo) {
      editableRef.current?.focus()
    }
  }, [replyTo])

  const detectAutocomplete = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && editableRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
    if (!sel || !sel.rangeCount || !sel.isCollapsed) {
      setMentionQuery(null)
      setEmojiQuery(null)
      return
    }
    const range = sel.getRangeAt(0)
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      setMentionQuery(null)
      setEmojiQuery(null)
      return
    }
    const textNode = range.startContainer as Text
    const textBefore = (textNode.textContent || '').slice(0, range.startOffset)

    let best: { type: 'mention' | 'emoji'; index: number; query: string } | null = null

    const atIndex = textBefore.lastIndexOf('@')
    if (atIndex >= 0 && (atIndex === 0 || /\s/.test(textBefore[atIndex - 1]))) {
      const q = textBefore.slice(atIndex + 1)
      if (!/\s/.test(q)) {
        best = { type: 'mention', index: atIndex, query: q }
      }
    }

    const colonIndex = textBefore.lastIndexOf(':')
    if (colonIndex >= 0 && (colonIndex === 0 || /\s/.test(textBefore[colonIndex - 1]))) {
      const q = textBefore.slice(colonIndex + 1)
      if (!/[\s:]/.test(q)) {
        if (!best || colonIndex > best.index) {
          best = { type: 'emoji', index: colonIndex, query: q }
        }
      }
    }

    if (best?.type === 'mention') {
      setMentionQuery(best.query)
      triggerRef.current = { node: textNode, offset: best.index }
      setEmojiQuery(null)
    } else if (best?.type === 'emoji') {
      setEmojiQuery(best.query)
      triggerRef.current = { node: textNode, offset: best.index }
      setMentionQuery(null)
    } else {
      setMentionQuery(null)
      setEmojiQuery(null)
      triggerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([])
      return
    }
    if (mentionQuery === '') {
      setMentionResults([])
      return
    }
    let cancelled = false
    client.searchProfilesFromLocal(mentionQuery, 10).then((results) => {
      if (!cancelled) {
        setMentionResults(results)
        setMentionIndex(0)
      }
    })
    return () => {
      cancelled = true
    }
  }, [mentionQuery])

  useEffect(() => {
    if (emojiQuery === null) {
      setEmojiResults([])
      return
    }
    let cancelled = false
    customEmojiService.searchEmojis(emojiQuery).then((ids) => {
      if (!cancelled) {
        const emojis = ids.map((id) => customEmojiService.getEmojiById(id)).filter(Boolean) as TEmoji[]
        setEmojiResults(emojis)
        setEmojiIndex(0)
      }
    })
    return () => {
      cancelled = true
    }
  }, [emojiQuery])

  const replaceTriggeredText = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return false
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false
    const range = sel.getRangeAt(0)
    range.setStart(trigger.node, trigger.offset)
    range.deleteContents()
    return true
  }, [])

  const insertEmoji = useCallback(
    (emoji: TEmoji) => {
      if (!replaceTriggeredText()) return

      const sel = window.getSelection()!
      const range = sel.getRangeAt(0)
      const img = document.createElement('img')
      img.src = emoji.url
      img.alt = `:${emoji.shortcode}:`
      img.dataset.shortcode = emoji.shortcode
      img.dataset.url = emoji.url
      img.className = 'inline-block size-5 align-text-bottom pointer-events-none'
      img.draggable = false
      range.insertNode(img)
      range.setStartAfter(img)
      range.collapse(true)
      const space = document.createTextNode(' ')
      range.insertNode(space)
      range.setStartAfter(space)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)

      emojisRef.current.set(emoji.shortcode, emoji.url)
      setEmojiQuery(null)
      setEmojiResults([])
      triggerRef.current = null
      setContent(serializeContent())
    },
    [serializeContent, replaceTriggeredText]
  )

  const insertMention = useCallback(
    (profile: TProfile) => {
      if (!replaceTriggeredText()) return

      const sel = window.getSelection()!
      const range = sel.getRangeAt(0)
      const span = document.createElement('span')
      span.className = 'text-primary'
      span.contentEditable = 'false'
      span.textContent = `@${profile.username}`
      range.insertNode(span)
      range.setStartAfter(span)
      range.collapse(true)
      const space = document.createTextNode('\u00A0')
      range.insertNode(space)
      range.setStartAfter(space)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)

      mentionsRef.current.set(profile.username, profile.npub)
      setMentionQuery(null)
      setMentionResults([])
      triggerRef.current = null
      setContent(serializeContent())
    },
    [serializeContent, replaceTriggeredText]
  )

  const handleSend = async () => {
    if (!pubkey || !content.trim() || disabled) return

    let text = content.trim()
    mentionsRef.current.forEach((npub, displayText) => {
      text = text.split(`@${displayText}`).join(`nostr:${npub}`)
    })
    text = text.replace(
      /(^|\s+|@)(nostr:)?(nevent|naddr|nprofile|npub)1[a-zA-Z0-9]+/g,
      (match, leadingWhitespace) => {
        let bech32 = match.trim()
        const whitespace = leadingWhitespace || ''

        if (bech32.startsWith('@nostr:')) {
          bech32 = bech32.slice(7)
        } else if (bech32.startsWith('@')) {
          bech32 = bech32.slice(1)
        } else if (bech32.startsWith('nostr:')) {
          bech32 = bech32.slice(6)
        }

        try {
          nip19.decode(bech32)
          return `${whitespace}nostr:${bech32}`
        } catch {
          return match
        }
      }
    )
    const emojiTags: string[][] = []
    const shortcodeRegex = /:([a-zA-Z0-9_-]+):/g
    const addedEmojiTags = new Set<string>()
    let match
    while ((match = shortcodeRegex.exec(text)) !== null) {
      const shortcode = match[1]
      if (!addedEmojiTags.has(shortcode)) {
        const emoji = customEmojiService.getEmojiById(shortcode)
        if (emoji) {
          emojiTags.push(['emoji', shortcode, emoji.url])
          addedEmojiTags.add(shortcode)
        }
      }
    }
    // Also include emojis from ref just in case
    emojisRef.current.forEach((url, shortcode) => {
      if (!addedEmojiTags.has(shortcode)) {
        emojiTags.push(['emoji', shortcode, url])
        addedEmojiTags.add(shortcode)
      }
    })

    if (editableRef.current) editableRef.current.innerHTML = ''
    setContent('')
    mentionsRef.current.clear()
    emojisRef.current.clear()
    editableRef.current?.focus()

    try {
      if (text) {
        await dmService.sendMessage(
          pubkey,
          recipientPubkey,
          text,
          replyTo ?? undefined,
          emojiTags.length > 0 ? emojiTags : undefined
        )
      }
      onSent?.()
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error(t('Failed to send message'))
    }
  }

  const handleInput = useCallback(() => {
    setContent(serializeContent())
    detectAutocomplete()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }, [serializeContent, detectAutocomplete])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((prev) => (prev + mentionResults.length - 1) % mentionResults.length)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((prev) => (prev + 1) % mentionResults.length)
        return
      }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        insertMention(mentionResults[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        setMentionResults([])
        return
      }
    }
    if (emojiQuery !== null && emojiResults.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setEmojiIndex((prev) => (prev + emojiResults.length - 1) % emojiResults.length)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setEmojiIndex((prev) => (prev + 1) % emojiResults.length)
        return
      }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        insertEmoji(emojiResults[emojiIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setEmojiQuery(null)
        setEmojiResults([])
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePickerEmoji = useCallback(
    (emoji: string | TEmoji | undefined) => {
      if (!emoji) return
      const sel = window.getSelection()
      const div = editableRef.current
      if (!div) return

      if (savedRangeRef.current && div.contains(savedRangeRef.current.commonAncestorContainer)) {
        sel?.removeAllRanges()
        sel?.addRange(savedRangeRef.current)
      } else if (!sel || sel.rangeCount === 0 || !div.contains(sel.anchorNode)) {
        div.focus()
        const range = document.createRange()
        range.selectNodeContents(div)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }

      if (typeof emoji === 'string') {
        const textNode = document.createTextNode(emoji)
        const range = sel!.getRangeAt(0)
        range.deleteContents()
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.collapse(true)
        sel!.removeAllRanges()
        sel!.addRange(range)
      } else {
        const img = document.createElement('img')
        img.src = emoji.url
        img.alt = `:${emoji.shortcode}:`
        img.dataset.shortcode = emoji.shortcode
        img.dataset.url = emoji.url
        img.className = 'inline-block size-5 align-text-bottom pointer-events-none'
        img.draggable = false
        const range = sel!.getRangeAt(0)
        range.deleteContents()
        range.insertNode(img)
        range.setStartAfter(img)
        range.collapse(true)
        sel!.removeAllRanges()
        sel!.addRange(range)
        emojisRef.current.set(emoji.shortcode, emoji.url)
      }
      setContent(serializeContent())
    },
    [serializeContent]
  )

  const handleUploadSuccess = useCallback(
    ({ url }: { url: string }) => {
      const div = editableRef.current
      if (!div) return
      div.focus()

      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && div.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(url + ' '))
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
      } else {
        const textNode = document.createTextNode(' ' + url + ' ')
        div.appendChild(textNode)
      }

      setContent(serializeContent())
    },
    [serializeContent]
  )

  const canSend = content.trim().length > 0 && !disabled

  return (
    <div
      className="relative bg-background px-3 pt-1.5 pb-2"
      style={{
        paddingBottom: !isFocused ? '0.75rem' : '0.25rem'
      }}
    >
      {mentionQuery !== null && mentionResults.length > 0 && (
        <div
          className="scrollbar-hide absolute bottom-full left-0 right-0 z-50 max-h-64 overflow-y-auto border-b border-t bg-background p-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {mentionResults.map((profile, index) => (
            <button
              key={profile.npub}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-start outline-hidden transition-colors',
                mentionIndex === index && 'bg-accent text-accent-foreground'
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(profile)
              }}
              onMouseEnter={() => setMentionIndex(index)}
            >
              <SimpleUserAvatar userId={profile.npub} size="small" />
              <div className="w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SimpleUsername userId={profile.npub} className="truncate font-semibold" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {emojiQuery !== null && emojiResults.length > 0 && (
        <div
          className="scrollbar-hide absolute bottom-full left-0 right-0 z-50 max-h-64 overflow-y-auto border-b border-t bg-background p-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {emojiResults.map((emoji, index) => (
            <button
              key={`${emoji.shortcode}:${emoji.url}`}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-md p-1 text-start outline-hidden transition-colors',
                emojiIndex === index && 'bg-accent text-accent-foreground'
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                insertEmoji(emoji)
              }}
              onMouseEnter={() => setEmojiIndex(index)}
            >
              <Emoji emoji={emoji} classNames={{ img: 'size-6' }} />
              <span className="truncate">:{emoji.shortcode}:</span>
            </button>
          ))}
        </div>
      )}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-1.5">
          <div className="min-w-0 flex-1 border-s-2 border-primary ps-2">
            <SimpleUsername
              userId={replyTo.senderPubkey}
              className="text-xs font-medium text-primary"
              withoutSkeleton
            />
            <ContentPreviewContent
              content={replyTo.content || '...'}
              className="block truncate text-xs text-muted-foreground"
              emojiInfos={undefined}
            />
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1">
        <EmojiPickerDialog
          onEmojiClick={handlePickerEmoji}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Smile className="h-5 w-5" />
          </button>
        </EmojiPickerDialog>
        <Uploader onUploadSuccess={handleUploadSuccess} accept="image/*,video/*">
          <button
            onMouseDown={(e) => e.preventDefault()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </Uploader>
        <div
          ref={editableRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={detectAutocomplete}
          onKeyUp={detectAutocomplete}
          onMouseUp={detectAutocomplete}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          data-placeholder={t('Type a message...')}
          className={cn(
            'max-h-40 min-h-[36px] flex-1 select-text overflow-y-auto break-words bg-transparent py-2 text-base focus:outline-hidden',
            disabled && 'cursor-not-allowed opacity-50',
            'empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]'
          )}
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            handleSend()
          }}
          disabled={!canSend}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-30"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
