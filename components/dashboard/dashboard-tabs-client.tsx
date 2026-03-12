'use client'

import { useRouter, usePathname } from 'next/navigation'
import { DashboardTabs } from './dashboard-tabs'

type TabKey = 'business' | 'marketplace' | 'favorites'

interface DashboardTabsClientProps {
  activeTab: TabKey
  classifiedsCount: number
  favoritesCount: number
}

export function DashboardTabsClient({
  activeTab,
  classifiedsCount,
  favoritesCount
}: DashboardTabsClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = (tab: TabKey) => {
    router.push(`${pathname}?tab=${tab}`)
  }

  return (
    <DashboardTabs
      activeTab={activeTab}
      classifiedsCount={classifiedsCount}
      favoritesCount={favoritesCount}
      onTabChange={handleTabChange}
    />
  )
}
