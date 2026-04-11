import mediaUpload from '@/services/media-upload.service'
import { Extension } from '@tiptap/core'
import { EditorView } from '@tiptap/pm/view'
import { Plugin, TextSelection } from 'prosemirror-state'

const DRAGOVER_CLASS_LIST = [
  'outline-2',
  'outline-offset-4',
  'outline-dashed',
  'outline-border',
  'rounded-md'
]

export interface ClipboardAndDropHandlerOptions {
  onUploadStart?: (file: File, cancel: () => void) => void
  onUploadEnd?: (file: File) => void
  onUploadProgress?: (file: File, progress: number) => void
}

export const ClipboardAndDropHandler = Extension.create<ClipboardAndDropHandlerOptions>({
  name: 'clipboardAndDropHandler',

  addOptions() {
    return {
      onUploadStart: undefined,
      onUploadSuccess: undefined,
      onUploadError: undefined,
      onUploadEnd: undefined,
      onUploadProgress: undefined,
      onProvideCancel: undefined
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            dragenter(view, event) {
              event.preventDefault()
              view.dom.classList.add(...DRAGOVER_CLASS_LIST)
              return true
            },
            dragover(view, event) {
              event.preventDefault()
              view.dom.classList.add(...DRAGOVER_CLASS_LIST)
              return true
            },
            dragleave(view) {
              view.dom.classList.remove(...DRAGOVER_CLASS_LIST)
              return true
            }
          },
          handleDrop(view: EditorView, event: DragEvent) {
            event.preventDefault()
            event.stopPropagation()
            view.dom.classList.remove(...DRAGOVER_CLASS_LIST)

            const items = Array.from(event.dataTransfer?.files ?? [])
            const mediaFiles = items.filter(
              (item) => item.type.includes('image') || item.type.includes('video') || item.type.includes('audio')
            )
            if (!mediaFiles.length) return false

            uploadFiles(view, mediaFiles, options)
            return true
          },
          handlePaste(view, event) {
            const items = Array.from(event.clipboardData?.items ?? [])

            // First, check for media files (images, videos, audio) - including GIFs from keyboards
            for (const item of items) {
              if (
                item.kind === 'file' &&
                (item.type.includes('image') || item.type.includes('video') || item.type.includes('audio'))
              ) {
                event.preventDefault()
                const file = item.getAsFile()
                if (file) {
                  uploadFiles(view, [file], options)
                  return true
                }
              }
            }

            // No media file found, let TipTap handle normal text paste
            return false
          }
        }
      })
    ]
  }
})

async function uploadFiles(
  view: EditorView,
  files: File[],
  options: ClipboardAndDropHandlerOptions
) {
  const abortControllers = new Map<File, AbortController>()
  files.forEach((file) => {
    const abortController = new AbortController()
    abortControllers.set(file, abortController)
    options.onUploadStart?.(file, () => abortController.abort())
  })

  for (const file of files) {
    const name = file.name

    const placeholder = `[Uploading "${name}"...]`
    const uploadingNode = view.state.schema.text(placeholder)
    const hardBreakNode = view.state.schema.nodes.hardBreak.create()
    let tr = view.state.tr.replaceSelectionWith(uploadingNode)
    tr = tr.insert(tr.selection.from, hardBreakNode)
    view.dispatch(tr)

    const abortController = abortControllers.get(file)

    mediaUpload
      .upload(file, {
        onProgress: (p) => options.onUploadProgress?.(file, p),
        signal: abortController?.signal
      })
      .then((result) => {
        options.onUploadEnd?.(file)
        const urlNode = view.state.schema.text(result.url)

        const tr = view.state.tr
        let didReplace = false

        view.state.doc.descendants((node, pos) => {
          if (node.isText && node.text && node.text.includes(placeholder) && !didReplace) {
            const startPos = node.text.indexOf(placeholder)
            const from = pos + startPos
            const to = from + placeholder.length
            tr.replaceWith(from, to, urlNode)
            didReplace = true
            return false
          }
          return true
        })

        if (didReplace) {
          view.dispatch(tr)
        } else {
          const endPos = view.state.doc.content.size

          const paragraphNode = view.state.schema.nodes.paragraph.create(
            null,
            view.state.schema.text(result.url)
          )

          const insertTr = view.state.tr.insert(endPos, paragraphNode)
          const newPos = endPos + 1 + result.url.length
          insertTr.setSelection(TextSelection.near(insertTr.doc.resolve(newPos)))
          view.dispatch(insertTr)
        }
      })
      .catch((error) => {
        console.error('Upload failed:', error)
        options.onUploadEnd?.(file)

        const tr = view.state.tr
        let didReplace = false

        view.state.doc.descendants((node, pos) => {
          if (node.isText && node.text && node.text.includes(placeholder) && !didReplace) {
            const startPos = node.text.indexOf(placeholder)
            const from = pos + startPos
            const to = from + placeholder.length
            const errorNode = view.state.schema.text(`[Error uploading "${name}"]`)
            tr.replaceWith(from, to, errorNode)
            didReplace = true
            return false
          }
          return true
        })

        if (didReplace) {
          view.dispatch(tr)
        }
        throw error
      })
  }
}
