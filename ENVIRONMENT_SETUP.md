# Environment Setup Guide

## Architecture Overview

```
Root .env              ← Primary config (shared frontend + backend)
├── .env.development   ← Vite frontend overrides (dev mode)
├── .env.production    ← Vite frontend overrides (production build)
├── .env.example       ← Safe template (tracked in git)
server/
├── .env.development   ← Backend overrides (NODE_ENV=development)
└── .env.production    ← Backend overrides (NODE_ENV=production)
```

**Loading order** (earlier wins, never overrides platform-injected vars):
1. Root `.env` → loaded by Vite (frontend) and `server/loadEnv.js` (backend)
2. `server/.env.{NODE_ENV}` → loaded by `server/loadEnv.js` based on `NODE_ENV`
3. `server/.env` → legacy fallback (deprecated)

---

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local via Docker or cloud)
- ngrok (for Pesapal IPN testing)

### Step 1: Copy Environment Template

```bash
cp .env.example .env
```

### Step 2: Fill in Required Values in `.env`

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/soma_wellness
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate same way>
REDIS_URL=redis://127.0.0.1:6379
PESAPAL_ENV=sandbox
PESAPAL_CONSUMER_KEY=<your sandbox consumer key>
PESAPAL_CONSUMER_SECRET=<your sandbox consumer secret>
PESAPAL_IPN_ID=<registered sandbox IPN id>
PESAPAL_CALLBACK_URL=http://localhost:5173/payment/return
```

### Step 3: Start Redis

```bash
# Docker (recommended)
docker run -d --name soma-redis -p 6379:6379 redis:7-alpine

# Verify
docker exec -it soma-redis redis-cli ping
# Expected: PONG
```

### Step 4: Start MongoDB

```bash
# If using local MongoDB
mongod --dbpath /path/to/data

# Or use MongoDB Atlas (set MONGO_URI in .env)
```

### Step 5: Start ngrok (for Pesapal IPN)

```bash
ngrok http 5000
```

Register the HTTPS URL as your Pesapal sandbox IPN (dashboard form or
`POST /api/URLSetup/RegisterIPN`), then update `.env`:

```env
PESAPAL_IPN_ID=<ipn id returned by Pesapal>
```

### Step 6: Start Backend

```bash
node server/server.js
# or
npm run dev  # from server/ directory
```

### Step 7: Start Frontend

```bash
npm run dev
```

### Step 8: Open Application

```
http://localhost:5173
```

### Step 9: Test Pesapal Payment (sandbox)

1. Add items to cart
2. Proceed to checkout
3. Click Pay — you are redirected to the Pesapal sandbox checkout
4. Complete the sandbox test payment (test card `4005519200000004`, exp `12/2026`, CVV `123`)
5. Pesapal redirects back to `/payment/return` and triggers your IPN URL
6. Verify the IPN reaches your server (directly or via ngrok tunnel)
7. Check MongoDB for payment status = `captured`
8. Verify order status = `completed` and invoice `INV-*` exists

---

## Production

### Render (Backend)

Set environment variables in Render dashboard:

```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...
REDIS_URL=redis://default:password@host:port
JWT_SECRET=<production secret>
JWT_REFRESH_SECRET=<production secret>
FRONTEND_URL=https://somawellness.in
CORS_ORIGINS=https://somawellness.in,https://www.somawellness.in
PESAPAL_ENV=sandbox  ← Keep sandbox until explicitly ready for production
PESAPAL_IPN_ID=<production IPN id>
PESAPAL_CALLBACK_URL=https://somawellness.in/payment/return
```

### Vercel (Frontend)

Set environment variable in Vercel dashboard:

```
VITE_API_URL=https://soma-wellness-yoga.onrender.com
```

**Important:** Vite bakes `VITE_*` vars into the build at compile time. After changing them, you must redeploy.

---

## Environment Variables Reference

### Shared (Frontend + Backend)

| Variable | Local | Production | Secret |
|----------|-------|------------|--------|
| `NODE_ENV` | `development` | `production` | No |
| `PORT` | `5000` | `5000` | No |

### Frontend Only (Vite)

| Variable | Local | Production | Secret |
|----------|-------|------------|--------|
| `VITE_API_URL` | `http://localhost:5000` | `https://soma-wellness-yoga.onrender.com` | No |

### Backend Only

| Variable | Local | Production | Secret |
|----------|-------|------------|--------|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/soma_wellness` | `mongodb+srv://...` | **Yes** |
| `REDIS_URL` | `redis://127.0.0.1:6379` | `redis://default:pass@host:port` | **Yes** |
| `JWT_SECRET` | `<generated>` | `<production>` | **Yes** |
| `JWT_REFRESH_SECRET` | `<generated>` | `<production>` | **Yes** |
| `FRONTEND_URL` | `http://localhost:5173` | `https://somawellness.in` | No |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | `https://somawellness.in,...` | No |
| `PESAPAL_ENV` | `sandbox` | `sandbox` → `production` at cutover | No |
| `PESAPAL_API_URL` | _(default sandbox)_ | _(default production)_ | No |
| `PESAPAL_CONSUMER_KEY` | `<sandbox key>` | `<production key>` | **Yes** |
| `PESAPAL_CONSUMER_SECRET` | `<sandbox secret>` | `<production secret>` | **Yes** |
| `PESAPAL_IPN_ID` | `<sandbox IPN id>` | `<production IPN id>` | No |
| `PESAPAL_NOTIFICATION_ID` | _(alias for IPN id)_ | _(alias for IPN id)_ | No |
| `PESAPAL_CALLBACK_URL` | `http://localhost:5173/payment/return` | `https://somawellness.in/payment/return` | No |
| `SMTP_HOST` | `smtp.gmail.com` | `smtp.gmail.com` | No |
| `SMTP_USER` | `<email>` | `<email>` | **Yes** |
| `SMTP_PASS` | `<app password>` | `<app password>` | **Yes** |

### Removed gateways (historical records only — no runtime config)

| Variable | Status |
|----------|--------|
| `MPESA_*` | Removed (M-Pesa Daraja retired) |
| `RAZORPAY_*` | Removed (Razorpay retired) |
| `WHATSAPP_*` (Cloud API) / `OTP_*` / `AT_*` | Removed (WhatsApp Cloud API + OTP retired; password + email-reset auth retained) |
| `WHATSAPP_DISPLAY_PHONE` / `WHATSAPP_NUMBER` / `VITE_WHATSAPP_*` | Contact number for wa.me chat links (optional; falls back to site default) |

### Optional / Disabled

| Variable | Purpose | Required |
|----------|---------|----------|
| `PESAPAL_BRANCH` | Multi-branch accreditation label | No |
| `PESAPAL_TIMEOUT_MS` | Provider HTTP timeout (default 30000) | No |
| `PAYMENT_EXPIRY_MINUTES` | Intent expiry window (default 30) | No |
| `PAYMENT_RECONCILE_INTERVAL_MS` | Reconciliation cadence (default 300000) | No |
| `GOOGLE_CLIENT_ID` | OAuth (leave empty to disable) | No |
| `GOOGLE_CLIENT_SECRET` | OAuth | No |
| `FACEBOOK_APP_ID` | OAuth | No |
| `FACEBOOK_APP_SECRET` | OAuth | No |

---

## Pesapal IPN Configuration

Pesapal cannot reach `http://localhost:5000`. For local development, you need a public HTTPS tunnel so the sandbox can deliver IPN calls.

### Using ngrok

```bash
# Terminal 1: Start backend
node server/server.js

# Terminal 2: Start ngrok
ngrok http 5000
```

Register the HTTPS URL as a Pesapal sandbox IPN (dashboard IPN form or
`POST https://cybqa.pesapal.com/pesapalv3/api/URLSetup/RegisterIPN`) and
store the returned `ipn_id` as `PESAPAL_IPN_ID` in `.env`.

### Verify IPN Reachability

```bash
curl "https://YOUR-NGROK-DOMAIN.ngrok-free.app/api/pesapal/ipn?OrderTrackingId=test&OrderMerchantReference=test&OrderNotificationType=IPNCHANGE"
```

Expected: HTTP 200 with an `orderNotificationType` JSON body. (Unknown
tracking ids are acknowledged without state changes.)

---

## Troubleshooting

### "Payment timed out"

1. Verify the Pesapal IPN URL is publicly reachable (use ngrok for local dev)
2. Check ngrok terminal for incoming IPN calls
3. Check server logs for IPN processing (`PesapalCtrl`)
4. Use `POST /api/admin/payments/reconcile` to re-check a stuck `pending` payment

### Redis "Command timed out"

1. Ensure Redis is running: `redis-cli ping`
2. Check `REDIS_URL` in `.env` matches your Redis instance
3. Local Redis should be `redis://127.0.0.1:6379`

### CORS errors

1. Ensure `FRONTEND_URL` matches your actual frontend URL
2. For local dev: `http://localhost:5173`
3. For production: `https://somawellness.in`

### "Failed to fetch" in frontend

1. Check `VITE_API_URL` in `.env`
2. For local dev: `http://localhost:5000`
3. For production: `https://soma-wellness-yoga.onrender.com`
4. Redeploy Vercel after changing `VITE_*` vars

---

## Security Notes

- **Never commit `.env` files** containing real secrets
- `.env.example` is the ONLY tracked env file (contains placeholders only)
- Rotate all secrets if they were ever committed to git history
- Use Render/Vercel dashboard for production secrets (not files)
- Pesapal stays in `sandbox` mode (`PESAPAL_ENV=sandbox`) until explicitly switched to production
