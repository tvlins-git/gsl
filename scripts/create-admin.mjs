#!/usr/bin/env node
/**
 * Create GSL admin user via Supabase service role (bypasses email confirmation).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/create-admin.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret node scripts/create-admin.mjs
 *
 * Get service role key: Supabase Dashboard → Project Settings → API → service_role (secret)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
}

loadEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL || 'hr.lins@gsl.local';
const password = process.env.ADMIN_PASSWORD || 'thomas';
const displayName = process.env.ADMIN_DISPLAY_NAME || 'Hr. Lins';

if (!url || !serviceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env (never commit this key)');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function inviteCode() {
  let c = '';
  for (let i = 0; i < 8; i++) c += CHARS[Math.floor(Math.random() * CHARS.length)];
  return c;
}

async function main() {
  const { count } = await supabase.from('groups').select('*', { count: 'exact', head: true });
  if ((count ?? 0) > 0) {
    console.error('GSL group already exists. Use the login screen or invite codes.');
    process.exit(1);
  }

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (userError) {
    console.error('Create user failed:', userError.message);
    process.exit(1);
  }

  const userId = userData.user.id;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: 'GSL', created_by: userId })
    .select()
    .single();

  if (groupError) {
    console.error('Create group failed:', groupError.message);
    await supabase.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  const { error: memberError } = await supabase.from('members').insert({
    group_id: group.id,
    user_id: userId,
    display_name: displayName,
    role: 'admin',
  });

  if (memberError) {
    console.error('Create member failed:', memberError.message);
    process.exit(1);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const codes = Array.from({ length: 10 }, () => inviteCode());

  const { error: codesError } = await supabase.from('invite_codes').insert(
    codes.map((code) => ({
      group_id: group.id,
      code,
      expires_at: expiresAt.toISOString(),
    }))
  );

  if (codesError) {
    console.error('Create invite codes failed:', codesError.message);
    process.exit(1);
  }

  console.log('\nGSL admin created successfully.\n');
  console.log('  Email:   ', email);
  console.log('  Password:', password);
  console.log('\nInvite codes for friends:\n');
  codes.forEach((c) => console.log(' ', c));
  console.log('\nSign in at the app login screen.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
