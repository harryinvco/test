# Innovaco Notes — iOS app

Expo + React Native client for the Innovaco command center's notes module. Pairs with the Next.js app in `../`.

**Phase 4 status:** feature-complete. Auto-sync on app open + after every edit + every 60 seconds while foreground. Live sync status pill in the header. 401 auto-signs-out. EAS Build profiles configured. Only missing: app icon / splash artwork.

## Requirements

- Node 20+
- macOS + Xcode 15+ (for iOS device/simulator builds)
- Apple Developer account ($99/yr) — for device builds + TestFlight

## Setup

```sh
cd mobile
npm install
npx expo install --fix     # align RN peer versions with SDK 55
```

## Pointing at the backend

The app reads `EXPO_PUBLIC_API_BASE_URL` at build time. If unset:

- On **simulator** running on the same Mac as the Next.js dev server: falls back to the Metro dev server's host at port 3000 (resolves automatically).
- For a **physical iPhone**: set your Mac's LAN IP explicitly:
  ```sh
  EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000 npm run ios
  ```
- For **TestFlight / production**: set in `eas.json`'s `production.env` (currently `https://notes.innovaco.com.cy` — change if you host elsewhere).

## Run on simulator

```sh
# Terminal 1 — backend (reads your existing Turso DB)
cd ..
npm run dev

# Terminal 2 — iOS app
cd mobile
npm run ios
```

Xcode launches an iOS simulator. Log in with your admin credentials. On first launch the app auto-pulls all your tabs/notes from Turso.

## Run on physical device

1. Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from the App Store.
2. Ensure iPhone + Mac are on the same Wi-Fi; firewall allows port 3000.
3. Find your Mac's LAN IP: `ipconfig getifaddr en0`.
4. ```sh
   EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3000 npm start
   ```
5. Scan the QR code with the iPhone camera.

iOS blocks plaintext HTTP by default; `app.json` already grants a local-networking exception.

## Build for TestFlight

```sh
npm install -g eas-cli
eas login
eas build:configure   # one-time, populates ios config + credentials
eas build --profile production --platform ios
```

EAS handles code signing. The resulting `.ipa` uploads to App Store Connect automatically. Install on your iPhone via **TestFlight → Internal Testing** — no App Store review required.

**Before the first production build**, add these assets (referenced in the Expo default template):
- `assets/icon.png` — 1024×1024 PNG, no transparency
- `assets/adaptive-icon.png` — 1024×1024, for Android (optional)
- `assets/splash.png` — 2048×2048, centered, with padding

Then uncomment the `icon` / `splash` references in `app.json`.

## How sync works

**Auto-triggers** (managed by `SyncProvider`):

| Trigger | Timing |
|---|---|
| Login / app mount | Immediate |
| AppState → active (foreground from background) | Immediate |
| Any local mutation | Debounced 2.5s after last edit |
| Periodic (while foreground) | Every 60s |
| Manual | Tap the sync pill or Settings → Sync now |

**Status pill** (in Notes header + Settings):

| State | Meaning |
|---|---|
| Synced | Nothing pending, last sync succeeded |
| *N* pending | Local edits not yet pushed |
| Syncing | Request in flight |
| Offline | Network error on last attempt — next trigger retries |
| Error | Server responded with non-OK — tap banner to retry |

**401 auto-logout** — if the token is expired/revoked, `SyncProvider` calls `signOut()` and the router redirects to `/login`.

## Editor

Notes are edited in a CodeMirror 6 instance running inside a `react-native-webview`. Content is plain GFM Markdown — the same format the web app stores — so notes round-trip cleanly between devices.

**Building the editor bundle:** the WebView loads `assets/editor/index.html` + `editor.js`, which are generated from `src/editor/web/` by `scripts/build-editor.mjs`. Regenerate after any change in `src/editor/web/`:

```sh
npm run build-editor
```

The outputs are committed to git so fresh clones don't need a build step.

**Features:**
- Live-preview: headings, bold/italic, inline code render as you type; raw syntax reappears on the cursor line.
- Tappable checkboxes: `- [ ] todo` renders a tap-toggleable box.
- Toolbar above the keyboard: ☑ • ⋮ list • H (cycles H1→H2→H3) • **B** • *I* • 🔗
- Historical (non-today) notes render read-only with toolbar hidden and checkboxes inert.

## Sync protocol (recap)

```
POST /api/mobile/notes/sync
Authorization: Bearer <JWT>
Body: {
  cursor: number | null,
  changes: {
    tabs:  [{ id, date, label, position, createdAt, updatedAt, deletedAt }],
    notes: [{ id, tabId, date, titlePreview, content, position, createdAt, updatedAt, deletedAt }]
  }
}
→ {
  serverCursor: number,
  tabs:  [...],  // rows with updatedAt > cursor (incl. tombstones)
  notes: [...],
  applied:  { tabs, notes },  // how many local changes the server accepted
  rejected: { tabs, notes }   // rejected by LWW (server was newer)
}
```

Conflict resolution: last-write-wins by `updatedAt`. Single-user multi-device is the intended model.

## Project layout

```
mobile/
├── app/                              # Expo Router (file-based)
│   ├── _layout.tsx                   # SafeArea + Auth + Sync providers + Stack
│   ├── index.tsx                     # Redirect based on auth
│   ├── login.tsx
│   └── (app)/                        # Auth-guarded group
│       ├── _layout.tsx
│       ├── home.tsx                  # Today (accepts ?date= for history)
│       ├── tab/[tabId].tsx
│       ├── note/[noteId].tsx
│       ├── history.tsx
│       └── settings.tsx
├── src/
│   ├── api/client.ts                 # fetch wrapper + typed endpoints
│   ├── auth/AuthContext.tsx          # token storage via expo-secure-store
│   ├── config.ts                     # API base URL resolution
│   ├── db/
│   │   ├── local.ts                  # expo-sqlite + migrations + LWW upserts
│   │   └── schema.ts
│   ├── lib/
│   │   ├── date.ts                   # getLogicalDate (07:00 Nicosia cutoff)
│   │   ├── title.ts                  # deriveTitle
│   │   └── uuid.ts
│   ├── notes/
│   │   ├── queries.ts
│   │   └── mutations.ts              # Emit dirty-change events
│   ├── sync/
│   │   ├── engine.ts                 # push dirty → pull → LWW merge
│   │   ├── bus.ts                    # Tiny pub/sub
│   │   └── SyncProvider.tsx          # Auto-triggers + context
│   └── ui/
│       ├── theme.ts
│       └── SyncPill.tsx
├── app.json, eas.json, package.json, tsconfig.json
```
