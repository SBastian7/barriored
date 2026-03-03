# Phase 1 Deployment Checklist

## Pre-Deployment

- [ ] Reviewed migration SQL in `supabase/migrations/20260303000001_fix_multi_tenant_rls.sql`
- [ ] Tested migration on local Supabase instance
- [ ] Created database backup (Supabase Studio → Backups)
- [ ] Verified no active admin users will be locked out
- [ ] Scheduled deployment during low-traffic window

## Deployment Steps

1. [ ] Backup production database
   ```bash
   # Via Supabase Dashboard: Settings → Database → Create Backup
   ```

2. [ ] Apply migration
   ```bash
   supabase db push
   # Or via Supabase Studio: SQL Editor → run migration file
   ```

3. [ ] Verify helper functions created
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname IN ('is_community_staff', 'can_moderate_content', 'is_community_admin_only');
   ```

4. [ ] Verify RLS policies updated
   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE tablename IN ('community_posts', 'community_alerts', 'public_services', 'content_reports')
   ORDER BY tablename;
   ```

5. [ ] Test with production users
   - [ ] Login as super admin → Verify can see all communities
   - [ ] Login as community admin → Verify can only see own community
   - [ ] Login as moderator → Verify can manage posts but not businesses

## Post-Deployment Monitoring

- [ ] Monitor Supabase logs for RLS policy errors (first 1 hour)
- [ ] Check admin panel functionality (approve business, delete post, etc.)
- [ ] Verify no user complaints about locked-out access
- [ ] Monitor database query performance (RLS adds overhead)

## Rollback Plan

If critical issues occur:

1. Restore from backup
2. Or manually revert policies:
   ```bash
   # Restore old policies from backup migration file
   supabase db reset --db-url <backup-connection-string>
   ```

## Success Criteria

- ✅ Zero cross-community data leaks
- ✅ Admin/moderator role differentiation working
- ✅ Super admin has full platform access
- ✅ No performance degradation (queries < 100ms)
