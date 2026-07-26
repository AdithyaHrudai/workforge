# ShramSetu

**A marketplace for verified contract manpower** — connecting companies on greenfield / EPC
project sites with verified labour contractors across Andhra Pradesh and South India.

Built with Next.js 14 (App Router, TypeScript), Prisma, and Tailwind CSS, on PostgreSQL.

**🌐 Live:** https://shramsetu-sigma.vercel.app — deployed on **Vercel** (app) + **Neon** (Postgres).

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

Needs a PostgreSQL database. Easiest: create a free **Neon** branch (or run Postgres in Docker)
and put its URLs in `.env`.

```bash
npm install
cp .env.example .env        # set DATABASE_URL + DIRECT_URL (Postgres) and AUTH_SECRET
npm run db:push             # create the schema
npm run db:seed             # load demo data
npm run dev                 # http://localhost:3000
```

Generate a real auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# paste into AUTH_SECRET in .env
```

### Demo logins (from the seed)

`npm run db:seed` generates a **random password per run** and prints it once — no
credentials are hardcoded in this repo. Save what it prints, or choose your own:

```bash
SEED_ADMIN_PASSWORD='…' SEED_DEMO_PASSWORD='…' npm run db:seed
```

The seed is **destructive** (it truncates every table) and refuses to run against
anything that isn't `localhost` unless you pass `ALLOW_DESTRUCTIVE_SEED=1`.

### Creating or rotating the admin on a real database

Never seed production. Use the non-destructive provisioning script, which touches
exactly one row and **revokes all existing sessions** for that account:

```bash
npm run admin:create                        # prompts, generates a strong password
ADMIN_EMAIL=you@company.in npm run admin:create
```

### Useful scripts

```bash
npm run build      # prisma generate + next build (the "no errors" gate)
npm run start      # production server
npm run db:migrate # create + apply a migration in development
npm run db:deploy  # apply pending migrations (production / CI)
npm run db:reset   # drop, re-migrate, reseed (local only)
node scripts/smoke.mjs   # 24 runtime checks (server must be running)
```

---

## Deploy (current: Vercel + Neon)

The app is live on **Vercel** (https://shramsetu-sigma.vercel.app) with a **Neon** Postgres
database. Document uploads are stored in the DB (`Document.data`), so no object storage is needed.

**Environment variables** (set in the Vercel project, all environments): `DATABASE_URL` (Neon
pooled), `DIRECT_URL` (Neon direct), `AUTH_SECRET`, `PLATFORM_NAME`, `PLATFORM_FEE_PERCENT`.

**One-time DB setup** (from a machine with the Neon URLs in `.env`):
```bash
npm run db:deploy        # apply migrations to Neon
npm run admin:create     # provision the admin account
```

> ⚠️ Do **not** run `npm run db:seed` against a deployed database — it truncates
> every table. It is guarded to refuse non-local databases for that reason.

**Redeploy** (the dir is already linked via `.vercel/`):
```bash
npx vercel deploy --prod --token <YOUR_TOKEN> --scope <YOUR_SCOPE>
# or, after `vercel login`:  npx vercel --prod
```

Tip: host the Neon database in an India-adjacent region (Singapore / Mumbai) for latency and DPDP
data-residency. A `Dockerfile` is also included if you ever move to a container host (point it at
the same Postgres `DATABASE_URL`).

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

- Razorpay onboarding + fee collection; WhatsApp notifications.
- SMS OTP, saved searches, featured listings, contractor analytics.
- Move document storage to object storage (S3 / R2) if upload volume grows (currently in-DB).
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
