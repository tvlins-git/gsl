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
