-- Pip learner profile, answers, and mastery.
-- Family sign-in creates an auth user whose password is the family code.
-- The email is derived from the code and is never shown.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  language text not null default 'sv' check (language in ('da', 'sv', 'en')),
  math_level integer not null default 1 check (math_level in (1, 2)),
  math_correct integer not null default 0 check (math_correct >= 0),
  stars integer not null default 0 check (stars >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity text not null check (activity in ('math', 'alphabet', 'word', 'story')),
  item_key text not null check (char_length(item_key) between 1 and 80),
  language text not null check (language in ('da', 'sv', 'en')),
  correct boolean not null,
  created_at timestamptz not null default now()
);

create table public.mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity text not null check (activity in ('math', 'alphabet', 'word', 'story')),
  item_key text not null check (char_length(item_key) between 1 and 80),
  language text not null check (language in ('da', 'sv', 'en')),
  correct_count integer not null default 0 check (correct_count >= 0),
  primary key (user_id, activity, item_key, language)
);

alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.mastery enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.attempts from anon, authenticated;
revoke all on public.mastery from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, language) on public.profiles to authenticated;
grant select on public.attempts to authenticated;
grant select on public.mastery to authenticated;

create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "read own attempts"
  on public.attempts for select
  to authenticated
  using (user_id = auth.uid());

create policy "read own mastery"
  on public.mastery for select
  to authenticated
  using (user_id = auth.uid());

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Pip')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.start_family(p_code text, p_name text)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  normalized text := lower(btrim(p_code));
  learner_name text := btrim(p_name);
  email_hash text;
  learner_email text;
  new_id uuid := gen_random_uuid();
begin
  if normalized !~ '^[a-z0-9-]{6,40}$' or length(replace(normalized, '-', '')) < 6 then
    raise exception 'code';
  end if;
  if char_length(learner_name) < 1 or char_length(learner_name) > 24 then
    raise exception 'name';
  end if;

  email_hash := encode(extensions.digest(convert_to(normalized, 'UTF8'), 'sha256'), 'hex');
  learner_email := 'pip.' || left(email_hash, 32) || '@learner.pip.app';

  if exists (select 1 from auth.users where email = learner_email) then
    return;
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    is_sso_user,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    learner_email,
    extensions.crypt(normalized, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', learner_name),
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at,
    email
  ) values (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', learner_email),
    'email',
    new_id::text,
    now(),
    now(),
    now(),
    learner_email
  );
end;
$$;

revoke all on function public.start_family(text, text) from public;
grant execute on function public.start_family(text, text) to anon, authenticated;

create or replace function public.record_answer(
  p_activity text,
  p_item_key text,
  p_language text,
  p_correct boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles%rowtype;
  new_streak integer;
  new_stars integer;
  new_best integer;
  new_math_level integer;
  new_math_correct integer;
  milestone integer := null;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_activity not in ('math', 'alphabet', 'word', 'story') then
    raise exception 'bad activity';
  end if;
  if p_language not in ('da', 'sv', 'en') then
    raise exception 'bad language';
  end if;
  if p_item_key is null or char_length(p_item_key) < 1 or char_length(p_item_key) > 80 then
    raise exception 'bad item';
  end if;

  select * into prof from public.profiles where id = uid for update;
  if not found then
    raise exception 'no profile';
  end if;

  if p_correct then
    new_streak := prof.current_streak + 1;
    new_stars := prof.stars;
    if new_streak % 5 = 0 then
      milestone := new_streak;
      new_stars := prof.stars + 1;
    end if;

    insert into public.mastery (user_id, activity, item_key, language, correct_count)
    values (uid, p_activity, p_item_key, p_language, 1)
    on conflict (user_id, activity, item_key, language)
    do update set correct_count = public.mastery.correct_count + 1;
  else
    new_streak := 0;
    new_stars := prof.stars;
  end if;

  new_best := greatest(prof.best_streak, new_streak);
  new_math_correct := prof.math_correct;
  new_math_level := prof.math_level;

  if p_activity = 'math' and p_correct then
    new_math_correct := prof.math_correct + 1;
    if new_math_level = 1 and new_math_correct >= 15 then
      new_math_level := 2;
    end if;
  end if;

  update public.profiles
  set
    current_streak = new_streak,
    best_streak = new_best,
    stars = new_stars,
    math_correct = new_math_correct,
    math_level = new_math_level
  where id = uid;

  insert into public.attempts (user_id, activity, item_key, language, correct)
  values (uid, p_activity, p_item_key, p_language, p_correct);

  return jsonb_build_object(
    'stars', new_stars,
    'currentStreak', new_streak,
    'bestStreak', new_best,
    'mathLevel', new_math_level,
    'mathCorrect', new_math_correct,
    'milestone', milestone
  );
end;
$$;

revoke all on function public.record_answer(text, text, text, boolean) from public, anon;
grant execute on function public.record_answer(text, text, text, boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speech-cache', 'speech-cache', false, 1048576, array['audio/mpeg'])
on conflict (id) do nothing;

create policy "read speech cache"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'speech-cache');

create policy "insert speech cache"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'speech-cache'
    and (storage.foldername(name))[1] in ('da', 'sv', 'en')
  );

create policy "update speech cache"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'speech-cache')
  with check (bucket_id = 'speech-cache');
