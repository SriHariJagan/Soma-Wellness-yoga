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
- ngrok (for M-Pesa callback testing)

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
MPESA_CONSUMER_KEY=<your sandbox key>
MPESA_CONSUMER_SECRET=<your sandbox secret>
MPESA_PASSKEY=<your sandbox passkey>
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

### Step 5: Start ngrok (for M-Pesa callbacks)

```bash
ngrok http 5000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`) and update `.env`:

```env
MPESA_CALLBACK_URL=https://abc123.ngrok-free.app/api/mpesa/callback
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

### Step 9: Test M-Pesa Payment

1. Add items to cart
2. Proceed to checkout
3. Enter a Kenyan M-Pesa sandbox test number (e.g., `254708374149`)
4. Trigger STK Push
5. Complete sandbox payment on phone
6. Verify callback reaches your ngrok tunnel
7. Check MongoDB for payment status = `captured`
8. Verify order status = `completed`

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
MPESA_CALLBACK_URL=https://soma-wellness-yoga.onrender.com/api/mpesa/callback
MPESA_ENV=sandbox  ← Keep sandbox until explicitly ready for production
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
| `MPESA_ENV` | `sandbox` | `sandbox` | No |
| `MPESA_CONSUMER_KEY` | `<sandbox key>` | `<sandbox key>` | **Yes** |
| `MPESA_CONSUMER_SECRET` | `<sandbox secret>` | `<sandbox secret>` | **Yes** |
| `MPESA_SHORTCODE` | `174379` | `174379` | No |
| `MPESA_PASSKEY` | `<sandbox passkey>` | `<sandbox passkey>` | **Yes** |
| `MPESA_CALLBACK_URL` | `https://ngrok-url/api/mpesa/callback` | `https://soma-wellness-yoga.onrender.com/api/mpesa/callback` | No |
| `MPESA_INITIATOR_NAME` | `soma` | `soma` | No |
| `MPESA_SECURITY_CREDENTIAL` | `<sandbox credential>` | `<sandbox credential>` | **Yes** |
| `SMTP_HOST` | `smtp.gmail.com` | `smtp.gmail.com` | No |
| `SMTP_USER` | `<email>` | `<email>` | **Yes** |
| `SMTP_PASS` | `<app password>` | `<app password>` | **Yes** |

### Optional / Disabled

| Variable | Purpose | Required |
|----------|---------|----------|
| `RAZORPAY_KEY_ID` | Disabled (Razorpay removed) | No |
| `RAZORPAY_KEY_SECRET` | Disabled | No |
| `RAZORPAY_WEBHOOK_SECRET` | Disabled | No |
| `GOOGLE_CLIENT_ID` | OAuth (leave empty to disable) | No |
| `GOOGLE_CLIENT_SECRET` | OAuth | No |
| `FACEBOOK_APP_ID` | OAuth | No |
| `FACEBOOK_APP_SECRET` | OAuth | No |
| `WHATSAPP_DEV_MODE` | WhatsApp bypass | No |

---

## M-Pesa Callback Configuration

M-Pesa cannot reach `http://localhost:5000`. For local development, you need a public HTTPS tunnel.

### Using ngrok

```bash
# Terminal 1: Start backend
node server/server.js

# Terminal 2: Start ngrok
ngrok http 5000
```

Copy the HTTPS URL and update `.env`:

```env
MPESA_CALLBACK_URL=https://YOUR-NGROK-DOMAIN.ngrok-free.app/api/mpesa/callback
```

### Verify Callback Reachability

```bash
curl -X POST https://YOUR-NGROK-DOMAIN.ngrok-free.app/api/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Expected: `{"ResultCode":0,"ResultDesc":"Accepted"}`

---

## Troubleshooting

### "Payment timed out"

1. Verify `MPESA_CALLBACK_URL` is publicly reachable (use ngrok)
2. Check ngrok terminal for incoming callbacks
3. Check server logs for STK callback processing
4. Verify `MPESA_SECURITY_CREDENTIAL` is set (required for query fallback)

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
- M-Pesa stays in `sandbox` mode until explicitly switched to production
