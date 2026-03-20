-- Migration: Add atomic increment function for business analytics
-- Purpose: Fix race conditions in analytics tracking by providing atomic increment operation

-- Function to atomically increment business analytics
CREATE OR REPLACE FUNCTION increment_business_analytics(
  p_business_id UUID,
  p_event_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_column_name TEXT;
BEGIN
  -- Determine which column to increment
  IF p_event_type = 'profile_view' THEN
    v_column_name := 'total_profile_views';
  ELSIF p_event_type = 'whatsapp_click' THEN
    v_column_name := 'total_whatsapp_clicks';
  ELSE
    RAISE EXCEPTION 'Invalid event type: %', p_event_type;
  END IF;

  -- Atomic increment using dynamic SQL
  -- This ensures no race conditions even under high concurrency
  EXECUTE format(
    'UPDATE businesses SET %I = COALESCE(%I, 0) + 1, last_analytics_update = NOW() WHERE id = $1',
    v_column_name, v_column_name
  ) USING p_business_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_business_analytics(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_business_analytics(UUID, TEXT) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION increment_business_analytics IS 'Atomically increments business analytics counters to prevent race conditions. Valid event types: profile_view, whatsapp_click';
