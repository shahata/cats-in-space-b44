# AGENTS.md

## Setup Notes

- Pure Vite + React frontend (no backend service in this repo)
- Connects to Base44's hosted backend via `VITE_BASE44_APP_ID` + `VITE_BASE44_APP_BASE_URL`
- The `@base44/vite-plugin` proxies `/api` → `VITE_BASE44_APP_BASE_URL` at dev time
- Also integrates with Wix SDK (bookings, events, members, restaurants) via backend functions
- `vite.config.js` has `server.allowedHosts: true` so the preview proxy hostname is accepted
- No database or local infrastructure needed

## Verify

```bash
docker compose -f docker-compose.base44.yml up -d
curl http://localhost:3000/   # should return HTML
```

## Secrets required

- `VITE_BASE44_APP_ID` — Base44 app hex ID (project settings)
- `VITE_BASE44_APP_BASE_URL` — Base44 app backend URL (e.g. https://my-app.base44.app)
