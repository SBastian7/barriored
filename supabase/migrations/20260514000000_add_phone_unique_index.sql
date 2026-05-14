-- Clean up duplicate phone numbers before enforcing uniqueness.
-- Keep the oldest profile with each phone number, null out duplicates.
UPDATE public.profiles
SET phone = NULL
WHERE phone = '573103608244'
  AND id NOT IN ('e9408944-807a-4a6f-a263-6744a808b99c');

UPDATE public.profiles
SET phone = NULL
WHERE phone = '573126523224'
  AND id NOT IN ('195c3b57-52a1-4c3f-aa70-da690721f248');

-- Prevent two accounts from sharing the same WhatsApp number.
-- Partial index: only applies when phone is not null.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
ON public.profiles (phone)
WHERE phone IS NOT NULL;
