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

| Package                         | Why it’s here                                     |
| ------------------------------- | ------------------------------------------------- |
| **vue @ 3**                     | Core reactive UI                                  |
| **vite @ 5**                    | Fast dev server + production bundler              |
| **vue-router @ 4**              | SPA routing (`/dashboard`, `/accounts/:id`, …)    |
| **pinia**                       | Store modules (user, metadata, toast)             |
| **naive-ui**                    | Component library (forms, dialogs, notifications) |
| **fullcalendar @ 6** + plugins  | Calendar view with drag‑and‑drop                  |
| **moment** + **moment‑jalaali** | Date handling and Jalali conversion               |
| **axios**                       | HTTP client (with credentials)                    |
| **mitt**                        | Tiny event bus for cross‑component messages       |

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
- `moment‑jalaali` patches Moment so **FullCalendar** shows Jalali dates while internal logic stays Gregorian.
- Custom directive `v‑jalali` renders readable Jalali timestamps in components.

## Dashboard View

- The default landing page after signing in is **DashboardView.vue**, built around **FullCalendar 6** in Jalali locale.

  - **Week agenda** layout with RTL support, drag‑and‑drop + resize to adjust start/end.
  - Custom event renderer shows “HH:mm – HH:mm ✓ title” and a coloured bar based on CRM entity.
  - Clicking an event opens **EditTaskModal**; selecting an empty slot opens **CreateTaskModal**.
  - **CreateTaskModal** – modal for new tasks; fields for subject, description, “regarding” (type & object), owner, priority, seen flag, and an optional first note (subject/text/file ≤ 330 KB). Converts Jalali date‑times to ISO and calls **/api/crm/activities** (and, if a note is present, **/api/crm/activities/:id/notes**) before refreshing the calendar.
  - **EditTaskModal** – opens when an existing event is clicked; pre‑loads task data, includes a read‑only “last owner” field, allows updating subject, description, “regarding”, owner, priority, seen flag, and start/end dates. Hosts **NoteList** to view existing annotations and add a new note (subject, text, optional file ≤ 330 KB). Saves via **/api/crm/activities/:id** and triggers `refetchEvents()` on success.
  - **NoteList** – embedded in **EditTaskModal**; renders a scrollable table of annotations (subject, text, creator, Jalali date) and a paper‑clip link that streams `/api/crm/notes/{id}/download` if an attachment is present.
  - Calendar updates (`eventDrop`,`eventResize`) PATCH **/api/crm/activities/:id** and automatically `refetchEvents()` on success.
  - Top‑right _Logout_ button calls `auth.logout()` then routes to **/login**.

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
