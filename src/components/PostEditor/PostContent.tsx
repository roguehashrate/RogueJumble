import Note from '@/components/Note'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StorageKey } from '@/constants'
import {
  createCommentDraftEvent,
  createCommunityPostDraftEvent,
  createHighlightDraftEvent,
  createLongFormArticleDraftEvent,
  createPollDraftEvent,
  createShortTextNoteDraftEvent,
  deleteDraftEventCache
} from '@/lib/draft-event'
import { getDefaultRelayUrls } from '@/lib/relay'
import { cn, isTouchDevice } from '@/lib/utils'
import { haptic } from '@/lib/haptic'
import { useNostr } from '@/providers/NostrProvider'
import postEditorCache from '@/services/post-editor-cache.service'
import threadService from '@/services/thread.service'
import { TPollCreateData } from '@/types'
import {
  Ban,
  CircleHelp,
  ImageUp,
  ListTodo,
  LoaderCircle,
  Pickaxe,
  Smile,
  Tag,
  X
} from 'lucide-react'
import { Event, kinds } from 'nostr-tools'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import EmojiPickerDialog from '../EmojiPickerDialog'
import CommunityPicker from '../CommunityPicker'
import Mentions from './Mentions'
import PollEditor from './PollEditor'
import PostKindSelector from './PostKindSelector'
import PostRelaySelector from './PostRelaySelector'
import PostTextarea, { TPostTextareaHandle } from './PostTextarea'
import Uploader from './Uploader'
import { formatError } from '@/lib/error'

export default function PostContent({
  defaultContent = '',
  parentStuff,
  close,
  openFrom,
  highlightedText
}: {
  defaultContent?: string
  parentStuff?: Event | string
  close: () => void
  openFrom?: string[]
  highlightedText?: string
}) {
  const { t } = useTranslation()
  const { pubkey, publish, checkLogin } = useNostr()
  const [text, setText] = useState('')
  const textareaRef = useRef<TPostTextareaHandle>(null)
  const [posting, setPosting] = useState(false)
  const [uploadProgresses, setUploadProgresses] = useState<
    { file: File; progress: number; cancel: () => void }[]
  >([])
  const parentEvent = useMemo(
    () => (parentStuff && typeof parentStuff !== 'string' ? parentStuff : undefined),
    [parentStuff]
  )
  const [addClientTag, setAddClientTag] = useState(true)
  const [mentions, setMentions] = useState<string[]>([])
  const [isNsfw, setIsNsfw] = useState(false)
  const [isPoll, setIsPoll] = useState(false)
  const [isProtectedEvent, setIsProtectedEvent] = useState(false)
  const [additionalRelayUrls, setAdditionalRelayUrls] = useState<string[]>([])
  const [pollCreateData, setPollCreateData] = useState<TPollCreateData>({
    isMultipleChoice: false,
    options: ['', ''],
    endsAt: undefined,
    relays: []
  })
  const [minPow, setMinPow] = useState(() => {
    const cached = window.localStorage.getItem(StorageKey.POW_ENABLED)
    if (cached === 'false') return 0
    const storedDifficulty = window.localStorage.getItem(StorageKey.POW_POST_DIFFICULTY)
    return storedDifficulty ? parseInt(storedDifficulty, 10) : 16
  })
  const [postKind, setPostKind] = useState<'text' | 'picture' | 'video' | 'shortVideo' | 'poll' | 'communityPost' | 'longForm'>('text')
  const [articleTitle, setArticleTitle] = useState('')
  const [articleContent, setArticleContent] = useState('')
  const [articleTags, setArticleTags] = useState('')
  const [communityCoordinate, setCommunityCoordinate] = useState('')
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([])
  const userDismissedProtected = useRef(false)
  const handleProtectedSuggestionChange = useCallback((suggested: boolean) => {
    if (suggested && !userDismissedProtected.current) {
      setIsProtectedEvent(true)
    }
  }, [])
  const handleProtectedToggle = useCallback((checked: boolean) => {
    if (!checked) {
      userDismissedProtected.current = true
    }
    setIsProtectedEvent(checked)
  }, [])
  const isFirstRender = useRef(true)
  const canPost = useMemo(() => {
    return (
      !!pubkey &&
      (postKind === 'longForm'
        ? !!articleTitle.trim() && !!articleContent.trim()
        : !!text || !!highlightedText) &&
      !posting &&
      !uploadProgresses.length &&
      (!(postKind === 'poll' || isPoll) || pollCreateData.options.filter((option) => !!option.trim()).length >= 2) &&
      (postKind !== 'communityPost' || !!communityCoordinate) &&
      (!isProtectedEvent || additionalRelayUrls.length > 0)
    )
  }, [
    pubkey,
    text,
    highlightedText,
    posting,
    uploadProgresses,
    isPoll,
    pollCreateData,
    isProtectedEvent,
    additionalRelayUrls,
    postKind,
    articleTitle,
    articleContent,
    communityCoordinate
  ])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      const cachedSettings = postEditorCache.getPostSettingsCache({
        defaultContent,
        parentStuff
      })
      if (cachedSettings) {
        setIsNsfw(cachedSettings.isNsfw ?? false)
        setIsPoll(cachedSettings.isPoll ?? false)
        setPollCreateData(
          cachedSettings.pollCreateData ?? {
            isMultipleChoice: false,
            options: ['', ''],
            endsAt: undefined,
            relays: []
          }
        )
        setAddClientTag(cachedSettings.addClientTag ?? true)
      }
      return
    }
    postEditorCache.setPostSettingsCache(
      { defaultContent, parentStuff },
      {
        isNsfw,
        isPoll,
        pollCreateData,
        addClientTag
      }
    )
  }, [defaultContent, parentStuff, isNsfw, isPoll, pollCreateData, addClientTag])

  const postingRef = useRef(false)

  const post = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    checkLogin(async () => {
      if (!canPost || !pubkey || postingRef.current) return

      postingRef.current = true
      setPosting(true)
      try {
        // Prepend uploaded media URLs to the text so they're included in the posted event
        const mediaUrlsText = uploadedMediaUrls.length > 0 ? uploadedMediaUrls.join('\n') + '\n' : ''
        const textWithMedia = mediaUrlsText + text

        const draftEvent = await createDraftEvent({
          parentStuff,
          highlightedText,
          text: textWithMedia,
          mentions,
          isPoll,
          pollCreateData,
          pubkey,
          addClientTag,
          isProtectedEvent,
          isNsfw,
          postKind,
          articleTitle,
          articleContent,
          articleTags,
          communityCoordinate
        })

        const _additionalRelayUrls = [...additionalRelayUrls]
        if (parentStuff && typeof parentStuff === 'string') {
          _additionalRelayUrls.push(...getDefaultRelayUrls())
        }

        const newEvent = await publish(draftEvent, {
          specifiedRelayUrls: isProtectedEvent ? additionalRelayUrls : undefined,
          additionalRelayUrls: isPoll ? pollCreateData.relays : _additionalRelayUrls,
          minPow
        })
        postEditorCache.clearPostCache({ defaultContent, parentStuff })
        deleteDraftEventCache(draftEvent)
        threadService.addRepliesToThread([newEvent])
        toast.success(t('Post successful'), { duration: 2000 })
        haptic('success')
        close()
      } catch (error) {
        const errors = formatError(error)
        errors.forEach((err) => {
          toast.error(`${t('Failed to post')}: ${err}`, { duration: 10_000 })
        })
        return
      } finally {
        setPosting(false)
        postingRef.current = false
      }
    })
  }

  const handlePollToggle = () => {
    if (parentStuff) return

    setIsPoll((prev) => !prev)
  }

  const handleUploadStart = (file: File, cancel: () => void) => {
    setUploadProgresses((prev) => [...prev, { file, progress: 0, cancel }])
  }

  const handleUploadProgress = (file: File, progress: number) => {
    setUploadProgresses((prev) =>
      prev.map((item) => (item.file === file ? { ...item, progress } : item))
    )
  }

  const handleUploadEnd = (file: File) => {
    setUploadProgresses((prev) => prev.filter((item) => item.file !== file))
  }

  const handleMediaUploadSuccess = ({ url }: { url: string }) => {
    setUploadedMediaUrls((prev) => [...prev, url])
  }

  const removeMedia = (index: number) => {
    setUploadedMediaUrls((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {parentEvent && (
        <ScrollArea className="flex max-h-48 flex-col overflow-y-auto rounded-lg border bg-muted/40">
          <div className="pointer-events-none p-2 sm:p-3">
            {highlightedText ? (
              <div className="flex gap-4">
                <div className="my-1 w-1 flex-shrink-0 rounded-md bg-primary/60" />
                <div className="whitespace-pre-line italic">{highlightedText}</div>
              </div>
            ) : (
              <Note size="small" event={parentEvent} hideParentNotePreview />
            )}
          </div>
        </ScrollArea>
      )}

      {/* Post kind selector - always visible */}
      {!parentStuff && (
        <div className="flex justify-end">
          <PostKindSelector
            value={postKind}
            onChange={setPostKind}
          />
        </div>
      )}

      {postKind === 'longForm' && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder={t('Title...')}
            value={articleTitle}
            onChange={(e) => setArticleTitle(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base font-semibold transition-all duration-200 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <textarea
            rows={8}
            placeholder={t('Type your article...')}
            value={articleContent}
            onChange={(e) => setArticleContent(e.target.value)}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <div className="space-y-1">
            <input
              type="text"
              placeholder={t('Tags (e.g. #nostr #btc #note)...')}
              value={articleTags}
              onChange={(e) => setArticleTags(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            {articleTags.trim() && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {articleTags
                  .trim()
                  .split(/\s+/)
                  .map((tag, i) => {
                    const clean = tag.replace(/^#/, '')
                    return clean ? (
                      <span
                        key={i}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        #{clean}
                      </span>
                    ) : null
                  })}
              </div>
            )}
          </div>
        </div>
      )}
      {postKind !== 'longForm' && (
        <>
          {/* Media upload area + preview */}
          {(postKind === 'picture' || postKind === 'video' || postKind === 'shortVideo') && (
            <div className="space-y-2">
              {uploadedMediaUrls.map((url, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl border bg-muted/40">
                  {postKind === 'picture' ? (
                    <img src={url} alt="" className="h-auto max-h-[300px] w-full object-contain" />
                  ) : (
                    <video src={url} controls className="h-auto max-h-[300px] w-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <Uploader
                onUploadSuccess={handleMediaUploadSuccess}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
                onProgress={handleUploadProgress}
                accept={postKind === 'picture' ? 'image/*' : 'video/*'}
              >
                <div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-6 transition-colors hover:border-primary/40 hover:bg-muted/40">
                  <div className="flex cursor-pointer items-center gap-2 text-muted-foreground hover:text-primary">
                    <ImageUp className="size-5" />
                    <span className="text-sm font-medium">
                      {postKind === 'picture'
                        ? t('Tap to add a picture')
                        : postKind === 'video'
                          ? t('Tap to add a video')
                          : t('Tap to add a short video')}
                    </span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground/60">
                    {postKind === 'picture' ? 'JPG, PNG, GIF, WEBP' : 'MP4, WEBM, MOV'}
                  </span>
                </div>
              </Uploader>
            </div>
          )}

          {postKind === 'picture' && (
            <PostTextarea
              ref={textareaRef}
              text={text}
              setText={setText}
              defaultContent={defaultContent}
              parentStuff={parentStuff}
              onSubmit={() => post()}
              className="min-h-32"
              postKind={postKind}
              onUploadStart={handleUploadStart}
              onUploadProgress={handleUploadProgress}
              onUploadEnd={handleUploadEnd}
              placeholder={highlightedText ? t('Write your thoughts about this highlight...') : undefined}
            />
          )}
          {(postKind === 'video' || postKind === 'shortVideo') && (
            <PostTextarea
              ref={textareaRef}
              text={text}
              setText={setText}
              defaultContent={defaultContent}
              parentStuff={parentStuff}
              onSubmit={() => post()}
              className="min-h-32"
              postKind={postKind}
              onUploadStart={handleUploadStart}
              onUploadProgress={handleUploadProgress}
              onUploadEnd={handleUploadEnd}
              placeholder={highlightedText ? t('Write your thoughts about this highlight...') : undefined}
            />
          )}
          {postKind !== 'picture' && postKind !== 'video' && postKind !== 'shortVideo' && (
            <PostTextarea
              ref={textareaRef}
              text={text}
              setText={setText}
              defaultContent={defaultContent}
              parentStuff={parentStuff}
              onSubmit={() => post()}
              className={postKind === 'poll' || isPoll ? 'min-h-20' : 'min-h-52'}
              postKind={postKind}
              onUploadStart={handleUploadStart}
              onUploadProgress={handleUploadProgress}
              onUploadEnd={handleUploadEnd}
              placeholder={highlightedText ? t('Write your thoughts about this highlight...') : undefined}
            />
          )}

          {/* Kind-specific fields for non-longForm kinds */}
      {postKind === 'communityPost' && (
        <CommunityPicker
          value={communityCoordinate}
          onChange={(coord) => setCommunityCoordinate(coord)}
        />
      )}
      {(postKind === 'poll' || isPoll) && (
        <PollEditor
          pollCreateData={pollCreateData}
          setPollCreateData={setPollCreateData}
          setIsPoll={setIsPoll}
        />
      )}
      {uploadProgresses.length > 0 &&
        uploadProgresses.map(({ file, progress, cancel }, index) => (
          <div key={`${file.name}-${index}`} className="mt-2 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 truncate text-xs text-muted-foreground">
                {file.name ?? t('Uploading...')}
              </div>
              <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width] duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                cancel?.()
                handleUploadEnd(file)
              }}
              className="text-muted-foreground hover:text-foreground"
              title={t('Cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      {!isPoll && (
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <PostRelaySelector
              onProtectedSuggestionChange={handleProtectedSuggestionChange}
              setAdditionalRelayUrls={setAdditionalRelayUrls}
              parentEvent={parentEvent}
              openFrom={openFrom}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Switch
              id="protected-event"
              checked={isProtectedEvent}
              onCheckedChange={handleProtectedToggle}
            />
            <Label
              htmlFor="protected-event"
              className="cursor-pointer text-xs text-muted-foreground"
            >
              {t('Protected')}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="flex shrink-0">
                  <CircleHelp className="!size-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="text-sm">{t('Protected event hint')}</PopoverContent>
            </Popover>
          </div>
        </div>
      )}
        </>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Uploader
            onUploadSuccess={({ url }) => {
              textareaRef.current?.appendText(url, true)
            }}
            onUploadStart={handleUploadStart}
            onUploadEnd={handleUploadEnd}
            onProgress={handleUploadProgress}
            accept="image/*,video/*,audio/*"
          >
            <Button variant="ghost" size="icon">
              <ImageUp />
            </Button>
          </Uploader>
          {/* I'm not sure why, but after triggering the virtual keyboard,
              opening the emoji picker drawer causes an issue,
              the emoji I tap isn't the one that gets inserted. */}
          {!isTouchDevice() && (
            <EmojiPickerDialog
              onEmojiClick={(emoji) => {
                if (!emoji) return
                textareaRef.current?.insertEmoji(emoji)
              }}
            >
              <Button variant="ghost" size="icon">
                <Smile />
              </Button>
            </EmojiPickerDialog>
          )}
          {!parentStuff && (
            <Button
              variant="ghost"
              size="icon"
              title={t('Create Poll')}
              className={cn('text-muted-foreground', isPoll && 'text-primary')}
              onClick={handlePollToggle}
            >
              <ListTodo />
            </Button>
          )}
          <button
            type="button"
            title={t('Client Tag')}
            className={addClientTag ? 'text-primary' : 'text-white'}
            style={{
              background: 'transparent',
              border: 'none',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              margin: '0 2px'
            }}
            onClick={() => setAddClientTag(!addClientTag)}
          >
            <Tag />
          </button>
          <button
            type="button"
            title={t('Proof of Work')}
            className={minPow > 0 ? 'text-primary' : 'text-white'}
            style={{
              background: 'transparent',
              border: 'none',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              margin: '0 2px'
            }}
            onClick={() => setMinPow(minPow > 0 ? 0 : 16)}
          >
            <Pickaxe />
          </button>
          <button
            type="button"
            title={t('NSFW')}
            className={isNsfw ? 'text-primary' : 'text-white'}
            style={{
              background: 'transparent',
              border: 'none',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              margin: '0 2px'
            }}
            onClick={() => setIsNsfw(!isNsfw)}
          >
            <Ban />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Mentions
            content={text}
            parentEvent={parentEvent}
            mentions={mentions}
            setMentions={setMentions}
          />
          <div className="flex items-center gap-2 max-sm:hidden">
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                close()
              }}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!canPost} onClick={post}>
              {posting && <LoaderCircle className="animate-spin" />}
              {parentStuff ? (highlightedText ? t('Publish Highlight') : t('Reply')) : t('Post')}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-around gap-2 sm:hidden">
        <Button
          className="w-full"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
        >
          {t('Cancel')}
        </Button>
        <Button className="w-full" type="submit" disabled={!canPost} onClick={post}>
          {posting && <LoaderCircle className="animate-spin" />}
          {parentStuff ? t('Reply') : t('Post')}
        </Button>
      </div>
    </div>
  )
}

async function createDraftEvent({
  parentStuff,
  text,
  mentions,
  isPoll,
  pollCreateData,
  pubkey,
  addClientTag,
  isProtectedEvent,
  isNsfw,
  highlightedText,
  postKind = 'text',
  articleTitle,
  articleContent,
  articleTags,
  communityCoordinate
}: {
  parentStuff: Event | string | undefined
  text: string
  mentions: string[]
  isPoll: boolean
  pollCreateData: TPollCreateData
  pubkey: string
  addClientTag: boolean
  isProtectedEvent: boolean
  isNsfw: boolean
  highlightedText?: string
  postKind?: 'text' | 'picture' | 'video' | 'shortVideo' | 'poll' | 'communityPost' | 'longForm'
  articleTitle?: string
  articleContent?: string
  articleTags?: string
  communityCoordinate?: string
}) {
  const { parentEvent, externalContent } =
    typeof parentStuff === 'string'
      ? { parentEvent: undefined, externalContent: parentStuff }
      : { parentEvent: parentStuff, externalContent: undefined }

  if (highlightedText && parentEvent) {
    return createHighlightDraftEvent(highlightedText, text, parentEvent, mentions, {
      addClientTag,
      protectedEvent: isProtectedEvent,
      isNsfw
    })
  }

  if (parentStuff && (externalContent || parentEvent?.kind !== kinds.ShortTextNote)) {
    return await createCommentDraftEvent(text, parentStuff, mentions, {
      addClientTag,
      protectedEvent: isProtectedEvent,
      isNsfw
    })
  }

  if (postKind === 'poll' || isPoll) {
    return await createPollDraftEvent(pubkey, text, mentions, pollCreateData, {
      addClientTag,
      isNsfw
    })
  }

  if (postKind === 'longForm') {
    return await createLongFormArticleDraftEvent(articleContent ?? '', articleTitle ?? '', articleTags ?? '', mentions, {
      addClientTag,
      protectedEvent: isProtectedEvent,
      isNsfw
    })
  }

  if (postKind === 'communityPost') {
    return await createCommunityPostDraftEvent(text, communityCoordinate ?? '', mentions, {
      addClientTag,
      protectedEvent: isProtectedEvent,
      isNsfw
    })
  }

  return await createShortTextNoteDraftEvent(text, mentions, {
    parentEvent,
    addClientTag,
    protectedEvent: isProtectedEvent,
    isNsfw,
    postKind
  })
}
