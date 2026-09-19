-- User-authored feed posts with optional image and recipient tags.

CREATE TABLE feed_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  tag_all BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feed_posts_has_content CHECK (
    length(btrim(body)) > 0 OR image_path IS NOT NULL
  )
);

CREATE INDEX feed_posts_group_id_created_at_idx
  ON feed_posts (group_id, created_at DESC);

CREATE TABLE feed_post_tags (
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_tags ENABLE ROW LEVEL SECURITY;

-- Group members can read every post in their group.
CREATE POLICY feed_posts_select ON feed_posts FOR SELECT
  USING (group_id = auth_group_id());

-- Only the signed-in member can create a post as themselves.
CREATE POLICY feed_posts_insert ON feed_posts FOR INSERT
  WITH CHECK (group_id = auth_group_id() AND author_id = auth.uid());

CREATE POLICY feed_posts_delete ON feed_posts FOR DELETE
  USING (group_id = auth_group_id() AND author_id = auth.uid());

CREATE POLICY feed_post_tags_select ON feed_post_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM feed_posts p
    WHERE p.id = post_id AND p.group_id = auth_group_id()
  ));

CREATE POLICY feed_post_tags_insert ON feed_post_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feed_posts p
      WHERE p.id = post_id
        AND p.group_id = auth_group_id()
        AND p.author_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM members m
      WHERE m.user_id = user_id AND m.group_id = auth_group_id()
    )
  );

CREATE POLICY feed_post_tags_delete ON feed_post_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM feed_posts p
    WHERE p.id = post_id
      AND p.group_id = auth_group_id()
      AND p.author_id = auth.uid()
  ));

COMMENT ON TABLE feed_posts IS 'User status updates on the group feed. Optional images live in the photos bucket at {group_id}/feed/{post_id}.jpg';
COMMENT ON TABLE feed_post_tags IS 'Per-user tags for a feed post. Ignored when feed_posts.tag_all is true.';
