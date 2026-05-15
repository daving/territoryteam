# Territory Team

GitHub Pages single-page mobile web app for territory task workflow, backed by Airtable through a secure serverless proxy.

## Files
- `index.html` – app UI and sections
- `style.css` – card-based mobile styles
- `script.js` – frontend behavior and API calls to `/api/*`
- `worker.js` – Cloudflare Worker API proxy that holds Airtable token server-side
- `wrangler.toml` – Worker configuration
- `logic.test.js` – assignment rule unit test
- `worker.test.js` – proxy route mapping test

## Security architecture
- Frontend **does not** contain Airtable PAT.
- Frontend calls deployed Worker endpoints at `https://territoryteam-api.daving.workers.dev/api/*`:
  - `GET /api/users`
  - `GET /api/tasks`
  - `GET /api/tasktypes`
  - `PATCH /api/tasks/:id`
- Cloudflare Worker forwards to Airtable using secret `AIRTABLE_TOKEN`.

## Behavior
- One section shown at a time (`User`, `Inbox`, `My tasks`).
- User choice is remembered via `localStorage`; next visit skips user picker when possible.
- Reset button clears saved user and restarts flow.
- Loading overlay appears during API operations.
- Inbox is disabled when user already has assigned work:
  - researcher + `In progress`
  - checker + `Done`
- Inbox cards:
  - **Research:** up to 5 `Todo` tasks with tasktype level <= user level
  - **To verify:** up to 5 `Done` tasks when user level > 1
- My tasks cards include:
  - researcher + `In progress`
  - checker + `Done`
- Status transitions:
  - claim research => set `Researcher`, set `Status = In progress`
  - complete research => `In progress -> Done`
  - complete verify => `Done -> Verified`

## Deploy API proxy (Cloudflare Worker)
1. Install Wrangler and login.
2. Set secret token:
   ```bash
   wrangler secret put AIRTABLE_TOKEN
   ```
3. Deploy worker:
   ```bash
   wrangler deploy
   ```
4. Route your worker to same domain path `/api/*` (or use a reverse proxy path).
5. `AIRTABLE_BASE_ID` is prefilled in `wrangler.toml`.

## Local checks
```bash
node --test logic.test.js worker.test.js
node --check script.js
```