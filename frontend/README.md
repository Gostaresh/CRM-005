# CRM-005 – Front-end (Vue 3 + Vite)

Single-page application that sits on top of the CRM-005 back‑end and delivers a Persian‑first UI for Dynamics 365 tasks, accounts, contacts, and notes.

---

## Quick Start

```bash
cd frontend
cp .env.example .env        # set VITE_API_URL if the API is not on http://localhost:3000
npm install
npm run dev                 # Vite dev-server on http://localhost:5173
```

---

## NPM Scripts (`frontend/package.json`)

| Script      | Command              | Purpose                                 |
| ----------- | -------------------- | --------------------------------------- |
| **dev**     | `vite`               | Hot‑reloading dev server with API proxy |
| **build**   | `vite build`         | Production build (outputs to `dist/`)   |
| **preview** | `vite preview`       | Serves the built bundle locally         |
| **lint**    | `eslint src --fix`   | Auto‑fixable ESLint rules               |
| **format**  | `prettier --write .` | Format all source files                 |
| **test**    | `jest`               | Unit tests with Vue Test Utils          |

---

## Key Dependencies

| Package                        | Why it’s here                                     |
| ------------------------------ | ------------------------------------------------- |
| **vue @ 3**                    | Core reactive UI                                  |
| **vite @ 5**                   | Fast dev server + production bundler              |
| **vue-router @ 4**             | SPA routing (`/dashboard`, `/accounts/:id`, …)    |
| **pinia**                      | Store modules (user, metadata, toast)             |
| **naive-ui**                   | Component library (forms, dialogs, notifications) |
| **fullcalendar @ 6** + plugins | Calendar view with drag‑and‑drop                  |
| **intl‑jalali (utils)**        | Jalali↔Gregorian helpers via Intl API            |
| **axios**                      | HTTP client (with credentials)                    |
| **mitt**                       | Tiny event bus for cross‑component messages       |

---

## Folder Structure

```
frontend/
 ├─ public/                  # static assets
 ├─ src/
 │   ├─ assets/              # logos, icons
 │   ├─ components/          # reusable pieces (CalendarView, DynamicForm, …)
 │   ├─ pages/               # route‑level views
 │   ├─ router/              # vue-router config & guards
 │   ├─ stores/              # Pinia modules
 │   ├─ plugins/             # axios interceptor, moment-jalaali patch
 │   ├─ utils/               # small helpers (e.g. jalali ↔ ISO)
 │   ├─ main.js              # app bootstrap
 │   └─ App.vue              # root component
 └─ README.md
```

---

## Routing

| Path              | Component              | Auth? |
| ----------------- | ---------------------- | ----- |
| `/`               | **LoginPage**          | ❌    |
| `/dashboard`      | **CalendarPage**       | ✅    |
| `/accounts`       | **AccountListPage**    | ✅    |
| `/accounts/:id`   | **AccountDetailsPage** | ✅    |
| `/activities/:id` | **ActivityDrawer**     | ✅    |

Global navigation guards in `router/index.js` hydrate the session on first load by calling **/api/auth/me**. Guests who attempt to access any protected route are redirected to **/**, while authenticated users hitting **/** or **/login** are bounced to **/dashboard**.

For local development, the login form comes pre‑filled with **GOSTARESH\\ehsntb / Ss12345** so you can jump straight into the dashboard.

---

## State Management (Pinia)

- `useUserStore` – user info & roles (hydrated at app start).
- `useMetaStore` – caches entity metadata & option‑sets.
- `useToastStore` – global Naive‑UI toast notifications.
- `useAuthStore` – holds `user` & `error` plus actions `login()`, `logout()`, `fetchUser()`; actions talk to **/api/auth/** and keep the session fresh.
- `useEntityMap()` – composable that exposes the entity mapping and helpers `getRegardingTypeOptions()`, `getEntityMeta()`; drives the “Regarding” dropdown, autocomplete, and OData payloads. Extend the map here when you add new entities.

---

## API Client

`src/api/crm.ts` is a typed wrapper around **fetch** that automatically:

1. Prefixes every request with the back‑end base URL (`import.meta.env.VITE_API_URL`).
2. Sets `credentials: "include"` so the NTLM session cookie is sent.
3. Parses JSON and returns `{ ok, data, status }`.

| Helper                                                | Purpose                                              |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `searchEntity(type, q, top?)`                         | Generic fuzzy search (`/api/crm/search`).            |
| `searchSystemUsers(term)`                             | Returns dropdown options for the owner autocomplete. |
| `createTask(payload)`                                 | `POST /api/crm/activities`                           |
| `updateTask(id, payload)`                             | `PATCH /api/crm/activities/:id`                      |
| `updateTaskDates(id, {scheduledstart, scheduledend})` | Drag/resize PATCH helper                             |
| `getTaskNotes(activityId)`                            | `GET /api/crm/activities/:id/notes`                  |
| `addTaskNote(activityId, payload)`                    | `POST /api/crm/activities/:id/notes`                 |

---

## Dates & Localization

- Back‑end sends **ISO 8601 UTC** strings.
- `toJalali()` helper (Intl API) renders Persian dates; all OData filters stay Gregorian.
- FullCalendar is fed Gregorian dates but displays Jalali UI via `fa` locale + RTL.

## Dashboard View

After sign‑in you land on **DashboardView.vue** – a FullCalendar‑powered agenda
in Jalali locale.

### Core features

| Feature                  | How it works                                                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Week agenda**          | RTL, drag‑and‑drop & resize to adjust start/end.                                                                                                                                                                                                                                                            |
| **Event renderer**       | `HH:mm – HH:mm ✓ title` with a coloured _priority dot_ (🔴 High, 🟡 Normal, 🟢 Low).                                                                                                                                                                                                                        |
| **Modals**               | • **CreateTaskModal** for new tasks. <br>• **EditTaskModal** for existing tasks with embedded **NoteList**.                                                                                                                                                                                                 |
| **Inline edits**         | Calendar updates (`eventDrop`,`eventResize`) PATCH `/api/crm/activities/:id` and trigger a refresh.                                                                                                                                                                                                         |
| **Alternate table view** | Press **T** or click **📋 جدول** in the toolbar to replace the calendar with a sortable Naive‑UI **DataTable** showing the same activities. Columns include Subject, Jalali start/end, Actual end, Owner, Seen flag, State & Activity type. Clicking a row (or the _Subject_ link) opens **EditTaskModal**. |
| **Filter drawer**        | 🔍 button opens **TaskFilterForm**; presets combine with the current calendar window.                                                                                                                                                                                                                       |
| **Refresh**              | **R** key or 🔄 button.                                                                                                                                                                                                                                                                                     |
| **Mini calendar**        | Jalali mini‑month on the right; selecting a day navigates the main calendar.                                                                                                                                                                                                                                |

### Keyboard Shortcuts

| Key (⇧ = Shift) | Action                   |
| --------------- | ------------------------ |
| **N**           | New task                 |
| **R**           | Refresh events           |
| **T**           | Toggle Calendar ↔ Table |
| **F**           | Open filter drawer       |
| **.**           | Jump to today            |
| **⇧ ← / ⇧ →**   | Previous / next period   |

_(Shortcuts ignore keypresses when focus is inside an input field.)_

---

## Building for Production

```bash
npm run build
# copy dist/ to NGINX, S3, or let the Express back‑end serve it
```

`vite.config.js` aliases `@/` → `src/` and proxies `/api/**` to the back‑end, so you can deploy both front‑end and API under the same domain.

---

## Testing

- **Unit:** Jest + Vue Test Utils (`npm test`)
- **E2E:** Cypress (`cypress/` folder)

---

## Contributing

1. Create a feature branch.
2. `npm run lint && npm test`.
3. Commit with Conventional Commits (`feat:`, `fix:` …) and open a PR.

---

## License

MIT © Gostaresh Co.
