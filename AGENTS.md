# Base44 Agent Notes

## Project
"Cats in Space" — a Vite + React SPA using the Base44 SDK and Wix SDK for backend/auth/cart.

## Setup
- Frontend-only project (no local backend service needed).
- Runs via `docker compose -f docker-compose.base44.yml up -d`.
- Dev server on port 5173, exposed to host port 3000.
- `npm install` runs at container startup (node_modules in a named volume for speed).

## Required Secrets
Both must be in `/run/base44/app.env`:
- `VITE_BASE44_APP_ID` — Base44 app ID (from Base44 dashboard project settings)
- `VITE_BASE44_APP_BASE_URL` — Base44 backend URL (e.g. `https://my-app-id.base44.app`)

## Wix Integration
The app also connects to Wix (SDK: `@wix/sdk`, `@wix/bookings`, `@wix/events`, etc.) via backend functions (`base44/functions/`). Wix tokens are managed via localStorage. No extra Wix secrets needed in env — they are handled by the `wixSession` backend function.

## Verifying It Works
- `curl http://localhost:3000/` should return HTML with `<title>Cats in Space`
- Check `docker compose -f docker-compose.base44.yml logs web` for Vite startup
