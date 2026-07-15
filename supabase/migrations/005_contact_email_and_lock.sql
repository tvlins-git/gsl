-- Contact email for calendar invites + locked poll slot

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS chosen_slot_id UUID REFERENCES poll_slots(id) ON DELETE SET NULL;
