'use client'

import { cn } from '@/lib/utils'
import { Store, ShoppingBag, Heart } from 'lucide-react'

type TabKey = 'business' | 'marketplace' | 'favorites'

interface DashboardTabsProps {
  activeTab: TabKey
  classifiedsCount?: number
  favoritesCount?: number
  onTabChange: (tab: TabKey) => void
}

export function DashboardTabs({
  activeTab,
  classifiedsCount = 0,
  favoritesCount = 0,
  onTabChange
}: DashboardTabsProps) {
  const tabs = [
    {
      key: 'business' as TabKey,
      label: 'Mi Negocio',
      icon: Store
    },
    {
      key: 'marketplace' as TabKey,
      label: 'Mis Clasificados',
      icon: ShoppingBag,
      count: classifiedsCount
    },
    {
      key: 'favorites' as TabKey,
      label: 'Favoritos',
      icon: Heart,
      count: favoritesCount
    }
  ]

  return (
    <div className="border-b-4 border-black mb-8 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex items-center gap-2 px-6 py-4 font-bold uppercase tracking-widest text-sm transition-all',
                'border-x-2 border-t-2 border-black',
                isActive
                  ? 'bg-white border-b-4 border-b-primary text-black -mb-1'
                  : 'bg-black/5 text-black/60 border-b-4 border-b-black hover:bg-black/10 -mb-1'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'px-2 py-0.5 text-xs border-2 border-black rotate-[-2deg]',
                  isActive ? 'bg-secondary' : 'bg-secondary/50'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
