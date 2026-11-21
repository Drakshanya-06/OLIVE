# Deployment

## 1. MongoDB Atlas
Network Access: add Render's outbound IPs (or temporarily `0.0.0.0/0` while testing, then tighten). Use a dedicated database user with read/write on the `olive` database only.

## 2. Backend on Render
1. Push the repo to GitHub (the `.env` file is git-ignored).
2. Render > New > Blueprint (uses `render.yaml`) or create a Web Service with root `backend`.
3. Build: `pip install -r requirements.txt && python manage.py collectstatic --noinput`  - Start: `gunicorn config.wsgi:application`
4. Environment variables: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS=<your-api>.onrender.com`, `CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app`, `FRONTEND_URL`, `MONGO_URI`, `MONGO_DB_NAME`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, optional `ANTHROPIC_API_KEY`.
5. In the Render shell run once: `python manage.py setup_database`, `python manage.py create_superadmin` (set `SUPERADMIN_*` temporarily), and optionally `seed_demo`.

## 3. Frontend on Vercel
Root directory `frontend`, framework Vite, build `npm run build`, output `dist`.
Environment: `VITE_API_URL=https://<your-api>.onrender.com/api` and `VITE_MEDIA_URL=https://<your-api>.onrender.com`.
`vercel.json` already rewrites all routes to `index.html`.

## Troubleshooting
* **CORS error** - `CORS_ALLOWED_ORIGINS` must exactly match the Vercel URL (no trailing slash).
* **Cannot reach MongoDB** - check Atlas Network Access and that the password in `MONGO_URI` is URL-encoded.
* **OTP email not arriving** - use a Gmail App Password; check spam; without SMTP settings codes print in the server log.
* **Uploads disappear after redeploy** - Render's disk is ephemeral; move uploads to Cloudinary/S3.
* **First request slow** - free Render instances sleep when idle.
