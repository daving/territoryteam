# Territory Team

GitHub Pages single-page mobile web app for territory task workflow, backed by Airtable through a secure serverless proxy.

Current app version: **1.2.0**.

## Files
- `index.html` – app UI and sections
- `style.css` – Bootstrap-friendly mobile-first style overrides
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
- Frontend rebuilt with **Bootstrap 5.3 via CDN** (no React, no build step, no npm).
- Navigation uses a **responsive sticky Bootstrap navbar** and card-based sections.
- Navbar displays current app version for release tracking; increment it on every shipped update.
- All major UI blocks are card-based, including section containers and task/user cards in responsive grid layouts.
- Sections remain mobile-first; one section is visible at a time based on navbar shortcuts (`User`, `Inbox`, `My tasks`).
- User choice is remembered via `localStorage`; next visit skips user picker when possible.
- Reset button clears saved user and restarts flow.
- Loading overlay appears during API operations.
- A welcome message is shown at the top with guidance to contact Davin or the Territories WhatsApp group for help.
- Inbox behavior:
  - If the user already has assigned work (`In progress` as researcher, or `Done` as checker), claim actions are blocked.
  - If the user has completed 5 research tasks in the last rolling 24 hours (based on `done_time`), only **To Research** claims are blocked and a thank-you banner is shown.
- Inbox cards:
  - **To Research:** up to 5 `Todo` tasks
  - **To verify:** up to 5 `Done` tasks when user level > 1
- My tasks cards include:
  - researcher + `In progress`
  - checker + `Done`
  - queue labels so each card is marked `To Research` or `To Verify`
- Status transitions:
  - claim research => set `Researcher`, set `Status = In progress`
  - complete research => `In progress -> Done`, and set `done_time` to current ISO date-time
  - complete verify => `Done -> Verified`
- Task card content:
  - uses Bootstrap cards in responsive grid columns
  - status is shown with a Bootstrap badge
  - task type title is prefixed with `Task Type:`
  - each task renders as a compact card with a header bar, border, and a separate action button
  - territory label is shown as `Territory <number>`
  - task type `description` appears in a pop-up when `?` is clicked
  - help pop-up supports markdown-rich text from task type descriptions (line breaks/bullets/emphasis/links/code blocks/quotes)
  - markdown parsing is powered by CDN-loaded `marked` and sanitized by CDN-loaded `DOMPurify`
  - help pop-up sanitizes rich text and only permits safe links (`https`, `http`, `mailto`)
  - task type help pop-up stores encoded text in data attributes so long/special-character descriptions render fully in the modal
  - help pop-up content scrolls for long task type descriptions
  - no `?` button is shown when task type is blank
  - when description is missing, the description area stays blank (no fallback sentence)
  - Inbox cards use a **Check Out** action button; My tasks cards use a **Complete** action button
  - task type now falls back across Airtable schema variants (`name`/`Name`, `Type`/`type`) before defaulting to `Task`
  - cards are arranged in an auto-fit flow layout so they naturally wrap by screen width

## Deploy API proxy (Cloudflare Worker)
1. Install Wrangler and login.
2. Set secret token:
   ```bash
   wrangler secret put AIRTABLE_TOKEN
   ```
   Use your Airtable PAT (for example: the key you provided) as the secret value so it is stored server-side and never exposed in frontend code.
3. Deploy worker:
   ```bash
   wrangler deploy
   ```
4. Route your worker to same domain path `/api/*` (or use a reverse proxy path).
5. `AIRTABLE_BASE_ID` is prefilled in `wrangler.toml`.

## Local checks
```bash
node --test logic.test.js worker.test.js config.test.js ui.test.js
node --check script.js
```


## Completion notes UX
- When completing an `In progress` or `Done` task, the confirmation dialog says: `Are you sure? Add notes below if you want.`
- A multiline **Notes** textarea is shown under the message and above the Confirm/Cancel buttons.
- The textarea has an explanatory tooltip/title: `Optional notes saved with task completion`.
- When claiming a task from Inbox (`Claim this research task?` / `Claim this verification task?`), the confirmation dialog hides the notes field entirely so claim actions are a simple confirm/cancel step.
