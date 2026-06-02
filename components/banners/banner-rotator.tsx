'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BannerAd {
  id: string
  business_id: string
  community_id: string
  title: string
  image_url: string
  link_url: string | null
  placement: 'homepage' | 'directory'
  status: 'requested' | 'active' | 'paused' | 'expired'
  starts_at: string | null
  ends_at: string | null
  requested_at: string
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

interface BannerRotatorProps {
  placement: 'homepage' | 'directory'
  communityId: string
}

export function BannerRotator({ placement, communityId }: BannerRotatorProps) {
  const [banner, setBanner] = useState<BannerAd | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBanner() {
      try {
        const res = await fetch(
          `/api/banners/active?communityId=${communityId}&placement=${placement}`
        )
        const data = await res.json()

        if (data.banners && data.banners.length > 0) {
          // Random selection from active banners
          const randomIndex = Math.floor(Math.random() * data.banners.length)
          setBanner(data.banners[randomIndex])
        }
      } catch (error) {
        console.error('Error fetching banner:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBanner()
  }, [communityId, placement])

  if (loading || !banner) return null

  const BannerWrapper = banner.link_url ? 'a' : 'div'

  return (
    <BannerWrapper
      {...(banner.link_url
        ? {
            href: banner.link_url,
            target: '_blank',
            rel: 'noopener noreferrer',
          }
        : {})}
      className="block border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={banner.image_url}
          alt={banner.title}
          fill
          className="object-cover"
          priority={placement === 'homepage'}
        />
      </div>
    </BannerWrapper>
  )
}
