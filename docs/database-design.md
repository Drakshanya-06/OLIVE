# Database design (MongoDB, PyMongo)

All collections are created with validators and indexes by `python manage.py setup_database` (`backend/database/indexes.py`). References use `ObjectId`.

| Collection | Purpose | Key fields | Important indexes |
|---|---|---|---|
| users | Accounts | name, email, phone, password_hash, role, is_verified, is_active, theme, failed_logins | email (unique) |
| otp_verifications | Email/reset OTPs | email, purpose, otp_hash, attempts, expires_at | TTL on expires_at |
| token_blacklist | Revoked refresh tokens | jti, expires_at | jti unique, TTL |
| facilities | Collection points | name, facility_type, address, city, pincode, latitude, longitude, accepted_categories, operating_status, verification_status, data_source, is_sample, rating_avg | city, pincode, text |
| device_materials | Reference data | category, brand/model (+ normalised keys), materials_mg, recovery_rate, data_source, is_placeholder, is_category_default | (category, brand_key, model_key) unique |
| devices | A user's analysed devices | user_id, category, brand, model, condition, analysis (snapshot), status | user_id + created_at |
| recycling_requests | Requests | request_code, qr_token, user_id, device_id, facility_id, method, status, status_history[], estimated_points, final_points, reward_credited, verified_materials_mg | request_code, qr_token unique |
| reward_transactions | Immutable ledger | transaction_id, user_id, recycling_request_id, challenge_id, type, points (signed), status | transaction_id unique; one `earn` per request (partial unique); one `bonus` per challenge |
| reward_balances | Fast balance | user_id, available, total_earned, redeemed | user_id unique |
| coupons | Redeemable rewards | title, code, points_cost, stock, expires_at, active | code unique |
| notifications | In-app notifications | user_id, type, title, message, is_read | user_id + created_at |
| educational_articles | Learning articles | slug, title, category, content, published | slug unique |
| quizzes / quiz_attempts | Quizzes and scores | questions[{question, options, correct_index}], pass_mark / score, percent, passed | slug unique |
| article_reads | Reading progress | user_id, article_id | unique pair |
| challenges / challenge_participants | Monthly challenges | type, target, bonus_points, dates / progress, completed | unique (challenge, user) |
| facility_reviews | Ratings | facility_id, user_id, request_id, rating | request_id unique |
| achievements / user_achievements | Badges | key, criteria, threshold / achievement_key | unique |
| admin_logs | Audit trail | admin_id, action, target_type, detail | created_at |
| system_settings | Admin-editable settings | key=`platform`, values{prices, rates, factors} | key unique |

## Reward integrity
1. `verify_and_credit` claims the request with `find_one_and_update({reward_credited != true, status in [approved, collected]})`. Only one caller can win.
2. The ledger insert has a partial unique index on `recycling_request_id` for `type = earn`.
3. Balance is changed with `$inc` after the ledger row exists. Redemption debits with a conditional update (`available >= cost`), so concurrent clicks cannot overspend.
