# Phase 2: Monitoring Infrastructure - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add audit logs and error logs to track admin actions and capture runtime errors for debugging and compliance.

**Architecture:** Create two database tables (audit_logs, error_logs) with RLS policies, build API endpoints for logging and retrieval, create admin UI with brutalist design for viewing logs, and integrate audit logging into existing admin endpoints.

**Tech Stack:** PostgreSQL, Supabase RLS, Next.js App Router, React Server Components, TypeScript

**Design Doc:** See `docs/plans/2026-03-03-cross-cutting-admin-features-design.md`

**Prerequisites:** Phase 1 must be deployed and stable in production (3-5 days monitoring)

---

## Pre-Implementation Checklist

- [ ] Phase 1 deployed and stable for at least 3 days
- [ ] No RLS policy errors in production logs
- [ ] Review design doc section on audit/error logs
- [ ] Understand brutalist design system in CLAUDE.md

---

## Task 1: Create Audit Logs Migration

**Files:**
- Create: `supabase/migrations/20260303000002_add_logging_tables.sql`

**Step 1: Create migration file with audit_logs table**

```sql
-- Migration: Add Audit Logs and Error Logs Tables
-- Date: 2026-03-03
-- Description: Track admin actions and capture runtime errors for debugging

-- ============================================================================
-- AUDIT_LOGS: Track admin actions for compliance
-- ============================================================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),  -- NULL for platform-wide actions
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,  -- 'approve_business', 'reject_post', 'delete_user', etc.
  entity_type text,      -- 'business', 'post', 'user', 'community', 'alert', 'service'
  entity_id uuid,        -- ID of affected entity
  old_data jsonb,        -- Snapshot before change (for updates/deletes)
  new_data jsonb,        -- Snapshot after change (for creates/updates)
  metadata jsonb DEFAULT '{}',  -- IP address, user agent, request ID, etc.
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_audit_logs_community_created
  ON audit_logs(community_id, created_at DESC);

CREATE INDEX idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX idx_audit_logs_action
  ON audit_logs(action, created_at DESC);

-- Add comments
COMMENT ON TABLE audit_logs IS
  'Audit trail of all admin actions for compliance and debugging';

COMMENT ON COLUMN audit_logs.community_id IS
  'NULL for platform-wide actions (e.g., create_community by super admin)';

COMMENT ON COLUMN audit_logs.metadata IS
  'Additional context: IP address, user agent, request ID, etc.';
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260303000002_add_logging_tables.sql
git commit -m "feat(db): create audit_logs table with indexes

Track admin actions for compliance and debugging.
Supports community-scoped and platform-wide actions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Audit Logs RLS Policies

**Files:**
- Modify: `supabase/migrations/20260303000002_add_logging_tables.sql`

**Step 1: Enable RLS and create policies**

Add to migration file:

```sql

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin sees all logs
CREATE POLICY "audit_logs_select_super_admin"
ON audit_logs FOR SELECT
USING (is_super_admin());

-- Community admin sees logs for their community
CREATE POLICY "audit_logs_select_community_admin"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND community_id = audit_logs.community_id
  )
);

-- Moderators see logs for content they can moderate
CREATE POLICY "audit_logs_select_moderator"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'moderator'
      AND community_id = audit_logs.community_id
  )
  AND entity_type IN ('post', 'alert', 'report')
);

-- No public INSERT (only backend via service role)
-- No INSERT policy means only service role can insert
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260303000002_add_logging_tables.sql
git commit -m "feat(db): add RLS policies for audit_logs

- Super admin sees all logs
- Community admin sees logs for their community
- Moderators see logs for content they moderate
- Only service role can insert logs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Error Logs Table

**Files:**
- Modify: `supabase/migrations/20260303000002_add_logging_tables.sql`

**Step 1: Add error_logs table**

Add to migration file:

```sql

-- ============================================================================
-- ERROR_LOGS: Capture runtime errors for debugging
-- ============================================================================

CREATE TABLE error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),  -- NULL for platform-wide errors
  user_id uuid REFERENCES auth.users(id),        -- NULL for unauthenticated errors
  error_type text NOT NULL,     -- 'api_error', 'validation_error', 'db_error', 'client_error'
  error_message text,
  stack_trace text,
  request_url text,
  request_method text,
  request_body jsonb,
  status_code integer,
  metadata jsonb DEFAULT '{}',  -- Browser info, device type, etc.
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_error_logs_created
  ON error_logs(created_at DESC);

CREATE INDEX idx_error_logs_type_created
  ON error_logs(error_type, created_at DESC);

CREATE INDEX idx_error_logs_user
  ON error_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE error_logs IS
  'Runtime error logs for debugging production issues';

COMMENT ON COLUMN error_logs.error_type IS
  'api_error, validation_error, db_error, client_error';

COMMENT ON COLUMN error_logs.metadata IS
  'Browser info, device type, viewport size, etc.';
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260303000002_add_logging_tables.sql
git commit -m "feat(db): create error_logs table with indexes

Capture runtime errors from both server and client side.
Indexed for fast retrieval by type, date, and user.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Error Logs RLS Policies

**Files:**
- Modify: `supabase/migrations/20260303000002_add_logging_tables.sql`

**Step 1: Enable RLS and create policies**

Add to migration file:

```sql

-- Enable RLS on error_logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Only super admin can view error logs (contains sensitive data)
CREATE POLICY "error_logs_select_super_admin"
ON error_logs FOR SELECT
USING (is_super_admin());

-- Public can insert (for client-side error reporting)
CREATE POLICY "error_logs_insert_public"
ON error_logs FOR INSERT
WITH CHECK (true);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260303000002_add_logging_tables.sql
git commit -m "feat(db): add RLS policies for error_logs

- Only super admin can view (contains sensitive data)
- Public can insert for client-side error reporting

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Apply Migration Locally

**Files:**
- None (database operation)

**Step 1: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 2: Verify tables created**

Run in Supabase Studio SQL Editor:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('audit_logs', 'error_logs');
```
Expected: 2 rows, both with `rowsecurity = true`

**Step 3: Verify indexes created**

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('audit_logs', 'error_logs')
ORDER BY tablename, indexname;
```
Expected: 7 indexes total (4 for audit_logs, 3 for error_logs)

**Step 4: Commit checkpoint**

```bash
git add .
git commit -m "test(db): verify logging tables migration

Tables and indexes created successfully with RLS enabled.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Audit Logger Utility

**Files:**
- Create: `lib/utils/audit-logger.ts`

**Step 1: Create utility file with types**

```typescript
import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'approve_business'
  | 'reject_business'
  | 'delete_business'
  | 'approve_post'
  | 'reject_post'
  | 'delete_post'
  | 'pin_post'
  | 'unpin_post'
  | 'create_alert'
  | 'update_alert'
  | 'delete_alert'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'delete_user'
  | 'assign_role'
  | 'create_community'
  | 'update_community'
  | 'archive_community'

export type EntityType =
  | 'business'
  | 'post'
  | 'alert'
  | 'user'
  | 'community'
  | 'service'
  | 'report'

interface LogAuditParams {
  action: AuditAction
  entityType: EntityType
  entityId: string
  oldData?: any
  newData?: any
  communityId?: string
}

export async function logAuditAction(params: LogAuditParams) {
  const { action, entityType, entityId, oldData, newData, communityId } = params

  try {
    const response = await fetch('/api/admin/logs/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
        community_id: communityId,
      }),
    })

    if (!response.ok) {
      console.error('Failed to log audit action:', await response.text())
    }
  } catch (error) {
    console.error('Error logging audit action:', error)
    // Don't throw - audit logging should not break the main operation
  }
}
```

**Step 2: Commit**

```bash
git add lib/utils/audit-logger.ts
git commit -m "feat(utils): create audit logger utility

Helper function to log admin actions to audit_logs table.
Fails gracefully without breaking main operations.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create Audit Logs API - GET Endpoint

**Files:**
- Create: `app/api/admin/logs/audit/route.ts`

**Step 1: Create GET endpoint**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const communityId = searchParams.get('community_id')
  const entityType = searchParams.get('entity_type')
  const action = searchParams.get('action')
  const userId = searchParams.get('user_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build query (RLS handles community filtering automatically)
  let query = supabase
    .from('audit_logs')
    .select(
      `
      *,
      user:profiles!user_id(
        id,
        full_name,
        avatar_url,
        role
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (communityId) query = query.eq('community_id', communityId)
  if (entityType) query = query.eq('entity_type', entityType)
  if (action) query = query.eq('action', action)
  if (userId) query = query.eq('user_id', userId)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    logs: data,
    total: count,
    limit,
    offset,
  })
}
```

**Step 2: Commit**

```bash
git add app/api/admin/logs/audit/route.ts
git commit -m "feat(api): create audit logs GET endpoint

Fetch audit logs with filtering and pagination.
RLS automatically enforces community-level access control.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create Audit Logs API - POST Endpoint

**Files:**
- Modify: `app/api/admin/logs/audit/route.ts`

**Step 1: Add POST endpoint to same file**

Add after GET endpoint:

```typescript

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, entity_type, entity_id, old_data, new_data, community_id } =
    body

  // Validate required fields
  if (!action || !entity_type || !entity_id) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Get request metadata
  const metadata = {
    ip:
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
  }

  // Use service role client to bypass RLS for INSERT
  const supabaseAdmin = createClient()

  const { error } = await supabaseAdmin.from('audit_logs').insert({
    community_id,
    user_id: user.id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata,
  })

  if (error) {
    console.error('Failed to insert audit log:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 2: Commit**

```bash
git add app/api/admin/logs/audit/route.ts
git commit -m "feat(api): create audit logs POST endpoint

Internal endpoint for logging admin actions.
Uses service role to bypass RLS for inserts.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Error Logs API Endpoints

**Files:**
- Create: `app/api/admin/logs/error/route.ts`

**Step 1: Create GET endpoint (super admin only)**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden - Super admin only' }, { status: 403 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const errorType = searchParams.get('error_type')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('error_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (errorType) query = query.eq('error_type', errorType)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    errors: data,
    total: count,
    limit,
    offset,
  })
}
```

**Step 2: Add POST endpoint for client error reporting**

Add after GET endpoint:

```typescript

export async function POST(request: Request) {
  const supabase = await createClient()

  // Get current user (may be null for unauthenticated errors)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const body = await request.json()
  const {
    error_type,
    error_message,
    stack_trace,
    request_url,
    request_method,
    status_code,
  } = body

  // Get client metadata
  const metadata = {
    user_agent: request.headers.get('user-agent'),
    referrer: request.headers.get('referer'),
    browser: body.browser,
    device: body.device,
  }

  // Get user's community_id if authenticated
  let communityId = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('community_id')
      .eq('id', user.id)
      .single()

    communityId = profile?.community_id || null
  }

  // TODO: Implement rate limiting (Redis or similar)
  // For now, just log it

  const { error } = await supabase.from('error_logs').insert({
    community_id: communityId,
    user_id: user?.id || null,
    error_type,
    error_message,
    stack_trace,
    request_url,
    request_method,
    status_code,
    metadata,
  })

  if (error) {
    console.error('Failed to log error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 3: Commit**

```bash
git add app/api/admin/logs/error/route.ts
git commit -m "feat(api): create error logs endpoints

- GET: Super admin can view all error logs with filtering
- POST: Public endpoint for client-side error reporting

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Create Admin Logs Page - Layout

**Files:**
- Create: `app/admin/logs/page.tsx`

**Step 1: Create page with tabs layout**

```typescript
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
    .single()

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
```

**Step 2: Commit**

```bash
git add app/admin/logs/page.tsx
git commit -m "feat(admin): create logs page layout with tabs

Brutalist design with tabs for Audit Logs and Error Logs.
Error Logs tab only visible to super admins.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Create Audit Logs Table Component

**Files:**
- Create: `components/admin/audit-logs-table.tsx`

**Step 1: Create client component with filters**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string
  created_at: string
  user: {
    full_name: string
    avatar_url: string | null
    role: string
  }
  metadata: any
}

interface Props {
  isSuperAdmin: boolean
}

export function AuditLogsTable({ isSuperAdmin }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 50

  useEffect(() => {
    fetchLogs()
  }, [offset])

  async function fetchLogs() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/logs/audit?limit=${limit}&offset=${offset}`
      )
      const data = await response.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function getActionBadge(action: string) {
    if (action.includes('approve')) return 'bg-green-500'
    if (action.includes('reject')) return 'bg-red-500'
    if (action.includes('delete')) return 'bg-red-700'
    if (action.includes('create')) return 'bg-blue-500'
    if (action.includes('update')) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  if (loading) {
    return <div className="p-8 text-center">Cargando logs...</div>
  }

  return (
    <div className="brutalist-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Fecha
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Usuario
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Acción
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Entidad
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                IP
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-b border-black">
                <TableCell className="font-mono text-sm">
                  {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', {
                    locale: es,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {log.user.avatar_url && (
                      <img
                        src={log.user.avatar_url}
                        alt={log.user.full_name}
                        className="w-8 h-8 rounded-full border-2 border-black"
                      />
                    )}
                    <div>
                      <div className="font-bold">{log.user.full_name}</div>
                      <Badge
                        variant="outline"
                        className="text-xs uppercase tracking-widest"
                      >
                        {log.user.role}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getActionBadge(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {log.entity_type}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.metadata?.ip || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t-2 border-black">
        <div className="text-sm text-muted-foreground">
          Mostrando {offset + 1} - {Math.min(offset + limit, total)} de {total}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="brutalist-button"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="brutalist-button"
            size="sm"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/audit-logs-table.tsx
git commit -m "feat(admin): create audit logs table component

Brutalist table with pagination and color-coded action badges.
Fetches logs from API with filtering support.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Create Error Logs Table Component

**Files:**
- Create: `components/admin/error-logs-table.tsx`

**Step 1: Create client component (similar to audit logs)**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'

interface ErrorLog {
  id: string
  error_type: string
  error_message: string
  stack_trace: string | null
  request_url: string | null
  status_code: number | null
  created_at: string
  user_id: string | null
  metadata: any
}

export function ErrorLogsTable() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const limit = 50

  useEffect(() => {
    fetchLogs()
  }, [offset])

  async function fetchLogs() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/logs/error?limit=${limit}&offset=${offset}`
      )
      const data = await response.json()
      setLogs(data.errors || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function getErrorBadgeColor(type: string) {
    switch (type) {
      case 'api_error':
        return 'bg-red-500'
      case 'validation_error':
        return 'bg-yellow-500'
      case 'db_error':
        return 'bg-purple-500'
      case 'client_error':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Cargando error logs...</div>
  }

  return (
    <div className="brutalist-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              <TableHead className="w-10"></TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Fecha
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Tipo
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Mensaje
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                URL
              </TableHead>
              <TableHead className="uppercase tracking-widest font-black text-xs">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <>
                <TableRow
                  key={log.id}
                  className="border-b border-black cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpandedRow(expandedRow === log.id ? null : log.id)
                  }
                >
                  <TableCell>
                    {expandedRow === log.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge className={getErrorBadgeColor(log.error_type)}>
                      {log.error_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {log.error_message}
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-xs">
                    {log.request_url || '-'}
                  </TableCell>
                  <TableCell>
                    {log.status_code && (
                      <Badge variant="outline">{log.status_code}</Badge>
                    )}
                  </TableCell>
                </TableRow>

                {expandedRow === log.id && (
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={6} className="p-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-bold uppercase tracking-widest text-xs mb-2">
                            Stack Trace
                          </h4>
                          <pre className="brutalist-card p-4 text-xs overflow-x-auto bg-black text-green-400 font-mono">
                            {log.stack_trace || 'No stack trace available'}
                          </pre>
                        </div>

                        {log.metadata && (
                          <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs mb-2">
                              Metadata
                            </h4>
                            <pre className="brutalist-card p-4 text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t-2 border-black">
        <div className="text-sm text-muted-foreground">
          Mostrando {offset + 1} - {Math.min(offset + limit, total)} de {total}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="brutalist-button"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="brutalist-button"
            size="sm"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/error-logs-table.tsx
git commit -m "feat(admin): create error logs table component

Brutalist expandable table with stack traces.
Color-coded by error type, paginated.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Add Sidebar Navigation Link

**Files:**
- Modify: `components/admin/collapsible-sidebar.tsx`

**Step 1: Add logs navigation item**

Find the `navItems` array and add after engagement:

```typescript
  { href: '/admin/engagement', label: 'Engagement', icon: Activity },
  { href: '/admin/logs', label: 'Logs', icon: FileText, roles: ['admin', 'moderator', 'super_admin'] },
```

Import FileText icon at top:

```typescript
import {
  BarChart3,
  Building2,
  Users,
  FolderTree,
  Bell,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Flag,
  Briefcase,
  Activity,
  FileText,  // Add this
} from 'lucide-react'
```

**Step 2: Commit**

```bash
git add components/admin/collapsible-sidebar.tsx
git commit -m "feat(admin): add Logs link to sidebar navigation

All admin roles (admin, moderator, super_admin) can access logs.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Integrate Audit Logging - Businesses Endpoint

**Files:**
- Modify: `app/api/admin/businesses/[id]/route.ts`

**Step 1: Import audit logger**

Add at top of file:

```typescript
import { logAuditAction } from '@/lib/utils/audit-logger'
```

**Step 2: Add logging to PATCH endpoint (approve/reject)**

Find the PATCH endpoint and add logging after successful update:

```typescript
// After successful business update
const { data: business, error } = await supabase
  .from('businesses')
  .update(updateData)
  .eq('id', params.id)
  .select()
  .single()

if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Log audit action
if (updateData.status === 'approved') {
  await logAuditAction({
    action: 'approve_business',
    entityType: 'business',
    entityId: params.id,
    oldData: { status: oldStatus },
    newData: { status: 'approved' },
    communityId: business.community_id,
  })
} else if (updateData.status === 'rejected') {
  await logAuditAction({
    action: 'reject_business',
    entityType: 'business',
    entityId: params.id,
    oldData: { status: oldStatus },
    newData: { status: 'rejected', reason: updateData.rejection_reason },
    communityId: business.community_id,
  })
}

return NextResponse.json({ business })
```

**Step 3: Add logging to DELETE endpoint**

Find DELETE endpoint and add:

```typescript
// Before deletion, get business data for audit log
const { data: business } = await supabase
  .from('businesses')
  .select('*')
  .eq('id', params.id)
  .single()

const { error } = await supabase
  .from('businesses')
  .delete()
  .eq('id', params.id)

if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Log audit action
await logAuditAction({
  action: 'delete_business',
  entityType: 'business',
  entityId: params.id,
  oldData: business,
  communityId: business?.community_id,
})

return NextResponse.json({ success: true })
```

**Step 4: Commit**

```bash
git add app/api/admin/businesses/[id]/route.ts
git commit -m "feat(api): add audit logging to businesses endpoint

Log approve_business, reject_business, and delete_business actions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Integrate Audit Logging - Community Posts Endpoint

**Files:**
- Modify: `app/api/admin/community/[id]/route.ts`

**Step 1: Import audit logger**

```typescript
import { logAuditAction } from '@/lib/utils/audit-logger'
```

**Step 2: Add logging to PATCH endpoint**

Add after successful post update:

```typescript
const { data: post, error } = await supabase
  .from('community_posts')
  .update(updateData)
  .eq('id', params.id)
  .select()
  .single()

if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Log audit action
if (updateData.status === 'approved') {
  await logAuditAction({
    action: 'approve_post',
    entityType: 'post',
    entityId: params.id,
    newData: { status: 'approved' },
    communityId: post.community_id,
  })
} else if (updateData.status === 'rejected') {
  await logAuditAction({
    action: 'reject_post',
    entityType: 'post',
    entityId: params.id,
    newData: { status: 'rejected' },
    communityId: post.community_id,
  })
} else if ('is_pinned' in updateData) {
  await logAuditAction({
    action: updateData.is_pinned ? 'pin_post' : 'unpin_post',
    entityType: 'post',
    entityId: params.id,
    newData: { is_pinned: updateData.is_pinned },
    communityId: post.community_id,
  })
}

return NextResponse.json({ post })
```

**Step 3: Add logging to DELETE endpoint**

```typescript
// Get post before deletion
const { data: post } = await supabase
  .from('community_posts')
  .select('*')
  .eq('id', params.id)
  .single()

const { error } = await supabase
  .from('community_posts')
  .delete()
  .eq('id', params.id)

if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Log audit action
await logAuditAction({
  action: 'delete_post',
  entityType: 'post',
  entityId: params.id,
  oldData: post,
  communityId: post?.community_id,
})

return NextResponse.json({ success: true })
```

**Step 4: Commit**

```bash
git add app/api/admin/community/[id]/route.ts
git commit -m "feat(api): add audit logging to community posts endpoint

Log approve/reject/pin/unpin/delete post actions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Update TypeScript Types

**Files:**
- Modify: `lib/types/database.ts`

**Step 1: Add AuditLog and ErrorLog interfaces**

Add at the end of file:

```typescript

export interface AuditLog {
  id: string
  community_id: string | null
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_data: any
  new_data: any
  metadata: any
  created_at: string
}

export interface ErrorLog {
  id: string
  community_id: string | null
  user_id: string | null
  error_type: string
  error_message: string | null
  stack_trace: string | null
  request_url: string | null
  request_method: string | null
  request_body: any
  status_code: number | null
  metadata: any
  created_at: string
}
```

**Step 2: Commit**

```bash
git add lib/types/database.ts
git commit -m "feat(types): add AuditLog and ErrorLog types

TypeScript interfaces for logging tables.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Manual Testing

**Files:**
- None (manual testing)

**Step 1: Test audit log creation**

1. Login as admin
2. Approve a business
3. Navigate to `/admin/logs`
4. Verify "approve_business" action appears in audit logs

**Step 2: Test audit log filtering**

1. Check that you only see logs for your community (not other communities)
2. Login as super admin
3. Verify you see logs from all communities

**Step 3: Test error log POST endpoint**

Run in browser console:
```javascript
fetch('/api/admin/logs/error', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    error_type: 'client_error',
    error_message: 'Test error from console',
    stack_trace: new Error().stack,
    request_url: window.location.href,
    browser: navigator.userAgent,
  }),
})
```

Verify error appears in super admin error logs tab.

**Step 4: Document test results**

```bash
echo "Phase 2 Testing Results ($(date)):

✅ Audit logs created successfully when admin approves business
✅ Community admin sees only their community logs
✅ Super admin sees all logs across communities
✅ Error log POST endpoint works from client
✅ Error logs visible in super admin panel
✅ Pagination works correctly

" > docs/test-results-phase2.txt
```

---

## Post-Implementation Checklist

- [ ] All migration steps completed
- [ ] audit_logs and error_logs tables created with RLS
- [ ] API endpoints created and tested (GET/POST)
- [ ] Admin UI created with brutalist design
- [ ] Sidebar navigation link added
- [ ] Audit logging integrated into businesses and community posts endpoints
- [ ] Manual testing completed
- [ ] TypeScript types updated
- [ ] Ready for production deployment

---

## Next Steps

**After deploying Phase 2:**

1. Monitor audit logs for 1 week to ensure they're being created properly
2. Check for any performance impact (audit logging is async, should be minimal)
3. Integrate audit logging into remaining endpoints:
   - Users management (`/api/admin/users/[id]`)
   - Alerts (`/api/admin/alerts/[id]`)
   - Services (`/api/admin/services/[id]`)
4. Proceed to **Phase 3: Super Admin Panel**

**Estimated Timeline:**
- Phase 2: 3-4 days implementation + testing
- Deploy to production: 1 day
- Monitor for 1 week
- Phase 3 start: 2 weeks after Phase 2 stable

---

**End of Phase 2 Implementation Plan**
