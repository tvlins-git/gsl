-- Deleting a poll also deletes the chat thread that was started from it.
-- Messages and thread members already cascade from threads.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'threads'
    AND con.contype = 'f'
    AND pg_get_constraintdef(con.oid) ILIKE '%polls%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.threads DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.threads
  ADD CONSTRAINT threads_poll_id_fkey
  FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;
