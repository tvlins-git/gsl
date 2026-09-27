import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { resolveSupabaseConfig } from './supabase-config';

const { url: supabaseUrl, key: supabaseAnonKey, configured: supabaseConfigured } =
  resolveSupabaseConfig();

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Native has no localStorage — without AsyncStorage, force-quit drops the JWT.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export function isSupabaseConfigured(): boolean {
  return supabaseConfigured;
}
