# NEXUS · Device Console

Modern single-page admin console for Firebase Realtime Database–backed device management & remote SMS.

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + lucide-react  
**Theme:** Soft modern SaaS (slate + sky accent, Geist)

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Features

- Login with Database URL + Secret / API key
- Optional APK/ZIP credential extraction (client-side string scan)
- Saved accounts (localStorage) + shareable encoded `#c=` links
- Live `/clients` device list (15s refresh)
- Filters, search, sort, stats bar
- Device drawer: Info · Bank · Card · SMS (6s) · Send SMS
- Bank/card SMS parsing, ₹ formatting, relative timestamps
- Toasts, permission-denied messaging, logout

## Project layout

```
src/
  App.tsx                 # shell, device list, filters
  components/
    LoginScreen.tsx
    DeviceCard.tsx
    DeviceDrawer.tsx
    StatsBar.tsx
    Battery.tsx
    Toast.tsx
  hooks/useToasts.ts
  lib/
    firebase.ts           # REST helpers
    parse.ts              # SMS / bank / card parsers
    storage.ts            # saved accounts
    types.ts
```

No backend required. Credentials never leave the browser.
