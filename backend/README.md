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

---

## Main API Routes

| Method    | Path                                       | Purpose                              |
| --------- | ------------------------------------------ | ------------------------------------ |
| **POST**  | `/api/auth/login`                          | Authenticate & create session        |
| **GET**   | `/api/auth/user`                           | Current session user (if any)        |
| **POST**  | `/api/auth/logout`                         | End session                          |
| **GET**   | `/api/crm/activities/my`                   | Tasks owned by logged‑in user        |
| **POST**  | `/api/crm/activities`                      | **Create** task                      |
| **PATCH** | `/api/crm/activities/:id`                  | **Edit** task                        |
| **PATCH** | `/api/crm/activities/:id/update-dates`     | Update dates only (drag/resize)      |
| **GET**   | `/api/crm/activities/filter?owners=GUID,…` | Tasks for selected owners            |
| **GET**   | `/api/crm/search?type={entity}&q=foo`      | Generic **fuzzy search** (see below) |
| **GET**   | `/api/crm/entities/{set}`                  | Raw OData pass‑through               |
| **GET**   | `/api/crm/accounts/dropdown`               | Top 500 accounts (id + name)         |
| **GET**   | `/api/crm/systemusers/dropdown`            | Top 500 system users (id + fullname) |

Responses respect Dynamics Web API conventions (`value`, `@odata.nextLink`).

---

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

MIT © Gostaresh Co.
