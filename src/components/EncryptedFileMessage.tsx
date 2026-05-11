import { cn } from '@/lib/utils'
import { TDmMessage } from '@/types'
import { AlertCircle, Download, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cryptoFileService from '@/services/crypto-file.service'

const decryptedBlobCache = new Map<string, string>()

export default function EncryptedFileMessage({
  message,
  isOwn,
  isHighlighted
}: {
  message: TDmMessage
  isOwn: boolean
  isHighlighted?: boolean
}) {
  const { t } = useTranslation()

  const tags = message.decryptedRumor?.tags ?? []
  const fileType = tags.find((t) => t[0] === 'file-type')?.[1] ?? ''
  const hexKey = tags.find((t) => t[0] === 'decryption-key')?.[1]
  const hexNonce = tags.find((t) => t[0] === 'decryption-nonce')?.[1]
  const fileUrl = message.content

  const isImage = fileType.startsWith('image/')
  const isVideo = fileType.startsWith('video/')
  const isAudio = fileType.startsWith('audio/')
  const isMedia = isImage || isVideo || isAudio
  const ext = fileType.split('/')[1]?.split('+')[0] ?? ''

  const cached = decryptedBlobCache.has(message.id)
  const [blobUrl, setBlobUrl] = useState<string | null>(
    cached ? decryptedBlobCache.get(message.id)! : null
  )
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(isMedia && !cached)

  const decryptFile = useCallback(async () => {
    if (decryptedBlobCache.has(message.id)) {
      setBlobUrl(decryptedBlobCache.get(message.id)!)
      return decryptedBlobCache.get(message.id)!
    }

    try {
      setLoading(true)
      setError(false)

      if (!hexKey || !hexNonce) {
        throw new Error('Missing decryption key or nonce')
      }

      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }

      const encryptedData = await response.arrayBuffer()
      const key = cryptoFileService.hexToBytes(hexKey)
      const nonce = cryptoFileService.hexToBytes(hexNonce)

      const decryptedData = await cryptoFileService.decryptFile(encryptedData, key, nonce)
      const blob = new Blob([decryptedData], { type: fileType })
      const url = URL.createObjectURL(blob)

      decryptedBlobCache.set(message.id, url)
      setBlobUrl(url)
      setLoading(false)
      return url
    } catch (err) {
      console.error('Failed to decrypt file:', err)
      setError(true)
      setLoading(false)
      return null
    }
  }, [fileUrl, hexKey, hexNonce, fileType])

  useEffect(() => {
    if (isMedia && !blobUrl && !error) {
      decryptFile()
    }
  }, [isMedia, blobUrl, error, decryptFile])

  const handleDownload = useCallback(() => {
    if (!blobUrl) {
      decryptFile().then((url) => {
        if (url) {
          const a = document.createElement('a')
          a.href = url
          a.download = `encrypted-file.${ext}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }
      })
    } else {
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `encrypted-file.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }, [blobUrl, ext, decryptFile])

  const bubbleClass = cn(
    'overflow-hidden wrap-break-word rounded-lg px-3 py-1.5',
    'w-fit min-w-9 max-w-full',
    isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'
  )

  if (error) {
    return (
      <div className={bubbleClass}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{t('Failed to decrypt file')}</span>
        </div>
      </div>
    )
  }

  if (loading && isMedia) {
    return (
      <div className={bubbleClass}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('Decrypting...')}</span>
        </div>
      </div>
    )
  }

  if (isImage && blobUrl) {
    return (
      <div className={cn(bubbleClass, 'p-0')}>
        <img
          src={blobUrl}
          alt="Encrypted image"
          className={cn(
            'max-w-full rounded-lg',
            isHighlighted && 'ring-2 ring-primary ring-offset-2'
          )}
          style={{ maxHeight: '300px', objectFit: 'contain' }}
        />
      </div>
    )
  }

  if (isVideo && blobUrl) {
    return (
      <div className={cn(bubbleClass, 'p-0')}>
        <video
          src={blobUrl}
          controls
          className={cn(
            'max-w-full rounded-lg',
            isHighlighted && 'ring-2 ring-primary ring-offset-2'
          )}
          style={{ maxHeight: '300px' }}
        />
      </div>
    )
  }

  if (isAudio && blobUrl) {
    return (
      <div className={bubbleClass}>
        <audio src={blobUrl} controls className="w-full" />
      </div>
    )
  }

  // File download for non-media files
  return (
    <div className={bubbleClass}>
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
      >
        <Download className="h-4 w-4" />
        <span>{t('Download file')}</span>
        {ext && <span className="text-muted-foreground">({ext})</span>}
      </button>
    </div>
  )
}
