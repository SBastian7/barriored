'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Shield, ShieldAlert, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type UserProfile = {
  id: string
  full_name: string | null
  role: 'user' | 'moderator' | 'admin' | null
  is_super_admin: boolean | null
  is_suspended: boolean | null
  created_at: string | null
  _count: {
    businesses: number
    posts: number
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [roleFilter, setRoleFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  // Re-fetch users when page becomes visible (after navigation back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUsers()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('community_id, is_super_admin')
        .eq('id', currentUser.id)
        .single() as { data: any }

      // Build query
      let query = supabase
        .from('profiles')
        .select('id, full_name, role, is_super_admin, is_suspended, created_at')
        .order('created_at', { ascending: false })

      // Filter by community for non-super-admins
      if (!currentProfile?.is_super_admin && currentProfile?.community_id) {
        query = query.eq('community_id', currentProfile.community_id)
      }

      // Filter by role
      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      const { data } = await query

      if (data) {
        // Fetch counts for each user
        const usersWithCounts = await Promise.all(
          data.map(async (user: any) => {
            const [businesses, posts] = await Promise.all([
              supabase
                .from('businesses')
                .select('id', { count: 'exact', head: true })
                .eq('owner_id', user.id),
              supabase
                .from('community_posts')
                .select('id', { count: 'exact', head: true })
                .eq('author_id', user.id),
            ])

            return {
              ...user,
              _count: {
                businesses: businesses.count || 0,
                posts: posts.count || 0,
              },
            }
          })
        )

        setUsers(usersWithCounts)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return user.full_name?.toLowerCase().includes(query) || false
  })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Gestión de <span className="text-primary italic">Usuarios</span>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="brutalist-input w-64">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="user">Usuarios</SelectItem>
            <SelectItem value="moderator">Moderadores</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="brutalist-input pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="brutalist-card bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black">{users.length}</p>
            <p className="text-xs font-black uppercase tracking-widest text-black/50">
              Total Usuarios
            </p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-secondary/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black">
              {users.filter(u => u.role === 'moderator').length}
            </p>
            <p className="text-xs font-black uppercase tracking-widest text-black/50">
              Moderadores
            </p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-primary/10">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black">
              {users.filter(u => u.role === 'admin' || u.is_super_admin).length}
            </p>
            <p className="text-xs font-black uppercase tracking-widest text-black/50">
              Administradores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Users List */}
      {!loading && (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card
              key={user.id}
              className={`brutalist-card ${
                user.is_suspended ? 'bg-red-50 border-red-600' : 'bg-white'
              }`}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`p-3 border-2 border-black ${
                      user.is_super_admin
                        ? 'bg-purple-500'
                        : user.role === 'admin'
                          ? 'bg-primary'
                          : user.role === 'moderator'
                            ? 'bg-secondary'
                            : 'bg-accent/50'
                    }`}
                  >
                    {user.is_super_admin ? (
                      <ShieldAlert className="h-5 w-5 text-white" />
                    ) : user.role === 'admin' || user.role === 'moderator' ? (
                      <Shield className="h-5 w-5 text-white" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading font-black text-lg uppercase italic tracking-tighter">
                        {user.full_name || 'Sin nombre'}
                      </p>
                      {user.is_suspended && (
                        <Badge variant="destructive" className="text-[9px]">
                          SUSPENDIDO
                        </Badge>
                      )}
                      {user.is_super_admin && (
                        <Badge className="bg-purple-600 text-white border-2 border-black text-[9px]">
                          SUPER ADMIN
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] font-black uppercase">
                        {user.role || 'user'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-black/40 font-black uppercase tracking-widest mt-1">
                      {user._count.businesses} negocios • {user._count.posts} publicaciones
                    </p>
                  </div>
                </div>

                <Link href={`/admin/users/${user.id}`}>
                  <Button size="sm" className="brutalist-button">
                    Ver Perfil
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && !loading && (
            <Card className="brutalist-card bg-muted">
              <CardContent className="p-12 text-center">
                <p className="text-black/60">No se encontraron usuarios</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
