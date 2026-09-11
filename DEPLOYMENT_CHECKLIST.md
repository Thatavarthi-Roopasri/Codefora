# Codefora Deployment Checklist

Use this before launching a production build. Keep real secrets in your hosting provider, not in Git.

## Backend Environment

- Set `NODE_ENV=production`.
- Set `CODEFORA_LOCAL_MODE=false` or leave it unset.
- Set `CODEFORA_REQUIRE_FIREBASE=true`.
- Set `FIREBASE_PROJECT_ID` to the same Firebase project used by the frontend.
- Provide Firebase Admin credentials using one of these:
  - `GOOGLE_APPLICATION_CREDENTIALS` pointing to the service-account JSON file.
  - `firebase-key.json` in the project root for controlled local verification only.
  - `/etc/secrets/firebase-key.json` on hosts that mount secret files there.
- Set `CLIENT_ORIGIN` to the deployed frontend origin, for example `https://codefora.online`.
- Configure optional production features if needed:
  - `GROQ_API_KEY` or `GEMINI_API_KEY` for AI features.
  - `JUDGE0_URL`, `JUDGE0_KEY`, and `JUDGE0_HOST` for Judge0 execution.
  - `PUPPETEER_EXECUTABLE_PATH` if the host needs an explicit browser path for challenge rendering.

## Frontend Environment

- Set `VITE_API_URL` to the deployed backend URL.
- Set Firebase client config from the same Firebase project:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_MEASUREMENT_ID`, if Analytics is enabled
- Keep `VITE_USE_REMOTE_API=false` unless you intentionally want the dev server to call the deployed backend.

## Firebase Console

- Enable Firebase Authentication providers used by Codefora.
- Add the frontend domain to Firebase Auth authorized domains.
- Enable Firestore.
- Confirm Firestore rules allow only the intended user/profile access.
- Create or upload Firebase Admin service-account credentials for the backend host.

## Pre-Launch Commands

Run these from the project root:

```bash
npm run backup:data
npm run verify:data-safe
npm run verify
npm run verify:production-env
npm run verify:real-firebase
```

`npm run backup:data` saves a local copy of rooms, profiles, heatmap/activity data, saved work, notifications, and direct messages. `npm run verify:data-safe` blocks a push when local runtime data files are staged. `npm run verify:production-env` checks required env presence. `npm run verify:real-firebase` only passes after the backend reports real Firebase services and Save Work can write/read real Firestore with a fresh signed-in user token.

## Runtime Data Safety

These files are local runtime data and must not be pushed as app code:

- `backend/data/rooms.json`
- `backend/data/manualUsers.json`
- `backend/data/localWorks.json`
- `backend/data/manualNotifications.json`
- `backend/data/manualDirectMessages.json`

`manualUsers.json` contains profile stats, friends, activities, solved problems, and data used by the heatmap. `rooms.json` contains local rooms. `localWorks.json` contains Save Work snapshots. Keep these as local backups or migrate them to real Firestore before production launch.

For local testing that must not touch your real local data, set `CODEFORA_DATA_DIR` to a temporary folder. `npm run test:e2e` uses isolated temp data when it starts its own servers. If your normal app is already running, stop it before E2E, or set `E2E_REUSE_EXISTING_SERVERS=true` only when you intentionally want E2E to use the active local app data.

## Runtime Checks

- Open `/api/health` on the deployed backend.
- Confirm:
  - `firestore` is `real`
  - `auth` is `real`
  - `services.rooms.storage` is `firestore`
  - `services.environment.ok` is `true`
- Sign in on the deployed frontend.
- Create or open a room.
- Use Save Work and confirm the success message says `Saved to Real Firestore`.
- Open Profile and confirm the saved work appears with the same timestamp.
- Test logout/login, friend request, notification, and friend list realtime updates in two browser tabs.

## Rollback Signals

Do not launch if any of these are true:

- `/api/health` shows `firestore: "mock"` or `auth: "mock"`.
- `CODEFORA_LOCAL_MODE=true` is present in production.
- Login forms show the Firebase config missing message.
- Save Work says `Local/mock JSON` on the deployed site.
- Realtime friend requests or notifications require a manual refresh.
