BEGIN;
SELECT plan(2);

SELECT has_table('public', 'groups');
SELECT has_table('public', 'members');

SELECT finish();
ROLLBACK;
