'use client'

import { Card, CardContent } from '@/components/ui/card'
import { HardDrive, Building2, MessageSquare, User } from 'lucide-react'

interface StorageOverviewCardsProps {
  total: { bytes: number; gb: string }
  buckets: Array<{ name: string; bytes: number; gb: string; file_count: number }>
}

export function StorageOverviewCards({ total, buckets }: StorageOverviewCardsProps) {
  const getBucketData = (bucketName: string) => {
    return buckets.find(b => b.name === bucketName) || { gb: '0', file_count: 0 }
  }

  const cards = [
    {
      title: 'Total',
      value: total.gb,
      unit: 'GB',
      icon: HardDrive,
      color: 'bg-primary'
    },
    {
      title: 'Negocios',
      value: getBucketData('business-images').gb,
      unit: 'GB',
      icon: Building2,
      color: 'bg-accent'
    },
    {
      title: 'Comunidad',
      value: getBucketData('community-posts').gb,
      unit: 'GB',
      icon: MessageSquare,
      color: 'bg-secondary'
    },
    {
      title: 'Perfiles',
      value: getBucketData('profiles').gb,
      unit: 'GB',
      icon: User,
      color: 'bg-[oklch(0.5_0.15_150)]'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.title}
            className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
          >
            <CardContent className="p-0">
              <div className="flex">
                <div className={`w-16 flex items-center justify-center ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="p-4 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                    {card.title}
                  </p>
                  <p className="text-3xl font-heading font-black italic">
                    {card.value}
                    <span className="text-lg ml-1 text-black/60">{card.unit}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
