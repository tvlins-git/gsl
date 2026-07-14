# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Cursor Cloud specific instructions

This is an Expo SDK 57 (React Native + TypeScript) app with a Supabase backend. Standard commands live in `package.json` scripts and the `README.md`.

**Running the app in the cloud VM:** there is no device/simulator, so run the web target: `npx expo start --web --port 8081` (Metro dev server on `http://localhost:8081`). Request the page once after startup to trigger the first web bundle (initial bundle takes ~10-15s).

**A `.env` file is REQUIRED or the app crashes at load** with `supabaseUrl is required.` — `lib/supabase.ts` calls `createClient` unconditionally at module load, and empty env values throw. The startup/update script copies `.env.example` to `.env` when missing; those placeholder values are enough to boot.

**No real backend needed for local dev.** With placeholder Supabase env values the app auto-detects the backend is unreachable and falls back to a built-in **local mode** (`lib/local-store.ts`) that persists data in AsyncStorage/`localStorage`. It auto-signs in as "Hr. Lins" (no login screen). All tabs (Hosts, Plan, Photos, Chat) are fully usable in local mode. To exercise the real Supabase path instead, run a local stack with the Supabase CLI (`supabase start`, then `supabase db push`) and put the real URL/anon key in `.env`.

**Expect a dev-only "Failed to fetch" LogBox toast** on first load in local mode — it is the Expo dev error overlay reacting to the background Supabase auth call failing against the placeholder URL. It does not affect functionality and can be dismissed; it does not reappear once you leave the initial screen.

**Testing/lint/typecheck:** `npm test`, `npm run lint`, `npm run typecheck` (see `README.md`). Note the current branch has some pre-existing `lint`/`typecheck` failures in app/test code that are unrelated to environment setup.
