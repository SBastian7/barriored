CREATE TABLE public.service_feedback (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('suggestion', 'report')),
  service_id      UUID        REFERENCES public.public_services(id) ON DELETE SET NULL,
  service_name    TEXT,
  category        TEXT,
  phone           TEXT,
  address         TEXT,
  message         TEXT        NOT NULL,
  reporter_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name   TEXT,
  reporter_whatsapp TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_feedback ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated users can submit feedback
CREATE POLICY "service_feedback_insert"
  ON public.service_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can read feedback for their community
CREATE POLICY "service_feedback_select_admin"
  ON public.service_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.is_super_admin = true
        OR (p.role = 'admin' AND p.community_id = service_feedback.community_id)
      )
    )
  );

-- Admins can update status (reviewed/dismissed)
CREATE POLICY "service_feedback_update_admin"
  ON public.service_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.is_super_admin = true
        OR (p.role = 'admin' AND p.community_id = service_feedback.community_id)
      )
    )
  );

-- Only super admins can delete
CREATE POLICY "service_feedback_delete_superadmin"
  ON public.service_feedback FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.is_super_admin = true
    )
  );
