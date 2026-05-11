import mediaDecryptService from '@/services/media-decrypt.service'
import { Download, Loader2, Unlock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function EncryptedMedia({
  url,
  keyHex,
  nonceHex,
  mimeType
}: {
  url: string
  keyHex: string
  nonceHex: string
  mimeType: string
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDecrypted, setShowDecrypted] = useState(!mimeType.startsWith('image/') && !mimeType.startsWith('video/'))
  const blobUrlRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!showDecrypted) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const decrypted = await mediaDecryptService.fetchAndDecrypt(url, keyHex, nonceHex)
        if (!mountedRef.current) return
        const blob = new Blob([decrypted], { type: mimeType })
        const objectUrl = URL.createObjectURL(blob)
        blobUrlRef.current = objectUrl
        setBlobUrl(objectUrl)
      } catch (e) {
        const msg = e instanceof TypeError ? 'Network error - server may not allow cross-origin requests' : e instanceof Error ? e.message : 'Unknown error'
        console.error('[EncryptedMedia]', msg, { url, keyHex, nonceHex, mimeType })
        if (mountedRef.current) setError(msg)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }
    load()

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [url, keyHex, nonceHex, mimeType, showDecrypted])

  const handleDecrypt = useCallback(() => {
    setShowDecrypted(true)
  }, [])

  if (!showDecrypted) {
    return (
      <div className="flex items-center justify-center">
        <button
          onClick={handleDecrypt}
          className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:bg-secondary"
        >
          <Unlock className="h-4 w-4" />
          Decrypt image
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 p-4 text-sm text-destructive">
        <span>Failed to load media</span>
        <span className="text-xs text-muted-foreground">{error}</span>
      </div>
    )
  }

  if (mimeType.startsWith('image/')) {
    return <img src={blobUrl} alt="" className="max-h-80 w-full rounded object-contain" />
  }

  if (mimeType.startsWith('video/')) {
    return (
      <video controls className="max-h-80 w-full rounded" src={blobUrl}>
        <track kind="captions" />
      </video>
    )
  }

  return (
    <a
      href={blobUrl}
      download
      className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground hover:bg-secondary"
    >
      <Download className="h-4 w-4" />
      <span className="truncate">{mimeType}</span>
    </a>
  )
}
