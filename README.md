# ShramSetu

**A marketplace for verified contract manpower** — connecting companies on greenfield / EPC
project sites with verified labour contractors across Andhra Pradesh and South India.

Built with Next.js 14 (App Router, TypeScript), Prisma, and Tailwind CSS. Runs on SQLite out of
the box (zero setup) and can switch to Postgres for serverless hosting.

---

## What it does

| Role | Capabilities |
|------|--------------|
| **Company** | Profile, post job requirements (multi-trade lines), see matched/verified contractors, receive & compare bids, shortlist/accept → engagement |
| **Contractor** | Firm profile + statutory details, workforce records, upload verification documents (CLRA licence / GST / PAN / ID), get matched to jobs, bid |
| **Admin** | Moderate & approve contractors, review documents, grant **verified** badge, suspend accounts, configure platform fee, view analytics + audit log |

**Core safety model — "verified exchange":**
- Contact details (phone/email) stay **private** until a company accepts a bid and an **engagement** is created.
- Once engaged, both parties get a **private in-app chat** — readable only by the two parties (and admin). Verified via automated tests.
- Contractors carry a **verified badge** only after an admin reviews their labour licence / GST / PAN.
- A **platform fee** is modelled and shown on every engagement (default 3%) for transparency.

---

## Run locally

```bash
npm install
cp .env.example .env        # then edit AUTH_SECRET (see below)
npm run db:push             # create the SQLite schema
npm run db:seed             # load demo data
npm run dev                 # http://localhost:3000
```

Generate a real auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# paste into AUTH_SECRET in .env
```

### Demo logins (from the seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@shramsetu.in` | `Admin@12345` |
| Company | `company@demo.in` | `Demo@12345` |
| Contractor | `contractor@demo.in` | `Demo@12345` |

### Useful scripts

```bash
npm run build      # prisma generate + next build (the "no errors" gate)
npm run start      # production server
npm run db:reset   # wipe + reseed
node scripts/smoke.mjs   # 24 runtime checks (server must be running)
```

---

## Deploy

### Quickest public link tonight — Cloudflare Tunnel (₹0, no account)
Exposes this machine's app at a public `https://*.trycloudflare.com` URL. Live only while both
processes (and the PC) stay running. Great for a pilot; use a real host below for 24/7.

```bash
# 1) build + start the app (terminal 1)
npm run build && npm run start

# 2) expose it (terminal 2) — prints your public https URL
#    one-time: download cloudflared.exe from
#    https://github.com/cloudflare/cloudflared/releases/latest
./cloudflared.exe tunnel --url http://localhost:3000
```

The app already allowlists `*.trycloudflare.com` for server actions, so forms work over the tunnel.

### Option A — Container host (Render / Railway / Fly.io / VPS) — keeps SQLite
A `Dockerfile` is included. Mount a **persistent volume** at `/app/data` and `/app/prisma`
so the SQLite DB and uploaded documents survive deploys. Set env vars: `AUTH_SECRET`,
`PLATFORM_NAME`, `PLATFORM_FEE_PERCENT`.

### Option B — Vercel + Postgres (serverless)
Vercel's filesystem is ephemeral, so use a managed Postgres (Neon / Supabase free tier):
1. In `prisma/schema.prisma`, change `provider = "sqlite"` → `provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string (with `?sslmode=require`).
3. Note: document uploads need object storage (S3 / Cloudflare R2) on serverless — the local
   disk upload works on Option A but not on Vercel. (See "Roadmap" below.)
4. `npx prisma db push` against the Postgres DB, then deploy.

Host the database in an **India (Mumbai)** region for latency + data residency (DPDP Act).

---

## What is intentionally NOT live yet (be honest with users)

- **Real money / online platform fee collection.** Collecting a platform fee or splitting
  payments between parties in India requires a registered business entity + a payment-aggregator
  merchant account (Razorpay Route / Cashfree Easy Split) with KYC and RBI PA-compliance. The fee
  is **modelled and displayed** but **no payment code charges anyone**. Flip it on from Admin →
  Settings once a merchant account is connected. See the checklist on that page.
- **Real SMS/WhatsApp OTP + notifications.** Auth is email + password today; mobile is collected
  but OTP verification and SMS/WhatsApp delivery need a provider (MSG91 / Gupshup / Resend). In-app
  notifications work now.
- **Automated KYC.** Contractor licences are admin-reviewed manually (the right call for v1);
  Aadhaar/PAN/GST API verification is a later add-on.

## Roadmap (next)

- Object storage (S3 / R2) for document uploads so serverless hosting works.
- Razorpay onboarding + fee collection; WhatsApp notifications.
- SMS OTP, saved searches, featured listings, contractor analytics.
- Multi-language (Telugu / Hindi).

---

## Architecture

```
Next.js App Router (TypeScript, server actions + RBAC)
  ├─ /app            routes: marketing, auth, company, contractor, admin, engagements
  ├─ /components     UI + forms
  ├─ /lib            auth (jose+bcrypt), db (prisma), matching, uploads, settings, notify
  ├─ /prisma         schema + seed
  └─ middleware.ts   edge auth gating
Prisma → SQLite (default) | Postgres (prod option)
```

Security: signed httpOnly JWT sessions, server-side role checks on every action, Zod validation,
private signed access to uploaded documents, audit log for admin actions.
