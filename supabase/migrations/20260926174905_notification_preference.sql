-- Per-member push notification preference.
-- off: never send push to this user
-- tagged: only @mention / @everyone / feed tag_all / per-user tags
-- all: current behavior (chat broadcasts, tagged events, poll pushes)
-- Default 'all' so existing TestFlight users are not muted.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS notification_preference TEXT NOT NULL DEFAULT 'all';

ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_notification_preference_check;

ALTER TABLE members
  ADD CONSTRAINT members_notification_preference_check
  CHECK (notification_preference IN ('off', 'tagged', 'all'));

COMMENT ON COLUMN members.notification_preference IS
  'Push preference: off | tagged | all. Default all preserves prior notify behavior.';

-- Avatar files live in the existing public photos bucket under
-- {group_id}/avatars/{user_id}.jpg (see lib/avatar-upload.ts).
-- members.avatar_url already exists from 001_schema.sql.
