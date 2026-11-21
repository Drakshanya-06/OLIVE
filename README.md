# OLIVE - Smart E-Waste Locator & Recycling Rewards Platform

> Recycle Smart. Recover Value. Protect Tomorrow.

Full-stack academic project: **React (Vite + Tailwind)** frontend, **Django REST Framework** API, **MongoDB Atlas** via **PyMongo**.

```
ewaste/
├── frontend/   React app (pages, admin portal, design system)
├── backend/    Django REST API + MongoDB repository layer
├── docs/       overview, database design, API reference, checklist, deployment
└── render.yaml Render blueprint for the API
```

## Architecture in one minute
React calls the Django API with Axios and a JWT. Django validates the request, checks the role, and reads/writes MongoDB through **repositories** in `backend/database/`. Django's ORM, admin and sessions are **not** used, because they target SQL databases. Passwords use Argon2, tokens use PyJWT with refresh rotation, and OTPs are stored only as HMAC hashes.

## Quick start (Windows PowerShell)

### 1. Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```
Edit `backend\.env` yourself in VS Code (never paste secrets in chat or commit this file):

| Variable | What to put |
|---|---|
| `MONGO_URI` | Your Atlas connection string (or leave and set `MONGO_USE_MOCK=true` to try the app with a throw-away in-memory DB) |
| `DJANGO_SECRET_KEY` | A long random string |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | Gmail address + **App Password**. If empty, OTP codes are printed in the terminal |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Your admin login (min 8 chars, letters + numbers) |

Then:
```powershell
python manage.py setup_database      # collections, validators, indexes
python manage.py seed_demo           # SAMPLE facilities, placeholder material data, quizzes, coupons
python manage.py create_superadmin   # uses SUPERADMIN_* from .env
python manage.py runserver           # http://127.0.0.1:8000  (API docs: /api/docs/)
```
After creating the super admin, delete `SUPERADMIN_PASSWORD` from `.env`.

### 2. Frontend (second terminal)
```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev                          # http://localhost:5173
```
Vite proxies `/api` and `/media` to Django, so no CORS setup is needed in development.

### 3. Sign in
* Users: register at `/register` (OTP by email) then use the app.
* Admin: `/admin/login` with the super-admin credentials.

### Run the tests
```powershell
cd backend
$env:MONGO_USE_MOCK="true"
python manage.py test tests
```
Covers registration + OTP (invalid/expired), login/refresh rotation, role protection, facility search, analyzer, the full request -> QR scan -> verify -> reward -> redeem flow, duplicate-reward prevention, review rules, quiz scoring and upload validation.

## Honest-data rules built into the app
* Facilities seeded by `seed_demo` are **fictional sample records** (`verification_status = sample`) and shown with a "Sample data" badge. Replace them in **Admin > Facilities** with records from an official source and mark them *Verified* (a data source is mandatory).
* Material quantities in `seed_demo` are **placeholders** (`is_placeholder = true`). Replace them in **Admin > Device reference** with cited figures. Prices and environmental factors are in **Admin > Settings**.
* The analyzer always separates *estimated content*, *estimated recoverable* and *verified recovery* (the last is set only by an admin).
* Reward points are credited only when an admin verifies a request, exactly once (atomic claim + unique index).
* AI image recognition is optional (`ANTHROPIC_API_KEY`). Results are always labelled suggestions that the user must confirm; without a key the manual form works.

## Deployment
See `docs/deployment.md` (Vercel + Render + Atlas).

## Development status
See `docs/development-checklist.md`.
