# ProfitLevel — iOS (native SwiftUI)

A native iPhone app for ProfitLevel. It is a **separate codebase** from the web app and
talks to the **same Next.js backend** (`/api/*` routes + Turso DB). Going native means
this app and the web app are maintained in parallel — every feature is built twice.

## What's built so far (first vertical slice)

- `Models/` — Swift mirrors of the backend JSON (Job, JobWithCosts, Material, Overhead, BusinessHealth).
- `Networking/APIClient.swift` — calls the API with a Clerk **Bearer token**.
- `Auth/AuthManager.swift` — token plumbing + a temporary dev sign-in.
- `Features/Jobs/` — Jobs list, add-job form, swipe-to-delete, pull-to-refresh, total profit.
- Dashboard tab reads `/api/business-health`.

Not yet ported: Financials, Overhead, Materials/Labor/Mileage per job, Settings, Onboarding, Hours log.

## Prerequisites (on you — I can't do these)

1. **Install Xcode** from the Mac App Store (the Command Line Tools alone are not enough).
2. **Apple Developer account** ($99/yr) — only needed to run on a physical iPhone or ship to the App Store. The simulator works without it.

## Getting it running

Because a hand-written `.xcodeproj` is fragile, create the project in Xcode and add these files:

1. Xcode ▸ **New Project ▸ iOS ▸ App**. Name it `ProfitLevel`, interface **SwiftUI**, language **Swift**.
2. Delete the auto-generated `ContentView.swift` and the `@main App` file.
3. Drag the contents of `Sources/ProfitLevel/` into the project ("Copy items if needed").
4. Open `Networking/APIClient.swift` and set:
   - `AppConfig.apiBaseURL` → your deployed URL (e.g. `https://profitlevel.vercel.app`).
   - `AppConfig.clerkPublishableKey` → from the Clerk dashboard.
5. Build & Run (⌘R) in the simulator.

## Signing in (two paths)

**Dev path (works today):** the app shows a box to paste a Clerk **session JWT**. While
signed into the web app, grab a token (Clerk dashboard ▸ Sessions, or browser devtools).
Paste it, tap Sign in. This proves the API integration end-to-end. Tokens expire (~1 min by
default) — fine for a smoke test, not for real use.

**Production path (do before shipping):** add the official Clerk iOS SDK and replace the
dev sign-in. See the TODO block at the top of `Auth/AuthManager.swift`:
- Add package `https://github.com/clerk/clerk-ios` in Xcode.
- Configure with the publishable key, call `Clerk.shared.load()`.
- Return real tokens from `currentToken()` via `Clerk.shared.session?.getToken()`.
- Swap `SignInView` for Clerk's sign-in UI.

## Backend note (important)

The web API authenticates via Clerk. `clerkMiddleware` accepts `Authorization: Bearer <jwt>`,
so the existing routes work with this app **without changes** — provided the Clerk
instance/keys match between web and iOS, and you may need to add a **JWT template** in Clerk
if you want longer-lived/custom tokens. Verify by hitting `/api/jobs` with a Bearer token
(e.g. via `curl`) before debugging the app.

## Local dev against `next dev`

On a physical device, `localhost` won't reach your Mac. Use your Mac's LAN IP
(`http://192.168.x.x:3000`) and add an App Transport Security exception for HTTP in Info.plist,
or just point at the deployed HTTPS URL.
