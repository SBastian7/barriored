'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LayoutDashboard, Shield, LogOut } from 'lucide-react'

type UserState = {
  email: string
  role: string | null
} | null

export function UserMenu() {
  const [userState, setUserState] = useState<UserState>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUserState(null)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setUserState({
        email: user.email ?? '',
        role: profile?.role ?? null,
      })
      setLoading(false)
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/')
  }

  if (loading) {
    return (
      <Button variant="outline" size="icon" className="h-10 w-10 border-2 border-black rounded-none" disabled>
        <User className="h-5 w-5 animate-pulse" />
      </Button>
    )
  }

  if (!userState) {
    return (
      <Link href="/auth/login">
        <Button variant="outline" size="icon" className="h-10 w-10 border-2 border-black rounded-none">
          <User className="h-5 w-5" />
        </Button>
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-10 w-10 border-2 border-black rounded-none">
          <User className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary border-2 border-black rounded-full" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{userState.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2 w-full">
            <LayoutDashboard className="h-4 w-4" />
            Mi Panel
          </Link>
        </DropdownMenuItem>
        {userState.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/admin/businesses" className="flex items-center gap-2 w-full">
              <Shield className="h-4 w-4" />
              Administración
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer">
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
