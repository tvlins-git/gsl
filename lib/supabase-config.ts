// createClient() throws if url/key are empty. Static web export (Vercel) has no
// committed .env, so missing values must not crash Metro's Node render step.
const PLACEHOLDER_URL = 'https://your-project.supabase.co';
const PLACEHOLDER_KEY = 'your-anon-key';

export function resolveSupabaseConfig(
  url: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
): { url: string; key: string; configured: boolean } {
  const resolvedUrl = url?.trim() ?? '';
  const resolvedKey = key?.trim() ?? '';
  return {
    url: resolvedUrl || PLACEHOLDER_URL,
    key: resolvedKey || PLACEHOLDER_KEY,
    configured: Boolean(resolvedUrl && resolvedKey && !resolvedUrl.includes('your-project')),
  };
}
