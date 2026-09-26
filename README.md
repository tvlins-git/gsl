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
3. Run migrations (`supabase db push`). `007_photos_storage_bucket.sql` creates the public **photos** bucket (15MB, jpeg/png/webp/heic) and storage RLS keyed to `auth_group_id()` so members can write under `{group_id}/...`. Feed images live at `{group_id}/feed/{post_id}.jpg`.
4. Deploy Edge Functions:
   ```bash
   supabase functions deploy score-photo
   supabase functions deploy send-push
   supabase functions deploy create-group-member
   supabase functions deploy delete-group-member
   supabase secrets set GOOGLE_CLOUD_VISION_API_KEY=<your-key>
   ```
   Profile **Create user** calls `create-group-member` once. Profile **Delete** calls
   `delete-group-member` (admin-only) so the person is removed from `members` and Auth.
   Feed/Hosts/Chat do **not** re-push the local login roster into `members` — that used
   to resurrect people deleted in Supabase while still cached in AsyncStorage.
5. **Single user:** The app auto-signs in as **Hr. Lins** (no login screen). On first launch it creates the Supabase account if needed.

### 3. Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go (development) or use a development build.

### Expo Go on iOS Simulator

Expo Go **57.0.6+** (57.0.9 is fine) ships Worklets **0.10.1** / Reanimated **4.5.1** natively. GSL pins the matching JS packages. The app also skips the Reanimated side-effect import inside Expo Go — Feed swipe-to-delete uses Gesture Handler `Swipeable`, and the album PhotoViewer uses React Native `Animated`, so Worklets is not needed at startup.

Verify:

1. `npx expo start` → open in Expo Go on iOS Simulator (iPhone 17 Pro is fine).
2. App should get past the splash logo to **Feed**.
3. On your own post, swipe left and tap **Delete**.
4. Open an album → full-screen **PhotoViewer**, swipe between photos.

### Album Gallery multi-select

Album **Gallery** uses the system picker with multi-select (up to 20 photos). Feed **Gallery** stays single-select (one photo per post).

**iOS test plan (Simulator + device):**

1. Photos tab → open an album → tap **Gallery**.
2. Tap several photos. Numbered badges appear (iOS 15+).
3. Tap **Add** (top right) to confirm. Checkmarks alone do not add them.
4. All selected photos should appear in the album grid.

**Simulator Add/Done trap:** On some iOS Simulator runtimes, PHPicker shows checkmarks but no **Add** button. That is an Apple simulator bug, not the app forcing single-select. Cancel with **X** and retry, or pick on a physical device. Do not set album `allowsMultipleSelection` back to `false` to work around it — Feed already stays single-select via `pickImageUri`.

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

Native store ids live in `app.config.ts`: iOS `bundleIdentifier` and Android `package` are both `com.tvlins.gsl`. The app name stays **GSL** and the slug stays `gsl`.

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
