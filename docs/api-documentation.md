# API reference

Interactive docs: run the backend and open **http://127.0.0.1:8000/api/docs/** (Swagger UI).

Errors always look like `{"error": {"code", "message", "details"}}`. Lists are `{results, count, page, page_size, total_pages}`. Send `Authorization: Bearer <access>`.

## Auth
`POST /api/auth/register/` - `verify-otp/` - `resend-otp/` - `login/` - `admin/login/` - `refresh/` - `logout/` - `me/` - `forgot-password/` - `reset-password/`

## Users
`GET|PUT /api/users/profile/` - `PUT /api/users/change-password/`

## Facilities
`GET /api/facilities/` (q, city, pincode, type, accepts, status, verified, lat, lng, radius_km, page) - `GET nearby/` - `GET geocode/?q=` - `GET {id}/` - `GET|POST {id}/reviews/`

## Devices
`GET categories/` - `GET brands/` - `GET /api/devices/` (reference data) - `POST estimate/` (public) - `POST analyze/` - `GET my/` - `POST recognize-image/` - `GET recommend/`

## Recycling
`GET|POST /api/recycling/requests/` - `GET requests/{id}/` - `GET requests/{id}/qr/` - `POST requests/{id}/cancel/`

## Rewards
`GET balance/` - `history/` - `coupons/` - `POST redeem/` - `GET my-coupons/` - `achievements/` - `leaderboard/` (public)

## Learning
`GET articles/` - `articles/{slug}/` - `POST articles/{slug}/read/` - `GET quizzes/` - `quizzes/{id}/` - `POST quizzes/{id}/submit/` - `GET attempts/` - `progress/` - `challenges/` - `POST challenges/{id}/join/`

## Dashboard / public
`GET /api/dashboard/summary/` - `dashboard/activity/` - `notifications/` (POST marks read) - `public/stats/`

## Admin (admin or super admin)
`dashboard/` - `reports/` (`?export=csv`) - `analytics/` - `users/` - `facilities/` - `device-reference/` - `recycling/` - `recycling/scan/` - `PUT recycling/{id}/status/` - `POST recycling/{id}/verify/` - `coupons/` - `ledger/` - `articles/` - `quizzes/` - `challenges/` - `settings/` - `notifications/broadcast/` - `logs/`
Super admin only: role changes, `PUT settings/`, `POST points/adjust/`.
