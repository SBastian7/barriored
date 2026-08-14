-- handle_new_user() previously inserted community_id / phone from signup metadata
-- verbatim. If the referenced community had since been deleted/recreated (FK
-- violation) or the phone was already taken (profiles_phone_unique violation),
-- the INSERT threw, the whole signup transaction rolled back except for
-- auth.users (already committed by GoTrue), and the client saw a generic
-- "Database error saving new user" with no way to recover — the account
-- existed in auth but could never get a profile.
--
-- Now: an empty-string value is treated as absent, a community_id that no
-- longer exists falls back to NULL instead of aborting, and a phone that's
-- already claimed falls back to NULL instead of aborting (it can be added
-- later from the profile page).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_community_id uuid;
BEGIN
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');
  v_community_id := NULLIF(NEW.raw_user_meta_data->>'community_id', '')::uuid;

  IF v_community_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.communities WHERE id = v_community_id) THEN
    v_community_id := NULL;
  END IF;

  IF v_phone IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_phone) THEN
    v_phone := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, community_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', v_phone, v_community_id);

  RETURN NEW;
END;
$function$;
