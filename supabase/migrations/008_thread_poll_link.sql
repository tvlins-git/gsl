-- Link a chat thread back to the poll it was started from.
-- Deleting the poll keeps the thread and clears the link.

ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS poll_id UUID REFERENCES polls(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS threads_poll_id_idx ON threads (poll_id);
