# CRM‑005 — Dynamics 365 Full‑Stack Integration

A bilingual (Persian / English) Dynamics 365 solution:

- **Back‑end** – Node + Express proxy secured with NTLM & LDAP, exposing a clean REST layer (`/api/**`) and minimal EJS pages for login/error.
- **Front‑end** – Vue 3 + Vite SPA, RTL ready, built around FullCalendar 6 and Naive‑UI.
- **Shared core** – Centralised entity/field definitions in `src/core/resources.js` so both tiers speak the same language.

---

## Repo Layout

```
.
├── backend/        # Express API + NTLM/LDAP + Dynamics proxy
├── frontend/       # Vue 3 SPA (Vite, Pinia, Naive‑UI, FullCalendar)
├── src/core/       # Field constants, status codes, helpers (imported by both tiers)
├── docs/           # Extra markdown (metadata queries, option‑set dumps)
└── README.md       # you are here
```

---

## Quick Start (Local Dev)

```bash
git clone https://github.com/Gostaresh/CRM-005.git
cd CRM-005

# 1. Back‑end
cd backend
cp .env.example .env          # set CRM_URL, DOMAIN, SESSION_SECRET …
npm i
npm run dev                   # http://localhost:3000

# 2. Front‑end (new terminal)
cd ../frontend
cp .env.example .env          # set VITE_API_URL if needed
npm i
npm run dev                   # http://localhost:5173
```

Log in with the preset **`GOSTARESH\ehsntb / Ss12345`** credentials (dev only).

---

## Feature Highlights

| Layer         | Highlights                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Back‑end**  | NTLM + LDAP auth, session cookies, CORS whitelist, PM2 config, dynamic form generation from CRM metadata, fully typed controllers (`activities`, `notes`, `accounts`, `search`, …). |
| **Front‑end** | RTL Jalali calendar, drag‑&‑resize tasks, modals for create/edit, `NoteList` with file download, Pinia stores, axios‑style `crmFetch` wrapper.                                      |
| **Core**      | One source of truth for entity names, field constants, status/state codes, language codes, plus helpers `getStatusLabel()` / `getStateLabel()`.                                     |

---

## Localisation

- All server ⇄ browser dates travel as **ISO 8601 UTC**.
- UI shows **Jalali** via `moment‑jalaali`.
- Field labels, state & status codes translate on‑the‑fly using `LanguageCodes.ENGLISH | PERSIAN`.

---

## Deployment

1. Push to `main`.
2. SSH into server and run `./deploy.sh` (pulls changes & restarts PM2).  
   _Back‑end serves `/dist/` when you run `npm run build` in `frontend/`._

---

## Contributing

- Fork → feature branch.
- `npm run lint && npm test` for both tiers.
- Follow Conventional Commits (`feat:`, `fix:` …).
- Update docs in `docs/` and READMEs.

---

## License

MIT © Gostaresh Co.
