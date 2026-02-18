'use client'

import { createContext, useContext } from 'react'
import type { CommunityData } from '@/lib/types'

const CommunityContext = createContext<CommunityData | null>(null)

export function CommunityProvider({
  community,
  children,
}: {
  community: CommunityData
  children: React.ReactNode
}) {
  return (
    <CommunityContext.Provider value={community}>
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (!context) throw new Error('useCommunity must be used within CommunityProvider')
  return context
}
