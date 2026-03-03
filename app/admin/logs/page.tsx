import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditLogsTable } from '@/components/admin/audit-logs-table'
import { ErrorLogsTable } from '@/components/admin/error-logs-table'

export default async function AdminLogsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single<{ role: string; is_super_admin: boolean }>()

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    redirect('/admin')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Logs del Sistema
        </h1>
        <p className="text-muted-foreground">
          Registro de acciones administrativas y errores del sistema
        </p>
      </div>

      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList className="brutalist-card inline-flex">
          <TabsTrigger
            value="audit"
            className="uppercase tracking-widest font-bold text-xs"
          >
            Audit Logs
          </TabsTrigger>
          {profile.is_super_admin && (
            <TabsTrigger
              value="errors"
              className="uppercase tracking-widest font-bold text-xs"
            >
              Error Logs
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="audit">
          <AuditLogsTable isSuperAdmin={profile.is_super_admin} />
        </TabsContent>

        {profile.is_super_admin && (
          <TabsContent value="errors">
            <ErrorLogsTable />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
