-- Function to atomically increment daily analytics using INSERT ON CONFLICT
CREATE OR REPLACE FUNCTION increment_daily_analytics(
  p_business_id UUID,
  p_date DATE,
  p_event_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atomic upsert using ON CONFLICT
  IF p_event_type = 'profile_view' THEN
    INSERT INTO business_analytics_daily (business_id, date, profile_views, whatsapp_clicks)
    VALUES (p_business_id, p_date, 1, 0)
    ON CONFLICT (business_id, date)
    DO UPDATE SET profile_views = business_analytics_daily.profile_views + 1;
  ELSIF p_event_type = 'whatsapp_click' THEN
    INSERT INTO business_analytics_daily (business_id, date, profile_views, whatsapp_clicks)
    VALUES (p_business_id, p_date, 0, 1)
    ON CONFLICT (business_id, date)
    DO UPDATE SET whatsapp_clicks = business_analytics_daily.whatsapp_clicks + 1;
  ELSE
    RAISE EXCEPTION 'Invalid event type: %', p_event_type;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_daily_analytics(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_daily_analytics(UUID, DATE, TEXT) TO anon;

-- Add helpful comment
COMMENT ON FUNCTION increment_daily_analytics IS 'Atomically increments daily analytics using INSERT ON CONFLICT for race-free operation';
