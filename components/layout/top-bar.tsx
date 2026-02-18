'use client'

import Link from 'next/link'
import { useCommunity } from '@/components/community/community-provider'
import { SearchBar } from '@/components/shared/search-bar'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'

export function TopBar() {
  const community = useCommunity()

  return (
    <header className="sticky top-0 z-50 bg-background border-b-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="container mx-auto px-4 h-16 flex items-center gap-4">
        <Link href={`/${community.slug}`} className="group flex items-center gap-1">
          <span className="font-heading font-black text-2xl uppercase tracking-tighter italic">
            Barrio<span className="text-primary italic">Red</span>
          </span>
        </Link>
        <div className="flex-1 hidden md:block max-w-md mx-auto">
          <SearchBar />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/auth/login">
            <Button variant="outline" size="icon" className="h-10 w-10 border-2 border-black rounded-none">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>
    </header>
  )
}
