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
