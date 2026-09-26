# Pip

Pip is a picture-first reading and math game for one child. She can switch between Danish, Swedish, and English. Mathematics and Language are the two sections. A streak across the games celebrates every 5 correct answers in a row.

Mathematics uses the single-digit addition and subtraction game. Language has three games: match a spoken letter, say a pictured word, and read a short story aloud. On the word game she can pick easy, medium, or hard. Easy words have 1 or 2 vowels, medium words have 3, and hard words have 4. Danish vowels are a e i o u æ ø å, Swedish vowels are a e i o u å ä ö, and English vowels are a e i o u.

## Run it

```bash
npm install
npm run dev
```

The dev server uses port 43123:

```bash
npx next dev -p 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

The first screen asks for the access code. Pip checks that code on the server. There is no public signup. Sign out sits under Grown-up, so it is easy to miss by accident.

## Environment

Copy `.env.example` to `.env.local`.

| Name | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server |
| `SUPABASE_SECRET_KEY` | Server only |
| `GROK_API_KEY` | Server only, for `POST /api/speech` |
| `PIP_ACCESS_CODE` | Server only. Opens the app and `POST /api/speech` |

Without the Supabase variables, Pip still opens and keeps the streak in a cookie on this browser. The home screen says the database is not connected. Without `GROK_API_KEY`, speech returns an error and does not pretend a spoken answer was correct.

## Speech

`POST /api/speech`

Speak:

```json
{ "action": "speak", "text": "Fem rätt i rad!", "language": "sv" }
```

The response is MP3 audio when the key is set.

Check:

```json
{ "action": "check", "audioBase64": "...", "expected": "hund", "language": "sv" }
```

The response is `{ "correct": true }` or `{ "correct": false }`. A missing key returns JSON with `error: "speech_unavailable"`. A visitor without the access code gets `401` and Pip does not call Grok.

## Database

Progress belongs in a new Supabase project in Stockholm (`eu-north-1`), separate from any existing project. The free plan on this account already has two active projects, so a third project could not be created yet. The schema is in `supabase/migrations/20260926063800_pip_schema.sql`.

After the project exists:

1. Apply that migration.
2. Put the project URL, publishable key, and secret key in `.env.local` and in Vercel.
3. Put `GROK_API_KEY` in both places too. The browser never sees it.

The access code lives in `PIP_ACCESS_CODE` on the server. It is not in the repository and not in client JavaScript. Row Level Security in the schema limits every table to that account once a database exists.

## Checks

```bash
npm test
npm run lint
```
