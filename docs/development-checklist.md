# Development checklist

## Done and tested (backend: 11 automated tests; frontend: production build)
- [x] Project structure, env templates, Render blueprint, Vercel rewrite
- [x] MongoDB connection, repository layer, validators and indexes, seed + superadmin commands
- [x] Registration, OTP verify/resend, login, refresh rotation, logout, forgot/reset password, lockout, throttling
- [x] Profile, change password, theme
- [x] Facilities: search, nearby, geocode (OpenStreetMap Nominatim), filters, reviews, admin CRUD + verification
- [x] Device analyzer: model/category estimates, three-level separation, configurable formula, optional AI suggestion, disposal tips
- [x] Recycling requests, uploads, QR, status workflow, admin scan + verify, duplicate-reward protection
- [x] Rewards ledger, balances, coupons, redemption, achievements, leaderboard
- [x] Learning: articles, quizzes, challenges, progress; admin CRUD
- [x] User dashboard with charts; notifications
- [x] Admin portal (all 10 routes), reports, CSV export, audit log, settings
- [x] Light/dark theme, responsive layouts

## To do by you (needs your accounts/data)
- [ ] Add MongoDB Atlas URI and email credentials to `backend/.env`
- [ ] Replace SAMPLE facilities with verified real records from an official source
- [ ] Replace placeholder material figures, prices and environmental factors with cited values
- [ ] Replace placeholder testimonials on the home page
- [ ] Browser-test every page against your live data (the code was built and API-tested, but not click-tested in a browser)
- [ ] Store uploads on durable storage before production (Render's disk is ephemeral): Cloudinary or S3
- [ ] Deploy (see deployment.md)
