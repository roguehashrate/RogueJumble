import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseEditorJsonToText } from '@/lib/tiptap'
import { cn } from '@/lib/utils'
import customEmojiService from '@/services/custom-emoji.service'
import postEditorCache from '@/services/post-editor-cache.service'
import { TEmoji } from '@/types'
import Document from '@tiptap/extension-document'
import { HardBreak } from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'
import Paragraph from '@tiptap/extension-paragraph'
import Placeholder from '@tiptap/extension-placeholder'
import Text from '@tiptap/extension-text'
import { TextSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor } from '@tiptap/react'
import { Event } from 'nostr-tools'
import { ChevronDown, ImageUp, PencilLine, Tv, Video } from 'lucide-react'
import { Dispatch, forwardRef, SetStateAction, useImperativeHandle, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardAndDropHandler } from './ClipboardAndDropHandler'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { isTouchDevice } from '@/lib/utils'
import Emoji from './Emoji'
import emojiSuggestion from './Emoji/suggestion'
import Mention from './Mention'
import mentionSuggestion from './Mention/suggestion'
import Preview from './Preview'
import { useUserPreferences } from '@/providers/UserPreferencesProvider'

export type TPostTextareaHandle = {
  appendText: (text: string, addNewline?: boolean) => void
  insertText: (text: string) => void
  insertEmoji: (emoji: string | TEmoji) => void
}

const PostTextarea = forwardRef<
  TPostTextareaHandle,
  {
    text: string
    setText: Dispatch<SetStateAction<string>>
    defaultContent?: string
    parentStuff?: Event | string
    onSubmit?: () => void
    className?: string
    onUploadStart?: (file: File, cancel: () => void) => void
    onUploadProgress?: (file: File, progress: number) => void
    onUploadEnd?: (file: File) => void
    placeholder?: string
    postKind?: 'text' | 'picture' | 'video' | 'shortVideo'
    setPostKind?: (kind: 'text' | 'picture' | 'video' | 'shortVideo') => void
  }
>(
  (
    {
      text = '',
      setText,
      defaultContent,
      parentStuff,
      onSubmit,
      className,
      onUploadStart,
      onUploadProgress,
      onUploadEnd,
      placeholder,
      postKind = 'text',
      setPostKind
    },
    ref
  ) => {
    const { t } = useTranslation()
    const { advancedMode } = useUserPreferences()
    const [tabValue, setTabValue] = useState('edit')
    const editor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        History,
        HardBreak,
        Placeholder.configure({
          placeholder:
            placeholder ??
            t('Write something...') + ' (' + t('Paste or drop media files to upload') + ')'
        }),
        Emoji.configure({
          suggestion: emojiSuggestion
        }),
        Mention.configure({
          suggestion: mentionSuggestion
        }),
        ClipboardAndDropHandler.configure({
          onUploadStart: (file, cancel) => {
            onUploadStart?.(file, cancel)
          },
          onUploadEnd: (file) => onUploadEnd?.(file),
          onUploadProgress: (file, p) => onUploadProgress?.(file, p)
        })
      ],
      editorProps: {
        attributes: {
          class: cn(
            'border rounded-lg p-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            className
          )
        },
        handleKeyDown: (_view, event) => {
          // Handle Ctrl+Enter or Cmd+Enter for submit
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            onSubmit?.()
            return true
          }
          return false
        },
        clipboardTextSerializer(content) {
          return parseEditorJsonToText(content.toJSON())
        }
      },
      content: postEditorCache.getPostContentCache({ defaultContent, parentStuff }),
      onUpdate(props) {
        setText(parseEditorJsonToText(props.editor.getJSON()))
        postEditorCache.setPostContentCache({ defaultContent, parentStuff }, props.editor.getJSON())
      },
      onCreate(props) {
        setText(parseEditorJsonToText(props.editor.getJSON()))
      }
    })

    useImperativeHandle(ref, () => ({
      appendText: (text: string, addNewline = false) => {
        if (editor) {
          let chain = editor
            .chain()
            .focus()
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                const endPos = tr.doc.content.size
                const selection = TextSelection.create(tr.doc, endPos)
                tr.setSelection(selection)
                dispatch(tr)
              }
              return true
            })
            .insertContent(text)
          if (addNewline) {
            chain = chain.setHardBreak()
          }
          chain.run()
        }
      },
      insertText: (text: string) => {
        if (editor) {
          editor.chain().focus().insertContent(text).run()
        }
      },
      insertEmoji: (emoji: string | TEmoji) => {
        if (editor) {
          if (typeof emoji === 'string') {
            editor.chain().insertContent(emoji).run()
          } else {
            const emojiNode = editor.schema.nodes.emoji.create({
              name: customEmojiService.getEmojiId(emoji)
            })
            editor.chain().insertContent(emojiNode).run()
          }
        }
      }
    }))

    const isTouch = useMemo(() => isTouchDevice(), [])
    const [kindDrawerOpen, setKindDrawerOpen] = useState(false)

    if (!editor) {
      return null
    }

    const PostKindOptions = () => (
      <>
        <div
          className="clickable flex items-center gap-3 px-4 py-3 text-sm"
          onClick={() => {
            setPostKind?.('text')
            setKindDrawerOpen(false)
          }}
        >
          <PencilLine className="size-4" />
          {t('Text Post')} (kind:1)
        </div>
        <div
          className="clickable flex items-center gap-3 px-4 py-3 text-sm"
          onClick={() => {
            setPostKind?.('picture')
            setKindDrawerOpen(false)
          }}
        >
          <ImageUp className="size-4" />
          {t('Picture Post')} (kind:20)
        </div>
        <div
          className="clickable flex items-center gap-3 px-4 py-3 text-sm"
          onClick={() => {
            setPostKind?.('video')
            setKindDrawerOpen(false)
          }}
        >
          <Tv className="size-4" />
          {t('Video Post')} (kind:21)
        </div>
        <div
          className="clickable flex items-center gap-3 px-4 py-3 text-sm"
          onClick={() => {
            setPostKind?.('shortVideo')
            setKindDrawerOpen(false)
          }}
        >
          <Video className="size-4" />
          {t('Short Video Post')} (kind:22)
        </div>
      </>
    )

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Tabs defaultValue="edit" value={tabValue} onValueChange={(v) => setTabValue(v)}>
            <TabsList>
              <TabsTrigger value="edit">{t('Edit')}</TabsTrigger>
              <TabsTrigger value="preview">{t('Preview')}</TabsTrigger>
            </TabsList>
          </Tabs>
          {setPostKind && !parentStuff && advancedMode && (
            <>
              {isTouch ? (
                <Drawer open={kindDrawerOpen} onOpenChange={setKindDrawerOpen}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => setKindDrawerOpen(true)}
                  >
                    {postKind === 'text' && (
                      <>
                        <PencilLine className="size-3.5" />
                        {t('Text')} (1)
                      </>
                    )}
                    {postKind === 'picture' && (
                      <>
                        <ImageUp className="size-3.5" />
                        {t('Picture')} (20)
                      </>
                    )}
                    {postKind === 'video' && (
                      <>
                        <Tv className="size-3.5" />
                        {t('Video')} (21)
                      </>
                    )}
                    {postKind === 'shortVideo' && (
                      <>
                        <Video className="size-3.5" />
                        {t('Short Video')} (22)
                      </>
                    )}
                    <ChevronDown className="size-3" />
                  </Button>
                  <DrawerContent>
                    <div className="pb-4">
                      <div className="px-4 py-3 text-sm font-semibold">{t('Post Type')}</div>
                      <PostKindOptions />
                    </div>
                  </DrawerContent>
                </Drawer>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      {postKind === 'text' && (
                        <>
                          <PencilLine className="size-3.5" />
                          {t('Text')}
                        </>
                      )}
                      {postKind === 'picture' && (
                        <>
                          <ImageUp className="size-3.5" />
                          {t('Picture')}
                        </>
                      )}
                      {postKind === 'video' && (
                        <>
                          <Tv className="size-3.5" />
                          {t('Video')}
                        </>
                      )}
                      {postKind === 'shortVideo' && (
                        <>
                          <Video className="size-3.5" />
                          {t('Short Video')}
                        </>
                      )}
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPostKind('text')}>
                      <PencilLine className="size-4" />
                      {t('Text Post')} (kind:1)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostKind('picture')}>
                      <ImageUp className="size-4" />
                      {t('Picture Post')} (kind:20)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostKind('video')}>
                      <Tv className="size-4" />
                      {t('Video Post')} (kind:21)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPostKind('shortVideo')}>
                      <Video className="size-4" />
                      {t('Short Video Post')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
        <Tabs value={tabValue} onValueChange={(v) => setTabValue(v)}>
          <TabsContent value="edit" className="mt-0">
            <EditorContent className="tiptap" editor={editor} />
          </TabsContent>
          <TabsContent
            value="preview"
            className="mt-0"
            onClick={() => {
              setTabValue('edit')
              editor.commands.focus()
            }}
          >
            <Preview content={text} className={className} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }
)
PostTextarea.displayName = 'PostTextarea'
export default PostTextarea
