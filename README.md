# Scrunchies By The Bunch

Production-ready, mobile-first D2C e-commerce for handmade scrunchies and hair accessories.

Stack:

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Axios, Framer Motion
- **Backend:** FastAPI, SQLAlchemy, Alembic, Pydantic, PostgreSQL
- **Infra:** Redis (OTP/rate limits), Celery (payment expiry + async work), S3-compatible or local uploads, Docker, Nginx

```
Internet → Nginx → React (static) + FastAPI
                        ↓
                 PostgreSQL + Redis
                        ↓
              Object storage + SMTP email
```

---

## Prerequisites

- Node.js 22+
- Python 3.12+ (3.14 works with current wheels)
- PostgreSQL 16+
- Redis 7+
- Docker + Docker Compose (optional but recommended)
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) for SMTP

---

## 1. Clone and configure environment

```bash
cd /path/to/Task
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Notes |
|---|---|
| `SECRET_KEY` | Long random string |
| `CSRF_SECRET` | Different long random string |
| `DATABASE_URL` | `postgresql+asyncpg://sbtb:sbtb@localhost:5432/sbtb` |
| `REDIS_URL` | `redis://localhost:6379/0` |
| `SMTP_EMAIL` | `sbtb.vasudharanade@gmail.com` |
| `SMTP_APP_PASSWORD` | Gmail App Password (never commit) |
| `FRONTEND_URL` | `http://localhost:5173` |
| `BACKEND_URL` | `http://localhost:8000` |
| `CORS_ORIGINS` | `http://localhost:5173` |

Never put real secrets in `.env.example` or the frontend.

---

## 2. PostgreSQL and Redis

### Local (Homebrew example)

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
createuser -s sbtb || true
createdb -O sbtb sbtb || true
psql -d postgres -c "ALTER USER sbtb WITH PASSWORD 'sbtb';"
```

### Docker only for data services

```bash
docker compose up -d db redis
```

---

## 3. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Load env from repo root
export $(grep -v '^#' ../.env | xargs)

alembic upgrade head
python -m app.cli.bootstrap seed
python -m app.cli.bootstrap create-admin --email you@example.com --name "Store Admin"
# You will be prompted for a password if --password is omitted
```

Run API:

```bash
cd backend
source .venv/bin/activate
export $(grep -v '^#' ../.env | xargs)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional Celery worker (payment expiry every minute):

```bash
cd backend
source .venv/bin/activate
export $(grep -v '^#' ../.env | xargs)
celery -A app.tasks.celery_app.celery_app worker --beat --loglevel=info
```

API docs: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

Health: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Vite proxies `/api` and `/uploads` to the backend.

---

## 5. Gmail SMTP / App Password

1. Enable 2-Step Verification on the Gmail account.
2. Create an App Password at https://myaccount.google.com/apppasswords
3. Put it in `.env` as `SMTP_APP_PASSWORD=`
4. Keep `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`

Emails are sent only from the backend. In development, if SMTP is unset, OTP codes are logged server-side (never in production).

---

## 6. First admin (no public admin signup)

```bash
cd backend
source .venv/bin/activate
export $(grep -v '^#' ../.env | xargs)
python -m app.cli.bootstrap create-admin --email admin@example.com --name "Admin"
```

Then log in on the storefront and open `/admin`.

Configure **Settings → UPI ID / QR / payment instructions** before taking real orders. Do not invent business payment details in code.

---

## 7. Customer journey

Splash → Welcome → Signup/Login → Email OTP → Home/Shop → Product → Cart → Checkout → Address → UPI payment (20‑minute **server** window) → Submit UTR → Admin verifies → Processing → Order history

Guest browsing is allowed. Cart and checkout require a verified account.

---

## 8. Manual UPI payment rules

- Backend creates a pending order, reserves stock, and stores `expires_at`.
- Frontend countdown is display-only; refresh does **not** reset the timer.
- “I Have Paid” + UTR moves the order to verification pending (screenshot optional, never proof).
- Admin Approve → stock consumed, order Processing, confirmation email.
- Admin Decline / expiry → reserved stock released; decline email sent when declined.
- Payment service is abstracted (`ManualUPIPaymentService`) for a future Razorpay adapter.

---

## 9. Tests

Backend:

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

---

## 10. Production build (without full Docker)

```bash
# Backend
cd backend
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run build
# Serve dist/ behind Nginx (see infra/nginx/nginx.conf)
```

---

## 11. Docker Compose

```bash
cp .env.example .env
# fill secrets + SMTP
docker compose up --build
```

Services:

- `db` – PostgreSQL
- `redis` – Redis
- `api` – FastAPI (+ migrations on start)
- `worker` – Celery worker/beat
- `frontend` – Nginx SPA on port 5173→80

Create admin after API is up:

```bash
docker compose exec api python -m app.cli.bootstrap create-admin --email admin@example.com
docker compose exec api python -m app.cli.bootstrap seed
```

PostgreSQL and Redis are not publicly required beyond mapped local ports; do not expose them on the public internet in production.

---

## 12. Nginx / HTTPS notes

Use [`infra/nginx/nginx.conf`](infra/nginx/nginx.conf) as a starting point:

- Serve the React `dist` build
- Proxy `/api` and `/uploads` to FastAPI
- Terminate TLS with Let’s Encrypt / your cloud load balancer
- Set `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` or `lax` as appropriate for your domain layout
- Restrict `CORS_ORIGINS` to your real storefront origin

---

## 13. Backups and monitoring

- Nightly `pg_dump` of PostgreSQL (or managed automated backups)
- Redis is ephemeral (OTP/rate limits); no durable business data there
- Keep object storage versioning/backups for product images
- Hit `/api/v1/health` from uptime monitoring
- Ship structured logs; never log passwords, OTPs, tokens, or SMTP secrets
- Review admin audit logs for payment approvals/declines

---

## 14. Project layout

```
frontend/          React storefront + admin UI
backend/           FastAPI modular monolith
  app/api/v1/      Versioned REST routes
  app/models/      SQLAlchemy models
  app/services/    Business logic
  app/cli/         Admin bootstrap + seed
  alembic/         Migrations
infra/nginx/       Production Nginx sample
assets/            Brand logo + Instagram reference
docker-compose.yml Local/prod-ish stack
.env.example       Safe placeholders only
```

---

## 15. Security highlights

- Argon2id passwords
- HttpOnly session cookies + CSRF double-submit for mutations
- Redis-backed OTP hashes with expiry/attempt limits
- Server-authoritative pricing and inventory
- RBAC (`CUSTOMER` / `ADMIN`) enforced in FastAPI
- Upload MIME/size validation
- Generic auth error messages
- No secrets in the React bundle

---

## Brand notes

Visual identity is derived from the provided logo (dusty rose organic blob, soft blush ivory, ink line art) and Instagram product photography (pastel satins, grass flat lays). Replace `frontend/src/assets/logo.png` with a transparent/vector logo when available.

Support email used for transactional mail: `sbtb.vasudharanade@gmail.com` (configured via env, not hardcoded passwords).
