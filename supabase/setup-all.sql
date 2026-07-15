-- GSL Friend Group App — Core Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'GSL',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  contact_email TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

CREATE TABLE host_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  assigned_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, year, month)
);

CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  chosen_slot_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE poll_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE polls
  ADD CONSTRAINT polls_chosen_slot_id_fkey
  FOREIGN KEY (chosen_slot_id) REFERENCES poll_slots(id) ON DELETE SET NULL;

CREATE TABLE poll_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES poll_slots(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('yes', 'maybe', 'no')),
  UNIQUE(slot_id, member_id)
);

CREATE TABLE photo_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES photo_events(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  thumb_path TEXT,
  ai_score REAL,
  width INT,
  height INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE thread_members (
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, member_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper: get current user's group_id
CREATE OR REPLACE FUNCTION auth_group_id() RETURNS UUID AS $$
  SELECT group_id FROM members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_member_id() RETURNS UUID AS $$
  SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
-- RLS policies for GSL app

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Groups: members can read their group
CREATE POLICY groups_select ON groups FOR SELECT
  USING (id = auth_group_id());

-- Members: read/write own group members
CREATE POLICY members_select ON members FOR SELECT
  USING (group_id = auth_group_id());
CREATE POLICY members_update_own ON members FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY members_insert ON members FOR INSERT
  WITH CHECK (group_id = auth_group_id() OR user_id = auth.uid());

-- Invite codes: readable for validation during signup
CREATE POLICY invite_codes_select ON invite_codes FOR SELECT
  USING (used_by IS NULL OR group_id = auth_group_id());
CREATE POLICY invite_codes_update ON invite_codes FOR UPDATE
  USING (used_by IS NULL);

-- Device tokens: own tokens only
CREATE POLICY device_tokens_all ON device_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Host assignments
CREATE POLICY host_assignments_all ON host_assignments FOR ALL
  USING (group_id = auth_group_id())
  WITH CHECK (group_id = auth_group_id());

-- Polls
CREATE POLICY polls_all ON polls FOR ALL
  USING (group_id = auth_group_id())
  WITH CHECK (group_id = auth_group_id());

-- Poll slots (via poll group)
CREATE POLICY poll_slots_all ON poll_slots FOR ALL
  USING (EXISTS (
    SELECT 1 FROM polls p WHERE p.id = poll_id AND p.group_id = auth_group_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM polls p WHERE p.id = poll_id AND p.group_id = auth_group_id()
  ));

-- Poll responses
CREATE POLICY poll_responses_all ON poll_responses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM poll_slots ps
    JOIN polls p ON p.id = ps.poll_id
    WHERE ps.id = slot_id AND p.group_id = auth_group_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM poll_slots ps
    JOIN polls p ON p.id = ps.poll_id
    WHERE ps.id = slot_id AND p.group_id = auth_group_id()
  ));

-- Photo events
CREATE POLICY photo_events_all ON photo_events FOR ALL
  USING (group_id = auth_group_id())
  WITH CHECK (group_id = auth_group_id());

-- Photos
CREATE POLICY photos_all ON photos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM photo_events pe
    WHERE pe.id = event_id AND pe.group_id = auth_group_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM photo_events pe
    WHERE pe.id = event_id AND pe.group_id = auth_group_id()
  ));

-- Threads
CREATE POLICY threads_all ON threads FOR ALL
  USING (group_id = auth_group_id())
  WITH CHECK (group_id = auth_group_id());

-- Thread members
CREATE POLICY thread_members_all ON thread_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM threads t WHERE t.id = thread_id AND t.group_id = auth_group_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM threads t WHERE t.id = thread_id AND t.group_id = auth_group_id()
  ));

-- Messages
CREATE POLICY messages_all ON messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM threads t WHERE t.id = thread_id AND t.group_id = auth_group_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM threads t WHERE t.id = thread_id AND t.group_id = auth_group_id()
  ));

-- Storage bucket (run via dashboard or separate migration)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false);
-- Seed default GSL group (run after admin user signs up, or via service role)
-- This migration documents the default group name; actual seed requires auth.users

-- Example seed (execute with service role after creating admin):
-- INSERT INTO groups (name) VALUES ('GSL') RETURNING id;
-- Generate invite codes via app admin flow

COMMENT ON TABLE groups IS 'GSL friend group — default name is GSL';
-- First-time GSL admin bootstrap (one group only)

CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION bootstrap_admin_group(p_display_name TEXT DEFAULT 'Admin')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group_id UUID;
  v_member_id UUID;
  v_codes TEXT[] := ARRAY[]::TEXT[];
  v_code TEXT;
  i INT;
  v_expires TIMESTAMPTZ := now() + interval '30 days';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'You are already a member of a group';
  END IF;

  IF EXISTS (SELECT 1 FROM groups LIMIT 1) THEN
    RAISE EXCEPTION 'GSL group already exists. Ask an admin for an invite code.';
  END IF;

  INSERT INTO groups (name, created_by) VALUES ('GSL', v_user_id) RETURNING id INTO v_group_id;

  INSERT INTO members (group_id, user_id, display_name, role)
  VALUES (v_group_id, v_user_id, COALESCE(NULLIF(trim(p_display_name), ''), 'Admin'), 'admin')
  RETURNING id INTO v_member_id;

  FOR i IN 1..10 LOOP
    v_code := generate_invite_code();
    INSERT INTO invite_codes (group_id, code, expires_at) VALUES (v_group_id, v_code, v_expires);
    v_codes := array_append(v_codes, v_code);
  END LOOP;

  RETURN jsonb_build_object(
    'group_id', v_group_id,
    'member_id', v_member_id,
    'invite_codes', to_jsonb(v_codes)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION bootstrap_admin_group(TEXT) TO authenticated;

-- Admins can read all invite codes for their group
CREATE POLICY invite_codes_admin_select ON invite_codes FOR SELECT
  USING (
    group_id = auth_group_id()
    AND EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = auth.uid() AND m.group_id = auth_group_id() AND m.role = 'admin'
    )
  );
