-- Live chat threads and open photo albums subscribe to INSERT on these tables.
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.photos REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
