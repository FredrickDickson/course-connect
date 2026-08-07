-- Restore the missing public member-verification RLS policy.
--
-- Migration 20260406223537 defined three policies for public.members:
--   1. "Members can view own record" (authenticated, own row)
--   2. "Admins can manage all members" (authenticated admins, all rows)
--   3. "Public can verify members" (anon, SELECT, active/expiring/expired only)
--
-- Live database drift: only policies 1 and 2 were ever actually applied
-- (confirmed via `pg_policies`). Policy 3 was missing entirely, meaning the
-- public /verify/:memberId certificate-verification page — which is
-- explicitly meant to work without login, per its own source comment
-- ("Accessible without login — allows employers, courts, and institutions
-- to verify credentials") — silently returned "Member Not Found" for every
-- real member, 100% of the time. Anonymous SELECT was blocked outright by
-- RLS with no matching permissive policy.
--
-- This re-creates exactly that missing policy: read-only, anon-scoped,
-- and excludes 'pending' members (not yet issued/verifiable).

CREATE POLICY "Public can verify members"
  ON public.members FOR SELECT
  TO anon
  USING (status IN ('active', 'expiring', 'expired'));
