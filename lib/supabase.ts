import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton: one GoTrueClient per browser tab to avoid "multiple instances" warnings
// and broken channel cleanup (removeChannel must use the same client that created the channel).
let _clientInstance: SupabaseClient | null = null;

export function createClientSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    // SSR: create a fresh client (never cached)
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  if (!_clientInstance) {
    _clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _clientInstance;
}

export function createServerSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
