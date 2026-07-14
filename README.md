# GSL — Friend Group App

A private cross-platform mobile app for the **GSL** friend group. Built with Expo (React Native) + Supabase.

## Features

- **Hosts** — Monthly host rotation with member assignments
- **Plan** — Doodle-style scheduling polls with voting grid
- **Photos** — Event albums with AI-ranked top pictures
- **Chat** — Threaded group messaging with real-time delivery
- **Push notifications** — Messages, polls, and host reminders

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo SDK 57, React Native, TypeScript, Expo Router |
| Backend | Supabase (Auth, Postgres, Realtime, Storage, Edge Functions) |
| Push | Expo Push Notifications |
| AI ranking | Supabase Edge Function + Google Cloud Vision |

## Getting Started

### Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local dev)
- [EAS CLI](https://docs.expo.dev/build/setup/) (for builds)

### 1. Clone and install

```bash
git clone git@github.com:<you>/loge.git
cd loge
npm install
cp .env.example .env
```

### 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key into `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
3. Run migrations:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
4. Create a **photos** storage bucket (private) in the Supabase dashboard
5. Deploy Edge Functions:
   ```bash
   supabase functions deploy score-photo
   supabase functions deploy send-push
   supabase secrets set GOOGLE_CLOUD_VISION_API_KEY=<your-key>
   ```
6. **Single user:** The app auto-signs in as **Hr. Lins** (no login screen). On first launch it creates the Supabase account if needed.

### 3. Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go (development) or use a development build.

### 4. GitHub setup

```bash
git remote add origin git@github.com:<you>/loge.git
git push -u origin main
```

Add GitHub Actions secrets for the keepalive workflow:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Enable branch protection on `main`: require PR + CI checks.

## Testing

```bash
npm test              # Jest unit + component + integration tests
npm run typecheck     # TypeScript check
npm run lint          # ESLint

# Edge Function tests (requires Deno)
deno test --allow-env supabase/functions/
```

## Distribution

### Android (free — shared APK)

```bash
eas build --platform android --profile preview
```

Share the APK download link with GSL members.

### iOS (TestFlight — requires Apple Developer $99/yr)

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### EAS setup

```bash
npm install -g eas-cli
eas login
eas init
```

Set `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env` from the EAS dashboard.

## Branding

- App name: **GSL**
- Default group name: **GSL**
- Logo: `assets/images/logo.png`

## Project Structure

```
app/                  # Expo Router screens
  (auth)/             # Login, register
  (tabs)/             # Hosts, Plan, Photos, Chat
  thread/[id].tsx     # Chat thread detail
components/           # Shared UI components
lib/                  # Business logic & Supabase client
supabase/
  migrations/         # SQL schema + RLS
  functions/          # Edge Functions (score-photo, send-push)
__tests__/            # Jest tests
```

## License

Private — GSL members only.
