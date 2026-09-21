import { resolveSupabaseConfig } from '@/lib/supabase-config';

describe('resolveSupabaseConfig', () => {
  it('falls back to placeholders when env is empty so createClient will not throw', () => {
    const config = resolveSupabaseConfig('', '');
    expect(config.url).toBe('https://your-project.supabase.co');
    expect(config.key).toBe('your-anon-key');
    expect(config.configured).toBe(false);
  });

  it('treats .env.example placeholders as unconfigured', () => {
    const config = resolveSupabaseConfig(
      'https://your-project.supabase.co',
      'your-anon-key'
    );
    expect(config.configured).toBe(false);
  });

  it('marks a real project URL as configured', () => {
    const config = resolveSupabaseConfig(
      'https://abcd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon'
    );
    expect(config.configured).toBe(true);
    expect(config.url).toBe('https://abcd.supabase.co');
  });
});
