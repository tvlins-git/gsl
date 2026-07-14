-- Seed default GSL group (run after admin user signs up, or via service role)
-- This migration documents the default group name; actual seed requires auth.users

-- Example seed (execute with service role after creating admin):
-- INSERT INTO groups (name) VALUES ('GSL') RETURNING id;
-- Generate invite codes via app admin flow

COMMENT ON TABLE groups IS 'GSL friend group — default name is GSL';
