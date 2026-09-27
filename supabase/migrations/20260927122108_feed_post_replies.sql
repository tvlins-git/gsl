-- Threaded replies under a feed post (not group chat rooms).

CREATE TABLE feed_post_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feed_post_replies_body_not_blank CHECK (length(btrim(body)) > 0)
);

CREATE INDEX feed_post_replies_post_id_created_at_idx
  ON feed_post_replies (post_id, created_at ASC);

ALTER TABLE feed_post_replies ENABLE ROW LEVEL SECURITY;

-- Group members can read every reply on posts in their group.
CREATE POLICY feed_post_replies_select ON feed_post_replies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM feed_posts p
    WHERE p.id = post_id AND p.group_id = auth_group_id()
  ));

-- Only the signed-in member can create a reply as themselves.
CREATE POLICY feed_post_replies_insert ON feed_post_replies FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM feed_posts p
      WHERE p.id = post_id AND p.group_id = auth_group_id()
    )
  );

-- Authors can delete their own replies.
CREATE POLICY feed_post_replies_delete ON feed_post_replies FOR DELETE
  USING (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM feed_posts p
      WHERE p.id = post_id AND p.group_id = auth_group_id()
    )
  );

COMMENT ON TABLE feed_post_replies IS
  'Chained replies under a feed post. Separate from chat threads/messages.';

-- Live thread screen subscribes to INSERT on replies.
ALTER TABLE public.feed_post_replies REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_post_replies;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
