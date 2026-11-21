# OLIVE - Project Overview

**Problem:** people do not know where to take old electronics, what is inside them, or why improper disposal harms health and the environment.

**Solution:** a platform that locates facilities, estimates recoverable materials, tracks verified recycling requests and rewards users with points, plus learning content, challenges and a full admin portal.

## Roles
| Role | Can do |
|---|---|
| Guest | Home, awareness, facility map, quick estimate, learning articles |
| User | Analyzer (saved), recycling requests + QR, rewards, quizzes, challenges, dashboard |
| Admin | Review/approve/collect/verify requests, manage facilities, device data, learning content, coupons, users |
| Super Admin | Everything above + change roles, platform settings, manual point adjustments |

## Request lifecycle
`submitted -> under_review -> approved -> collected -> verified -> completed` (also `rejected`, `cancelled`).
Verification (admin, usually by scanning the QR) credits points once and moves the request to `verified`.

## Security summary
Argon2 password hashing - JWT access (15 min) + rotating refresh tokens with server-side revocation - OTP hashed, 10-minute expiry, 5 attempts, resend cooldown - login lockout after 5 failures - DRF throttling on auth/OTP/upload/AI/geocode - role-based permissions on every admin route - validated and re-encoded image uploads - input sanitising - atomic balance changes - unique indexes against duplicate rewards.
