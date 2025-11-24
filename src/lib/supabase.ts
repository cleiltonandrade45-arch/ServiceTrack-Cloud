import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gylrzffjqxrsjlocfgai.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5bHJ6ZmZqcXhyc2psb2NmZ2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjAzMjUsImV4cCI6MjA3OTQ5NjMyNX0.IGEly_iGMkF_XSWqHgdSqQONGnksK9pHrrd7OWBAGTQ";

// 🔥 HABILITAR PERSISTÊNCIA MANUAL DE SESSÃO
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,     // mantém login salvo
    autoRefreshToken: true,   // renova automaticamente
    detectSessionInUrl: true, // login com email magic link funciona
  },
});