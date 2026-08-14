-- Allow anonymous (unauthenticated) visitors to subscribe to push notifications,
-- scoped by the community they subscribed from instead of a profile.
--
-- Note: this project's remote schema already had user_id made nullable, a
-- community_id column (NOT NULL, FK -> communities), and the endpoint unique
-- constraint swapped from (user_id, endpoint) to (endpoint) via an earlier
-- untracked migration. This file only adds what was still missing: the RLS
-- policy that lets the anon role actually write those rows.

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_community_id ON push_subscriptions(community_id);

-- Anonymous visitors can create/update/delete their own (ownerless) subscription row.
-- There's no stable anon identity to scope to beyond "it has no user_id".
CREATE POLICY "Anonymous users can manage anonymous push subscriptions"
ON push_subscriptions
FOR ALL
TO anon
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);
