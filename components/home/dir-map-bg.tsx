'use client'

import dynamic from 'next/dynamic'

const Inner = dynamic(() => import('./dir-map-bg-inner'), { ssr: false, loading: () => null })

export function DirMapBg() {
  return <Inner />
}
