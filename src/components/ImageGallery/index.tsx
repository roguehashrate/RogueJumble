import { randomString } from '@/lib/random'
import { cn } from '@/lib/utils'
import { useContentPolicy } from '@/providers/ContentPolicyProvider'
import blossomService from '@/services/blossom.service'
import modalManager from '@/services/modal-manager.service'
import { TImetaInfo } from '@/types'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import DownloadPlugin from 'yet-another-react-lightbox/plugins/download'
import { Download } from 'lucide-react'
import Image from '../Image'
import ImageWithLightbox from '../ImageWithLightbox'

export default function ImageGallery({
  className,
  images,
  start = 0,
  end = images.length,
  mustLoad = false
}: {
  className?: string
  images: TImetaInfo[]
  start?: number
  end?: number
  mustLoad?: boolean
}) {
  const id = useMemo(() => `image-gallery-${randomString()}`, [])
  const { autoLoadMedia } = useContentPolicy()
  const [index, setIndex] = useState(-1)
  const [slides, setSlides] = useState<{ src: string }[]>(images.map(({ url }) => ({ src: url })))
  useEffect(() => {
    if (index >= 0) {
      modalManager.register(id, () => {
        setIndex(-1)
      })
    } else {
      modalManager.unregister(id)
    }
  }, [index])

  useEffect(() => {
    const loadImages = async () => {
      const slides = await Promise.all(
        images.map(({ url, pubkey }) => {
          return new Promise<{ src: string }>((resolve) => {
            const img = new window.Image()
            let validUrl = url
            img.onload = () => {
              blossomService.markAsSuccess(url, validUrl)
              resolve({ src: validUrl })
            }
            img.onerror = () => {
              blossomService.tryNextUrl(url).then((nextUrl) => {
                if (nextUrl) {
                  validUrl = nextUrl
                  resolve({ src: validUrl })
                } else {
                  resolve({ src: url })
                }
              })
            }
            if (pubkey) {
              blossomService
                .getValidUrl(url, pubkey)
                .then((u) => {
                  validUrl = u
                  img.src = validUrl
                })
                .catch(() => {
                  resolve({ src: url })
                })
            } else {
              img.src = url
            }
          })
        })
      )
      setSlides(slides)
    }

    loadImages()
  }, [images])

  const handleDownload = (event: React.MouseEvent, url: string) => {
    event.stopPropagation()
    event.preventDefault()
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.download = url.split('/').pop() || 'image'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handlePhotoClick = (event: React.MouseEvent, current: number) => {
    event.stopPropagation()
    event.preventDefault()
    setIndex(start + current)
  }

  const displayImages = images.slice(start, end)

  if (!mustLoad && !autoLoadMedia) {
    return displayImages.map((image, i) => (
      <ImageWithLightbox
        key={i}
        image={image}
        className="max-h-[80vh] object-contain sm:max-h-[50vh]"
        classNames={{
          wrapper: cn('w-fit max-w-full border', className)
        }}
      />
    ))
  }

  let imageContent: ReactNode | null = null
  if (displayImages.length === 1) {
    imageContent = (
      <div className="group relative w-fit max-w-full">
        <Image
          key={0}
          className="max-h-[80vh] object-contain sm:max-h-[50vh]"
          classNames={{
            errorPlaceholder: 'aspect-square h-[30vh]',
            wrapper: 'cursor-zoom-in border'
          }}
          image={displayImages[0]}
          onClick={(e) => handlePhotoClick(e, 0)}
        />
        <button
          onClick={(e) => handleDownload(e, displayImages[0].url)}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    )
  } else if (displayImages.length === 2 || displayImages.length === 4) {
    imageContent = (
      <div className="grid w-full grid-cols-2 gap-2">
        {displayImages.map((image, i) => (
          <Image
            key={i}
            className="aspect-square w-full"
            classNames={{ wrapper: 'cursor-zoom-in border' }}
            image={image}
            onClick={(e) => handlePhotoClick(e, i)}
          />
        ))}
      </div>
    )
  } else {
    imageContent = (
      <div className="grid w-full grid-cols-3 gap-2">
        {displayImages.map((image, i) => (
          <Image
            key={i}
            className="aspect-square w-full"
            classNames={{ wrapper: 'cursor-zoom-in border' }}
            image={image}
            onClick={(e) => handlePhotoClick(e, i)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn(displayImages.length === 1 ? 'w-fit max-w-full' : 'w-full', className)}>
      {imageContent}
      {index >= 0 &&
        createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <Lightbox
              index={index}
              slides={slides}
              plugins={[Zoom, DownloadPlugin]}
              open={index >= 0}
              close={() => setIndex(-1)}
              controller={{
                closeOnBackdropClick: true,
                closeOnPullUp: true,
                closeOnPullDown: true
              }}
              styles={{
                toolbar: { paddingTop: '2.25rem' }
              }}
            />
          </div>,
          document.body
        )}
    </div>
  )
}
