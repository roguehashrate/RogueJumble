import { generateImageByPubkey } from '@/lib/pubkey'
import { useEffect, useMemo, useState } from 'react'
import ImageWithLightbox from '../ImageWithLightbox'

export default function BannerWithLightbox({
  pubkey,
  banner
}: {
  pubkey: string
  banner?: string
}) {
  const defaultBanner = useMemo(() => generateImageByPubkey(pubkey), [pubkey])
  const [bannerUrl, setBannerUrl] = useState(banner ?? defaultBanner)

  useEffect(() => {
    if (banner) {
      setBannerUrl(banner)
    } else {
      setBannerUrl(defaultBanner)
    }
  }, [defaultBanner, banner])

  return (
    <ImageWithLightbox
      image={{ url: bannerUrl, pubkey }}
      className="aspect-[3/1] w-full rounded-2xl"
      classNames={{
        skeleton: 'rounded-2xl',
        wrapper: 'rounded-2xl border-none aspect-[3/1]'
      }}
      errorPlaceholder={defaultBanner}
      ignoreAutoLoadPolicy
    />
  )
}
