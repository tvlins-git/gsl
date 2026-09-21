BEGIN;
SELECT plan(4);

SELECT has_table('public', 'groups');
SELECT has_table('public', 'members');
SELECT has_table('public', 'feed_posts');
SELECT has_table('public', 'feed_post_tags');

SELECT finish();
ROLLBACK;
