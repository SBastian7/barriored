'use client'

import Link from 'next/link'
import { useCommunity } from '@/components/community/community-provider'
import { SearchBar } from '@/components/shared/search-bar'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'

export function TopBar() {
  const community = useCommunity()

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 h-14 flex items-center gap-4">
        <Link href={`/${community.slug}`} className="font-bold text-lg shrink-0" style={{ color: community.primary_color }}>
          BarrioRed
        </Link>
        <div className="flex-1 hidden sm:block">
          <SearchBar />
        </div>
        <Link href="/auth/login">
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </Link>
      </div>
      <div className="sm:hidden px-4 pb-2">
        <SearchBar />
      </div>
    </header>
  )
}
