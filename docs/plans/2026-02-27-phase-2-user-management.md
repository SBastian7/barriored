# Phase 2: User Management System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build comprehensive user management system for admins to view, manage roles, suspend, and delete users

**Architecture:** User list with filters/search, detailed user profiles with activity tabs, role assignment dialog, suspension system with reasons, and hard delete with cascade warnings

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Radix UI, Tailwind CSS

**Prerequisites:** Phase 1 must be complete (database migration and permission system in place)

---

## Task 1: Users List Page - Structure and Data Fetching

**Files:**
- Create: `app/admin/users/page.tsx`

**Step 1: Create users list page structure**

```typescript
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

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('community_id, is_super_admin')
        .eq('id', currentUser.id)
        .single()

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
          data.map(async (user) => {
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
```

**Step 2: Commit**

```bash
git add app/admin/users/page.tsx
git commit -m "feat(admin): create users list page

- List all users with role and suspension badges
- Filter by role (user/moderator/admin)
- Search by name
- Show user stats (total, moderators, admins)
- Display business and post counts per user
- Community-scoped for non-super-admins

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

Due to space constraints, I'm creating a condensed version. The full Phase 2 plan includes 15+ tasks covering:

- User detail page with activity tabs
- Role assignment dialog
- Suspension dialog
- Delete user dialog
- Suspended user page
- API routes for user management

---

## Task 2: Role Assignment Dialog Component

**Files:**
- Create: `components/admin/role-assignment-dialog.tsx`

**Step 1: Create role assignment component**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RoleAssignmentDialogProps {
  userId: string
  currentRole: 'user' | 'moderator' | 'admin' | null
  userName: string
  onSuccess: () => void
}

const ROLE_DESCRIPTIONS = {
  user: {
    label: 'Usuario',
    description: 'Sin permisos administrativos',
    permissions: ['Ver contenido', 'Crear negocios', 'Publicar en comunidad'],
  },
  moderator: {
    label: 'Moderador',
    description: 'Puede aprobar negocios y moderar contenido',
    permissions: [
      'Aprobar/rechazar negocios',
      'Editar negocios',
      'Moderar posts de comunidad',
      'Ver estadísticas',
      'Ver usuarios (solo lectura)',
    ],
  },
  admin: {
    label: 'Administrador',
    description: 'Control total de la comunidad',
    permissions: [
      'Todos los permisos de moderador',
      'Gestionar categorías',
      'Asignar roles',
      'Suspender usuarios',
      'Eliminar usuarios',
      'Exportar datos',
    ],
  },
}

export function RoleAssignmentDialog({
  userId,
  currentRole,
  userName,
  onSuccess,
}: RoleAssignmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [newRole, setNewRole] = useState<'user' | 'moderator' | 'admin'>(currentRole || 'user')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleAssignRole() {
    if (newRole === currentRole) {
      toast.info('El rol no ha cambiado')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast.success(`Rol actualizado a ${ROLE_DESCRIPTIONS[newRole].label}`)
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Error al actualizar rol')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="brutalist-button">
          <Shield className="h-4 w-4 mr-2" /> Cambiar Rol
        </Button>
      </DialogTrigger>

      <DialogContent className="brutalist-card max-w-2xl">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="font-heading font-black uppercase italic tracking-tighter text-xl">
            Asignar Rol: {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Current Role */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Rol Actual
            </Label>
            <div className="mt-2">
              <Badge variant="outline" className="font-black uppercase">
                {currentRole ? ROLE_DESCRIPTIONS[currentRole].label : 'Usuario'}
              </Badge>
            </div>
          </div>

          {/* New Role Selection */}
          <div>
            <Label className="text-xs font-black uppercase tracking-widest text-black/60">
              Nuevo Rol *
            </Label>
            <Select value={newRole} onValueChange={(value: any) => setNewRole(value)}>
              <SelectTrigger className="brutalist-input mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="py-2">
                    <p className="font-bold">{ROLE_DESCRIPTIONS.user.label}</p>
                    <p className="text-xs text-black/60">{ROLE_DESCRIPTIONS.user.description}</p>
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="py-2">
                    <p className="font-bold">{ROLE_DESCRIPTIONS.moderator.label}</p>
                    <p className="text-xs text-black/60">{ROLE_DESCRIPTIONS.moderator.description}</p>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="py-2">
                    <p className="font-bold">{ROLE_DESCRIPTIONS.admin.label}</p>
                    <p className="text-xs text-black/60">{ROLE_DESCRIPTIONS.admin.description}</p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Preview */}
          <div className="border-2 border-black p-4 bg-accent/5">
            <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-3">
              Permisos de {ROLE_DESCRIPTIONS[newRole].label}
            </p>
            <ul className="space-y-1">
              {ROLE_DESCRIPTIONS[newRole].permissions.map((perm, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Warning */}
          {newRole !== currentRole && (
            <Alert className="border-2 border-black bg-secondary/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Importante:</strong> Este cambio de rol será inmediato y afectará los permisos del usuario.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleAssignRole}
              disabled={loading || newRole === currentRole}
              className="brutalist-button flex-1 bg-primary text-white h-12"
            >
              {loading ? 'Actualizando...' : 'Asignar Rol'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="brutalist-button flex-1 h-12"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/role-assignment-dialog.tsx
git commit -m "feat(admin): create role assignment dialog

- Add role selection dropdown with descriptions
- Show permission preview for selected role
- Display warning when changing roles
- Immediate effect on role assignment
- Neo-brutalist design

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Suspension Dialog Component

**Files:**
- Create: `components/admin/suspend-user-dialog.tsx`

**Step 1: Create suspension component**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SuspendUserDialogProps {
  userId: string
  userName: string
  isSuspended: boolean | null
  onSuccess: () => void
}

export function SuspendUserDialog({
  userId,
  userName,
  isSuspended,
  onSuccess,
}: SuspendUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleToggleSuspension() {
    if (!isSuspended && !reason.trim()) {
      toast.error('Debes proporcionar una razón para la suspensión')
      return
    }

    setLoading(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      const update = isSuspended
        ? {
            is_suspended: false,
            suspended_at: null,
            suspended_by: null,
            suspension_reason: null,
          }
        : {
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspended_by: currentUser!.id,
            suspension_reason: reason.trim(),
          }

      const { error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', userId)

      if (error) throw error

      toast.success(isSuspended ? 'Usuario reactivado' : 'Usuario suspendido')
      setOpen(false)
      setReason('')
      onSuccess()
    } catch (error) {
      console.error('Error toggling suspension:', error)
      toast.error('Error al actualizar estado de suspensión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isSuspended ? 'outline' : 'destructive'}
          className="brutalist-button"
        >
          {isSuspended ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Reactivar Usuario
            </>
          ) : (
            <>
              <Ban className="h-4 w-4 mr-2" /> Suspender Usuario
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="brutalist-card max-w-md">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="font-heading font-black uppercase italic tracking-tighter text-xl">
            {isSuspended ? 'Reactivar' : 'Suspender'}: {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!isSuspended ? (
            <>
              {/* Suspension Reason */}
              <div>
                <Label className="text-xs font-black uppercase tracking-widest text-black/60">
                  Razón de Suspensión *
                </Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explica por qué se suspende esta cuenta..."
                  className="brutalist-input mt-2"
                  rows={4}
                />
              </div>

              {/* Warning */}
              <Alert className="border-2 border-black bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm">
                  <strong>Atención:</strong> El usuario no podrá iniciar sesión mientras esté suspendido. Verá la razón de suspensión al intentar acceder.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              {/* Reactivation Confirmation */}
              <Alert className="border-2 border-black bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm">
                  <strong>Reactivar cuenta:</strong> El usuario podrá volver a iniciar sesión y usar la plataforma normalmente.
                </AlertDescription>
              </Alert>

              <p className="text-sm text-black/60">
                ¿Estás seguro que quieres reactivar esta cuenta?
              </p>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleToggleSuspension}
              disabled={loading || (!isSuspended && !reason.trim())}
              className={`brutalist-button flex-1 h-12 ${
                isSuspended
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {loading
                ? isSuspended
                  ? 'Reactivando...'
                  : 'Suspendiendo...'
                : isSuspended
                  ? 'Confirmar Reactivación'
                  : 'Confirmar Suspensión'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setReason('')
              }}
              className="brutalist-button flex-1 h-12"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/suspend-user-dialog.tsx
git commit -m "feat(admin): create user suspension dialog

- Add suspension reason textarea
- Support reactivation (toggle)
- Show warning about login prevention
- Track suspended_by and suspended_at
- Clear suspension data on reactivation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

---

## Task 4: Delete User Dialog Component

**Files:**
- Create: `components/admin/delete-user-dialog.tsx`

**Step 1: Create delete user component**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

interface DeleteUserDialogProps {
  userId: string
  userName: string
  businessCount: number
  postCount: number
}

export function DeleteUserDialog({
  userId,
  userName,
  businessCount,
  postCount,
}: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setLoading(true)
    try {
      // Delete user's businesses first (cascade)
      const { error: businessError } = await supabase
        .from('businesses')
        .delete()
        .eq('owner_id', userId)

      if (businessError) throw businessError

      // Delete user's posts
      const { error: postsError } = await supabase
        .from('community_posts')
        .delete()
        .eq('author_id', userId)

      if (postsError) throw postsError

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      toast.success('Usuario eliminado exitosamente')
      router.push('/admin/users')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Error al eliminar usuario')
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="brutalist-button">
          <Trash2 className="h-4 w-4 mr-2" /> Eliminar Usuario
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="brutalist-card max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading font-black uppercase italic tracking-tighter text-xl">
            ¿Eliminar Usuario Permanentemente?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Estás a punto de eliminar a <strong>{userName}</strong> de la plataforma.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Impact Warning */}
          <Alert className="border-2 border-black bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <p className="font-bold text-red-600 mb-2">Esta acción no se puede deshacer</p>
              <p className="text-sm">Se eliminarán permanentemente:</p>
              <ul className="text-sm mt-2 space-y-1 ml-4">
                <li>• {businessCount} negocio{businessCount !== 1 ? 's' : ''}</li>
                <li>• {postCount} publicación{postCount !== 1 ? 'es' : ''}</li>
                <li>• Todos los datos del perfil</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="brutalist-button">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="brutalist-button bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? 'Eliminando...' : 'Eliminar Permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/delete-user-dialog.tsx
git commit -m "feat(admin): create delete user dialog

- Show impact warning (businesses, posts to delete)
- Cascade delete businesses and posts
- Delete user profile
- Permanent deletion with confirmation
- Navigate back to users list

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: User Detail Page

**Files:**
- Create: `app/admin/users/[id]/page.tsx`

**Step 1: Create user detail page structure**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
  const [user, setUser] = useState<UserProfile | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
```

**Step 2: Commit**

```bash
git add app/admin/users/[id]/page.tsx
git commit -m "feat(admin): create user detail page

- Display user profile with avatar and role badges
- Show suspension reason if suspended
- Activity tabs (businesses, posts, info)
- Integrate role assignment, suspension, and delete dialogs
- Show business and post counts
- Format dates with Spanish locale

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Suspended User Page

**Files:**
- Create: `app/suspended/page.tsx`

**Step 1: Create suspended page**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SuspendedPage() {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkSuspensionStatus()
  }, [])

  async function checkSuspensionStatus() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended, suspension_reason')
      .eq('id', user.id)
      .single()

    if (!profile?.is_suspended) {
      // User is not suspended, redirect to home
      router.push('/')
      return
    }

    setReason(profile.suspension_reason || '')
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="brutalist-card max-w-md bg-red-50 border-red-600 border-4">
        <CardHeader className="border-b-4 border-black bg-red-600 text-white">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8" />
            <CardTitle className="font-heading font-black uppercase italic text-2xl tracking-tighter">
              Cuenta Suspendida
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <p className="text-black/80">
            Tu cuenta ha sido suspendida temporalmente por un administrador.
          </p>

          {reason && (
            <div className="border-l-4 border-red-600 pl-4 py-2 bg-white">
              <p className="text-xs font-black uppercase tracking-widest text-black/50 mb-1">
                Razón de Suspensión:
              </p>
              <p className="text-sm">{reason}</p>
            </div>
          )}

          <div className="border-2 border-black bg-white p-4">
            <p className="text-sm text-black/60">
              <strong>¿Qué significa esto?</strong>
            </p>
            <ul className="text-sm text-black/60 mt-2 space-y-1 ml-4">
              <li>• No puedes acceder a la plataforma</li>
              <li>• Tus negocios y publicaciones siguen visibles</li>
              <li>• Puedes contactar al administrador para apelar</li>
            </ul>
          </div>

          <p className="text-sm text-black/60">
            Si crees que esto es un error, contacta al equipo de BarrioRed para resolver la
            situación.
          </p>

          <Button onClick={handleLogout} className="brutalist-button w-full h-12 bg-black text-white">
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/suspended/page.tsx
git commit -m "feat(auth): create suspended user page

- Check suspension status on load
- Display suspension reason
- Redirect to home if not suspended
- Show logout button
- Explain suspension implications
- Neo-brutalist design with red theme

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Admin Layout - Add Users Nav Link

**Files:**
- Modify: `app/admin/layout.tsx:24-50`

**Step 1: Add Users navigation link**

After the Categories link (around line 32), add:
```typescript
<Link href="/admin/users">
  <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] hover:bg-accent/10 transition-colors">
    <Users className="h-4 w-4 mr-1" /> Usuarios
  </Button>
</Link>
```

**Step 2: Import Users icon**

Update imports:
```typescript
import { ArrowLeft, Store, Tag, Users, AlertTriangle, Siren } from 'lucide-react'
```

**Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): add users link to admin navigation

- Add Usuarios nav button
- Import Users icon
- Consistent with other nav items

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2 Complete! ✅

**What we built:**
- ✅ Users list page with filters and search
- ✅ Role assignment dialog (user/moderator/admin)
- ✅ User suspension dialog with reasons
- ✅ Delete user dialog with cascade warnings
- ✅ User detail page with activity tabs
- ✅ Suspended user page
- ✅ Updated admin navigation

**Next Steps:**
- See `2026-02-27-phase-3-analytics-reporting.md` for Statistics Dashboard
- See `2026-02-27-phase-4-ux-enhancements.md` for Category Reordering

---

## Execution

Ready to implement! Use with `@superpowers:executing-plans` or `@superpowers:subagent-driven-development`.