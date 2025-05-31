# CRM-005 – Backend (Node/Express + Dynamics 365)

This folder contains the Node/Express API that powers the Vue 3 SPA located in `frontend/`.  
It authenticates users via NTLM against on‑prem Dynamics 365 and exposes a clean JSON REST layer under `/api/**`.

---

## Quick Start

```bash
cd backend
cp .env.example .env          # set CRM_URL, SESSION_SECRET, DOMAIN, etc.
npm install
npm run dev                   # nodemon + NTLM proxy on port 3000
```

The Vue SPA (`frontend/`) expects the backend on **http://localhost:3000** in development.  
CORS for the Vite dev server is enabled via `cors()` in `src/index.js`.

## NPM Scripts (`backend/package.json`)

| Script    | Command                                                                         | What it does                                                                                                         |
| --------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **dev**   | `NODE_TLS_REJECT_UNAUTHORIZED=0 nodemon --openssl-legacy-provider src/index.js` | Starts the API in watch‑mode (hot reload) and ignores self‑signed HTTPS warnings—ideal for local Dynamics endpoints. |
| **start** | `node src/index.js`                                                             | Launches the production server (used by PM2 on the VPS).                                                             |
| **test**  | `jest`                                                                          | Runs the backend unit test suite.                                                                                    |

## Key Dependencies

| Package                           | Reason we need it                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **express @ 5.x**                 | Core web‑server—v5 beta brings native Promises & async middleware.                                      |
| **express‑session**               | Cookie‑backed session store for NTLM credentials.                                                       |
| **axios‑ntlm**                    | Sends NTLM‑auth HTTP requests to Dynamics 365 Web API.                                                  |
| **ldapjs**                        | Verifies Windows credentials via LDAP bind before CRM lookup.                                           |
| **cors**                          | Whitelists front‑end origins during local dev & production.                                             |
| **ejs** + **express‑ejs‑layouts** | Lightweight server‑rendered views for login & error pages.                                              |
| **multer**                        | Handles `multipart/form-data` uploads for note attachments.                                             |
| **winston**                       | Structured logging with daily rotation via `error.log` / `info.log`.                                    |
| **jalaali-js** (utility)          | Tiny converter used by `utils/date.js`; most Jalali/Gregorian work now relies on the built‑in Intl API. |

## Environment & Configuration (`src/config/env.js`, `src/config/entityMap.json`)

`env.js` centralises required environment variables, validates them at startup, and converts comma‑separated CORS origins into an array.  
It exports:

```js
module.exports = {
  crmUrl, // Dynamics 365 Web API base
  domain, // Windows domain for NTLM
  port, // Express listen port (default 3000)
  vue, // Vite dev origin
  vue_preview, // Production preview origin
  nodeEnv, // "development" | "production"
};
```

`entityMap.json` powers the generic search endpoint.  
Each logical entity maps to its CRM set name plus id & display columns, e.g.:

```json
{
  "account": { "set": "accounts", "display": "name", "id": "accountid" }
}
```

Controllers and services import this map to build `$select` lists and fuzzy queries.

## Utility Helpers (`src/utils/crypto.js`, `src/utils/logger.js`)

| File          | Purpose                                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **crypto.js** | AES‑256‑GCM helper providing `encrypt(text)` and `decrypt(cipher)`, keyed by `SESSION_SECRET`, so passwords in the session are never stored plain.                                             |
| **logger.js** | Winston config shared app‑wide. Logs **INFO** to `info.log`, **ERROR** to `error.log`, and in development also streams to the console with timestamps and the current username when available. |

## Server Boot Sequence (`src/index.js`)

`src/index.js` is the single entry‑point that wires the Express server together.  
Key steps—in the exact order they run—are:

1. **Body parsing** – `express.json()`, `express.urlencoded()`, and a fallback `express.raw()` are each capped at **20 MB** to prevent abuse.
2. **Session** – `express-session` uses `SESSION_SECRET`; cookies are set `sameSite:"lax"` and the `secure` flag is auto‑detected via `cookieSecure()` so deployments behind HTTPS proxies Just Work™.
3. **CORS** – a lone `cors()` middleware now whitelists all three origins in one go:

   ```js
   app.use(
     cors({
       origin: [env.vue, env.vue_preview, "http://192.168.1.22"],
       credentials: true,
     })
   );
   ```

4. **Session debug logger** – when `NODE_ENV !== "production"` the active session object is printed to the console, making it trivial to inspect NTLM credentials locally.
5. **Views** – EJS with `express-ejs-layouts` renders HTML pages; a small helper captures each rendered view and injects it into `layouts/main.ejs`.
6. **Static assets** – everything under `src/public/` is served from the site root, keeping file paths consistent between dev and prod.
7. **Service initialisation** – heavy helpers can be instantiated once and placed on `app.locals` (currently commented out).
8. **Routes** – `routesFactory()` attaches UI pages first, then mounts the `/api/**` routers.
9. **Error handling** – the final `errorMiddleware` turns any uncaught exception into consistent JSON (for XHR) or an HTML error page.

> **Heads‑up**: The three original `cors()` calls have been folded into the single block above. Make sure your env file sets `VUE` and `VUE_PREVIEW` correctly; otherwise the browser will see CORS errors.

---

## Environment Variables

| Var              | Description                                                       |
| ---------------- | ----------------------------------------------------------------- |
| `CRM_URL`        | Dynamics Web API base, e.g. `http://crm-server/org/api/data/v9.1` |
| `DOMAIN`         | Windows domain for NTLM                                           |
| `SESSION_SECRET` | Secret for express‑session                                        |
| `VUE`, `VUE_`    | Allowed CORS origins (dev & prod)                                 |
| `PORT`           | Optional – defaults to **3000**                                   |

---

## Folder Structure

```
backend/
 ├─ src/
 │   ├─ controllers/        # business logic per feature
 │   ├─ routes/             # Express routers (api/auth, api/crm, …)
 │   ├─ services/           # low‑level CRM + NTLM helpers
 │   ├─ config/             # env and entityMap.json
 │   ├─ middleware/         # auth, error, session logger
 │   └─ core/               # metadata utilities
 └─ README.md               # you are here
```

---

## Authentication Flow

1. **POST `/api/auth/login`** — user submits `DOMAIN\username` & password.  
   The password is encrypted and stored in the session so later CRM calls can replay NTLM.
2. Any `/api/crm/**` route requires the session cookie (enforced by `authMiddleware`).
3. **POST `/api/auth/logout`** destroys the session.

### Implementation Details

| File                              | Responsibility                                                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **controllers/authController.js** | Validates login payload, calls `authService.authenticate`, stores the encrypted password and user object in the session, returns `{ user }` on success.                     |
| **services/authService.js**       | Performs the heavy lifting: LDAP bind to verify credentials, then Dynamics 365 `/systemusers` lookup via NTLM. Returns a sanitised user object or throws a user‑safe error. |
| **middleware/authMiddleware.js**  | Guards protected routes. For API calls, returns JSON `401`; for page requests, redirects to `/`. Logs every unauthorised attempt.                                           |

---

## Route Reference

### UI pages

| Method  | Path         | Description                                                |
| ------- | ------------ | ---------------------------------------------------------- |
| **GET** | `/`          | Login page (redirects to **/dashboard** if session exists) |
| **GET** | `/dashboard` | Main dashboard (requires session)                          |
| **GET** | `/logout`    | Destroy session and return to login                        |

### API – Authentication (`/api/auth`)

| Method   | Path               | Description                         |
| -------- | ------------------ | ----------------------------------- |
| **POST** | `/api/auth/login`  | Authenticate user, start session    |
| **POST** | `/api/auth/logout` | End session, clear cookie           |
| **GET**  | `/api/auth/me`     | Return currently authenticated user |

### API – Activities (`/api/crm/activities`)

| Method    | Path                                           | Description                            |
| --------- | ---------------------------------------------- | -------------------------------------- |
| **GET**   | `/api/crm/activities/all`                      | All tasks user can see                 |
| **GET**   | `/api/crm/activities/my`                       | Tasks owned by logged‑in user          |
| **GET**   | `/api/crm/activities/filter?owners={GUID,...}` | Tasks for selected owners              |
| **GET**   | `/api/crm/activities/regarding-options`        | Lookup metadata for Regarding dropdown |
| **GET**   | `/api/crm/activities/:activityId`              | Task details                           |
| **POST**  | `/api/crm/activities`                          | Create new task                        |
| **PATCH** | `/api/crm/activities/:activityId/update-dates` | Drag/resize update                     |
| **PATCH** | `/api/crm/activities/:activityId`              | Edit task                              |

### API – Notes

| Method   | Path                                    | Description              |
| -------- | --------------------------------------- | ------------------------ |
| **GET**  | `/api/crm/activities/:activityId/notes` | List notes for activity  |
| **POST** | `/api/crm/activities/:activityId/notes` | Add note (optional file) |
| **GET**  | `/api/crm/notes/:noteId/download`       | Download note attachment |

### API – Accounts

| Method  | Path                         | Description        |
| ------- | ---------------------------- | ------------------ |
| **GET** | `/api/crm/accounts`          | Paginated accounts |
| **GET** | `/api/crm/accounts/dropdown` | Top 500 id + name  |

### API – Entities & Search

| Method  | Path                                  | Description                |
| ------- | ------------------------------------- | -------------------------- |
| **GET** | `/api/crm/entities/:entity`           | Raw OData pass‑through     |
| **GET** | `/api/crm/search?type={entity}&q=foo` | Fuzzy search across entity |

### API – Metadata (`/api/meta`)

| Method  | Path                     | Description                                                                                       |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| **GET** | `/api/meta/task/filters` | Returns Task fields (picklists, booleans, lookups, dates) plus option‑sets for the dynamic filter |

### API – Users

| Method  | Path                            | Description            |
| ------- | ------------------------------- | ---------------------- |
| **GET** | `/api/crm/users/me`             | Current logged‑in user |
| **GET** | `/api/crm/systemusers/dropdown` | System user dropdown   |

---

## CRM Controllers

Each controller in `src/controllers/crm/` owns a single slice of Dynamics 365 functionality.  
They are thin HTTP wrappers that delegate heavy work to `CrmService` while enforcing
request‑level validation and building clean JSON responses.

| File                                      | Responsibility                                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **controllers/crm/activityController.js** | All task/appointment logic: list (all / my / by owners), get details, create, drag‑resize update, full edit, “Regarding” dropdown. |
| **controllers/crm/accountController.js**  | Lists accounts with pagination and supplies a trimmed dropdown (id + name) used by dialogs.                                        |
| **controllers/crm/noteController.js**     | CRUD for annotation notes: list, add (JSON or `multipart/form-data`), stream attachment download.                                  |
| **controllers/crm/entityController.js**   | Generic OData passthrough for ad‑hoc entities (read & create).                                                                     |
| **controllers/crm/userController.js**     | Returns current CRM user (`/users/me`) and a dropdown of system users (top 500).                                                   |
| **controllers/crm/searchController.js**   | Entity‑agnostic fuzzy search powered by `config/entityMap.json`.                                                                   |

## Core Resources (`src/core/resources.js`)

A single file that centralises **all** entity constants, field names, status/state codes and helper functions for label localisation.

| Group                                 | Example                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **StateCode**                         | `{ ACTIVE: 0, INACTIVE: 1 }`                                                                                  |
| **EntityNames**                       | `'account', 'contact', 'new_department', 'activitypointer'`                                                   |
| **AccountFields / ContactFields / …** | Strongly‑typed field constants that extend a shared `CommonFields` object.                                    |
| **ActivityPointer & SystemUser**      | Rich “entity definition” objects used by `crmService` to build `$select` lists and expansions.                |
| **StatusCodes**                       | Maps entity → status reason integers (e.g. `IN_PROGRESS: 2`).                                                 |
| **getStatusLabel / getStateLabel**    | Helper functions that return a language‑specific label given a code plus `LanguageCodes.ENGLISH` / `PERSIAN`. |

> Any file—controller or service—can import these constants to avoid hard‑coding magic strings.

## CRM Service (`src/services/crmService.js`)

A **thin wrapper** around the Dynamics 365 Web API (NTLM) that hides all HTTP details from controllers.

| Method                                              | Purpose                                                                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `_getEntityColor`                                   | Caches and returns the colour defined in Dynamics metadata for an entity type (used to theme calendar items).               |
| `fetchEntity`                                       | Generic GET helper supporting `$select,$filter,$orderby,$top,$skip,$expand`, custom `Prefer` headers and `@odata.nextLink`. |
| `fetchActivities`                                   | Lists tasks (optionally filtered) and augments each item with `seen` and themed `color`.                                    |
| `fetchActivityDetails`                              | Reads a single task, resolves polymorphic “regarding” lookup, owner names, last owner shadow column, annotations.           |
| `fetchPaginatedAccounts`                            | Shared pagination helper for the accounts grid.                                                                             |
| `createEntity`                                      | Generic POST that handles both `201` and `204` responses, plus follow‑up lookup when `OData‑EntityId` header is missing.    |
| `updateTaskDates` / `updateTask`                    | PATCH helpers used by drag‑resize and full‑edit forms.                                                                      |
| `fetchOwnerName`                                    | Resolves a GUID first against `systemusers`, then `teams`.                                                                  |
| `fetchAccounts` / `fetchContacts`                   | Bulk dropdown helpers (up to 2 000 rows with formatted‑value annotations).                                                  |
| `fetchNotes` / `fetchNoteAttachment` / `createNote` | CRUD helpers for task annotations (attachments).                                                                            |

Each public method expects `credentials = { username, password }` (decrypted from the session) and automatically prefixes the Windows **DOMAIN** (`env.domain`) when performing NTLM requests.

For read‑only field metadata the backend exposes an auxiliary **metaService.js** which feeds the `/api/meta` routes.

### Generic Search Endpoint

```
GET /api/crm/search?type=lead&q=mah&top=20
```

- `type` — key from **config/entityMap.json** (`account`, `contact`, …)
- `q`    — minimum **2 chars**; case‑insensitive `contains()` filter
- `top`  — max rows (default 20)

**entityMap.json**

```json
{
  "account": { "set": "accounts", "display": "name", "id": "accountid" },
  "contact": { "set": "contacts", "display": "fullname", "id": "contactid" },
  "lead": { "set": "leads", "display": "subject", "id": "leadid" },
  "opportunity": {
    "set": "opportunities",
    "display": "name",
    "id": "opportunityid"
  }
}
```

Add new entities by inserting one line—no code changes required.

---

## Dates & Localization

- All incoming/outgoing datetimes use **ISO 8601 UTC** (`2025-05-17T09:30:00.000Z`).
- The Vue layer converts to/from **Jalali** for Persian UI.

---

## Logging

- `utils/logger.js` (Winston) emits **INFO** for each CRM call and **DEBUG** session data in dev.
- Errors bubble through `errorMiddleware` → JSON HTTP 500.

---

## Contributing

1. Create a feature branch.
2. Run `npm run lint` and ensure tests pass (`npm test`).
3. Open a PR; GitHub Actions will build backend & frontend.

---

## License
