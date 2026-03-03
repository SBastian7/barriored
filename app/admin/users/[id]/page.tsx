'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Shield, ShieldAlert, Calendar, ArrowLeft, Loader2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { RoleAssignmentDialog } from '@/components/admin/role-assignment-dialog'
import { SuspendUserDialog } from '@/components/admin/suspend-user-dialog'
import { DeleteUserDialog } from '@/components/admin/delete-user-dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'

type UserProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'moderator' | 'admin' | null
  is_super_admin: boolean | null
  is_suspended: boolean | null
  suspension_reason: string | null
  created_at: string | null
}

type Business = {
  id: string
  name: string
  slug: string
  status: string | null
  created_at: string | null
  categories: { name: string } | null
}

type Post = {
  id: string
  title: string
  type: string
  status: string
  created_at: string
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  function handleDeleteSuccess() {
    // Navigate back to users list
    router.push('/admin/users')
    // Force a hard refresh to ensure the list updates
    setTimeout(() => {
      router.refresh()
    }, 100)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch user profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (userData) setUser(userData)

      // Fetch user's businesses
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name, slug, status, created_at, categories(name)')
        .eq('owner_id', id)
        .order('created_at', { ascending: false })

      if (bizData) setBusinesses(bizData as Business[])

      // Fetch user's posts
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('id, title, type, status, created_at')
        .eq('author_id', id)
        .order('created_at', { ascending: false })

      if (postsData) setPosts(postsData)
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-xl font-bold">Usuario no encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Administración', href: '/admin/users' },
          { label: 'Usuarios', href: '/admin/users' },
          { label: user.full_name || 'Usuario', active: true },
        ]}
      />

      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-heading font-black uppercase italic tracking-tighter">
          Perfil de <span className="text-primary italic">Usuario</span>
        </h1>
        <Link href="/admin/users">
          <Button variant="outline" className="brutalist-button">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </Link>
      </div>

      {/* User Header Card */}
      <Card className="brutalist-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {user.avatar_url ? (
                <div className="relative h-20 w-20 border-2 border-black">
                  <Image
                    src={user.avatar_url}
                    alt={user.full_name || 'Avatar'}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 border-2 border-black bg-accent/20 flex items-center justify-center">
                  <User className="h-10 w-10 text-black/40" />
                </div>
              )}

              <div>
                <h2 className="text-3xl font-heading font-black uppercase italic tracking-tighter">
                  {user.full_name || 'Sin nombre'}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="font-black uppercase text-[10px]">
                    {user.role || 'user'}
                  </Badge>
                  {user.is_super_admin && (
                    <Badge className="bg-purple-600 text-white border-2 border-black text-[10px]">
                      SUPER ADMIN
                    </Badge>
                  )}
                  {user.is_suspended && (
                    <Badge variant="destructive" className="text-[10px]">
                      SUSPENDIDO
                    </Badge>
                  )}
                </div>
                {user.created_at && (
                  <p className="text-xs text-black/40 mt-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Miembro desde {format(new Date(user.created_at), 'PP', { locale: es })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Suspension Reason */}
          {user.is_suspended && user.suspension_reason && (
            <div className="mt-4 p-4 border-2 border-black bg-red-50">
              <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-1">
                Razón de Suspensión
              </p>
              <p className="text-sm">{user.suspension_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <RoleAssignmentDialog
          userId={id}
          currentRole={user.role}
          userName={user.full_name || 'Usuario'}
          onSuccess={fetchData}
        />
        <SuspendUserDialog
          userId={id}
          userName={user.full_name || 'Usuario'}
          isSuspended={user.is_suspended}
          onSuccess={fetchData}
        />
        <DeleteUserDialog
          userId={id}
          userName={user.full_name || 'Usuario'}
          businessCount={businesses.length}
          postCount={posts.length}
          onSuccess={handleDeleteSuccess}
        />
      </div>

      {/* User Activity Tabs */}
      <Tabs defaultValue="businesses" className="space-y-4">
        <TabsList className="brutalist-card p-1">
          <TabsTrigger
            value="businesses"
            className="font-black uppercase tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Negocios ({businesses.length})
          </TabsTrigger>
          <TabsTrigger
            value="posts"
            className="font-black uppercase tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Publicaciones ({posts.length})
          </TabsTrigger>
          <TabsTrigger
            value="info"
            className="font-black uppercase tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Información
          </TabsTrigger>
        </TabsList>

        {/* Businesses Tab */}
        <TabsContent value="businesses" className="space-y-3">
          {businesses.length === 0 ? (
            <Card className="brutalist-card bg-muted">
              <CardContent className="p-12 text-center">
                <p className="text-black/60">Este usuario no tiene negocios registrados</p>
              </CardContent>
            </Card>
          ) : (
            businesses.map((biz) => (
              <Card key={biz.id} className="brutalist-card bg-white">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-heading font-black uppercase italic text-lg tracking-tighter">
                      {biz.name}
                    </p>
                    <p className="text-xs text-black/40 uppercase tracking-widest">
                      {biz.categories?.name} •{' '}
                      {format(new Date(biz.created_at || ''), 'PP', { locale: es })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      biz.status === 'approved'
                        ? 'default'
                        : biz.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {biz.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-3">
          {posts.length === 0 ? (
            <Card className="brutalist-card bg-muted">
              <CardContent className="p-12 text-center">
                <p className="text-black/60">Este usuario no ha creado publicaciones</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="brutalist-card bg-white">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-heading font-black uppercase italic text-lg tracking-tighter">
                      {post.title}
                    </p>
                    <p className="text-xs text-black/40 uppercase tracking-widest">
                      {post.type} • {format(new Date(post.created_at), 'PP', { locale: es })}
                    </p>
                  </div>
                  <Badge variant={post.status === 'approved' ? 'default' : 'secondary'}>
                    {post.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info">
          <Card className="brutalist-card">
            <CardHeader className="border-b-2 border-black">
              <CardTitle className="font-heading font-black uppercase italic">
                Información del Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-black/60">
                    ID de Usuario
                  </p>
                  <p className="text-sm font-mono mt-1">{user.id}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-black/60">
                    Rol
                  </p>
                  <p className="text-sm mt-1">{user.role || 'user'}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-black/60">
                    Fecha de Registro
                  </p>
                  <p className="text-sm mt-1">
                    {user.created_at
                      ? format(new Date(user.created_at), 'PPP', { locale: es })
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-black/60">
                    Estado
                  </p>
                  <p className="text-sm mt-1">
                    {user.is_suspended ? 'Suspendido' : 'Activo'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
