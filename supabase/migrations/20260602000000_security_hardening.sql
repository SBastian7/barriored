-- ============================================================================
-- Security hardening (prepared 2026-06-02, pre-launch advisor follow-ups)
--
-- NOTE: The Supabase MCP connection dropped during the audit session, so this
-- was authored as a migration file instead of applied directly. Apply with
-- `supabase db push` or by pasting into the Supabase SQL editor.
--
-- Two independent sections — review before applying.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Lock down direct execution of the analytics RPCs.
-- These run only through the server's service-role admin client (see
-- app/api/analytics/track/route.ts), which bypasses grants. Removing
-- anon/authenticated EXECUTE stops anyone from calling them directly via
-- /rest/v1/rpc/* to inflate an arbitrary business's view/click counts.
-- ----------------------------------------------------------------------------
revoke execute on function public.increment_business_analytics(uuid, text) from anon, authenticated;
revoke execute on function public.increment_daily_analytics(uuid, date, text) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Stop file enumeration (listing) on the public storage buckets.
-- Public buckets still serve objects via their public URL WITHOUT a SELECT
-- policy; these broad SELECT policies only let clients LIST bucket contents.
-- The app stores object URLs in the DB and serves by URL (it never calls
-- storage.from(<bucket>).list()), so removing these is safe.
-- ----------------------------------------------------------------------------
drop policy if exists "Public can view banners"          on storage.objects;
drop policy if exists "business_images_select"           on storage.objects;
drop policy if exists "Public can view community images" on storage.objects;
drop policy if exists "Public can view profile images"   on storage.objects;
