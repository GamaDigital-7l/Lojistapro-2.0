import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.2';

// URL do seu projeto: wcuaurjbmduehdypsqew
const supabaseUrl = 'https://wcuaurjbmduehdypsqew.supabase.co';

// Chave ANON correta do seu projeto Supabase.
// Esta chave é segura para uso público no frontend.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWF1cmpibWR1ZWhkeXBzcWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MjcwMjUsImV4cCI6MjA4MjEwMzAyNX0.SzVoYZPgxd3-2tObEBdmE9amrw75j-uiM4S-TXgXVfI';

export const isStripeKeyError = supabaseAnonKey.startsWith('sb_publishable');

// Inicializa o cliente apenas se a chave for válida do Supabase
export const supabase = !isStripeKeyError && supabaseUrl.includes('supabase.co')
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;