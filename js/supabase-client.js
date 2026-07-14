/* =========================================================
   OGWINI CTHS — Supabase client (shared)
   Public project URL + publishable key are safe to expose
   in the browser; all write access is protected by RLS.
   ========================================================= */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://pdtldeqjbgbqbbddikav.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_ymLa5jpuF-lBZRjjKHav_g_6CET2D5P';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
