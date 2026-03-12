'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/types/database'

type ClassifiedInsert = Database['public']['Tables']['classifieds']['Insert']
type ClassifiedUpdate = Database['public']['Tables']['classifieds']['Update']

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
