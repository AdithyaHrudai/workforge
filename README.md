# WorkForge

**India's contract manpower marketplace.** Companies post contract-staffing requirements;
verified manpower contractors respond. Built for plants, project sites and warehouses —
tyre, steel, power, cement, auto, pharma, warehousing and general manufacturing.

Next.js 14 (App Router, TypeScript) · Prisma · PostgreSQL · Tailwind CSS.

---

## The model

Contract manpower is not one thing, and the whole product is organised around that. A
requirement belongs to exactly one of four categories, and the category decides what the
company specifies, what the contractor quotes, and how the two are compared.

| Category | Company specifies | Contractor quotes |
|---|---|---|
| **White-collar temp staffing** | Roles + headcount (engineers, supervisors, executives) | Rate per person / month + headcount offered |
| **Blue-collar temp staffing** | Roles + headcount (operators, technicians, tradesmen) | Rate per person / month + headcount offered |
| **Job contract** | Scope of work + **output target** | Rate per tonne / unit / lump sum — **no headcount** |
| **Unskilled supply** | Roles + headcount (helpers, loaders, housekeeping) | Rate per person / month + headcount offered |

The job contract is the one that most systems get wrong. The company buys an outcome — 300
tonnes loaded per day, 18 mould changes per shift, a shutdown completed — and how many people
or machines to deploy is the contractor's commercial call. WorkForge therefore never asks for a
headcount on a job contract; the proposal schema for that category cannot carry one.

## How contractors are judged

Two signals, both of which the search filters and ranks on:

- **Their client list.** Every contractor publishes the companies they serve — plant, city,
  state, manpower deployed, since when. That is what tells a plant in Chhattisgarh who already
  has people on the ground there. Admins verify entries against work orders and mark them ✓.
- **Five rating parameters**, filed by the company after each completed engagement: timely
  deployment, statutory compliance, timely payment to workers, manpower quality, and
  supervision/responsiveness. Averages are denormalised onto the profile so search can rank on
  any of them without aggregating per query.

---

## What each role can do

### The public directory

`/contractors` and every firm profile at `/contractors/<id>` are readable **without an
account** and are indexed — they carry canonical URLs, per-firm metadata and
`Organization` JSON-LD, and they are listed in the sitemap. That is the growth surface: a
contractor can send their profile to a prospect, and a plant searching for "contract
manpower supplier in Raigarh" can land on one.

Phone and email are still gated. `resolveContractorContact` masks them whenever no
company is viewing, so a logged-out visitor sees the whole track record and none of the
contact details.

| Role | Capabilities |
|---|---|
| **Company** | Light registration (name, location, nature of business, sectors, contract types engaged — GST/PAN optional). Post requirements with a category-adaptive form. Search contractors by contract type, sector experience, presence states, worker source states, workforce strength, specialised scope and rating. Invite firms to quote. Compare proposals side by side with each firm's track record. Award → engagement. Rate on five parameters. |
| **Contractor** | Firm profile with per-category deployed strength, sectors, roles/scopes, presence states and worker source states. Publish a client list. Upload CLRA licence / EPF / ESIC / GST / PAN for verification. Matched requirement feed ranked by fit. Adaptive proposals. Engagements with messaging. |
| **Administrator** | A separate console at `/admin`, with its own sign-in and its own identity store — see below. Verifies the documents and declared details of both sides, and nothing else. |

### The verification console

Administrators are **not** marketplace users. They live in their own table (`AdminUser`), sign in
at `/admin/login` against a different cookie, and hold database-backed sessions rather than
tokens. Nothing reachable from public registration, login or password handling touches that
table, so no bug on the marketplace side can mint or escalate an administrator — and a
marketplace session, however well-formed, can never satisfy an admin check.

Their job is deliberately narrow: **verify the documents, details and IDs submitted by
contractors and companies.** Both sides upload; both sides get reviewed.

| | |
|---|---|
| **Sign in** | `/admin/login`, with the assigned username or the account's email. No self-service sign-up, no password reset, no hint about who the administrators are. Sessions last 8 hours, or 30 minutes idle. |
| **Queue** | `/admin` opens on what is waiting, oldest first — pending contractors, pending companies, unchecked documents. |
| **Review** | Per-firm pages showing the declared statutory details beside the uploaded documents, with a decision and a note that reaches the uploader. Every decision is stamped with who made it and when. |
| **Team** | `/admin/team`, super admins only. Issue an account by assigning a staff ID, username, access level and password; revoke access (which kills their live sessions on the spot); reset a password; force a sign-out; delete a revoked account. |
| **Trail** | `/admin/audit`. Sign-ins, failures, decisions and every document opened, filterable by person, action and date. |

**Two access levels.** A *verifier* can do verification work and nothing else. A *super admin* can
also manage the admin team and the platform settings. The first account provisioned is always a
super admin, because otherwise nobody could appoint anyone; after that the level is chosen when
the account is issued, and can be changed later.

**Privacy for both parties.** An administrator sees what a verification decision requires and no
more. They cannot read the private message threads between a company and a contractor, cannot
open an engagement, and cannot see agreed commercial terms — those paths are participants-only
and no admin branch exists in them. Documents are served from an admin-only route that records
every single view against the admin's name before a byte goes out, with `no-store` and a
sandboxed CSP. Opening a firm's review page is itself logged. Deleting an admin account never
deletes what it did: audit entries keep the actor's name and staff ID, frozen at the time of each
action.

**Guardrails.** Nobody can revoke, demote or delete themselves; the platform always retains at
least one active super admin; an account must be revoked before it can be deleted; and a newly
issued or administratively reset password must be changed at first sign-in, because until then
two people know it.

### Payments

There are none. WorkForge takes no commission and integrates no payment provider — companies
and contractors invoice each other directly through the GST system, which is how the trade
already works. The schema carries dormant fee columns and an admin `paymentsEnabled` flag so a
paid tier can be added later without a migration, but nothing in the product charges anyone.

Contact details are **open** today: any approved company sees a contractor's phone and email
immediately. Every reveal is still recorded in `ContactUnlock`, so if a paid tier arrives there
is already a usage history to meter against — flipping *Admin → Settings → contact masking*
turns on quotas with no schema change.

---

## Run locally

Needs PostgreSQL. Easiest is a free **Neon** branch, or Postgres in Docker.

```bash
npm install
cp .env.example .env        # set DATABASE_URL + DIRECT_URL and AUTH_SECRET
npm run db:deploy           # apply migrations
npm run db:seed             # load demo data (local databases only)
npm run dev                 # http://localhost:3000
```

Generate a real auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Demo logins

`npm run db:seed` generates a **random password per run** and prints it once — no credentials
are hardcoded in this repo. Save what it prints, or choose your own:

```bash
SEED_ADMIN_PASSWORD='…' SEED_DEMO_PASSWORD='…' npm run db:seed
```

The seed is **destructive** (it truncates every table) and refuses to run against anything that
isn't `localhost` unless you pass `ALLOW_DESTRUCTIVE_SEED=1`.

The demo data mirrors real scenarios: a tyre plant buying mould change on a job contract, a
warehouse paying per tonne, a steel plant hiring fitters on term staffing, a specialist
contractor running 300 people across two Yokohama sites, and a regional firm with deep presence
in Chhattisgarh.

### Provisioning the first administrator

There is no way to sign up for the console, which means an empty database needs exactly one
account created from a shell. After that, administrators are issued from `/admin/team` by another
administrator — the script is only for bootstrapping and for recovery when every super admin is
locked out.

It is non-destructive, touches exactly one row, and **revokes all existing sessions** for the
account, which is how you rotate a leaked credential.

```bash
npm run admin:create                      # prompts, and generates a strong password

ADMIN_USERNAME=priya ADMIN_EMAIL=priya@company.in \
ADMIN_NAME="Priya Nair" ADMIN_CODE=WF-ADM-002 \
ADMIN_ROLE=VERIFIER npm run admin:create  # non-interactive
```

The first account on an empty platform is always created as `SUPER_ADMIN`. The password is printed
once and stored only as a bcrypt hash — save it to a password manager and clear your shell
history. Then sign in at `/admin/login`.

### Scripts

```bash
npm run build       # prisma generate + next build (the "no errors" gate)
npm run start       # production server
npm run db:migrate  # create + apply a migration in development
npm run db:deploy   # apply pending migrations (production / CI)
npm run db:reset    # drop, re-migrate, reseed (local only)
npm run admin:create # provision or rotate an administrator (non-destructive)
npm run test:smoke  # status codes and access control, incl. admin/marketplace isolation
npm run test:e2e    # browser test of the marketplace flows
npm run test:admin  # browser test of the verification console

node scripts/smoke.mjs                              # ~35 route + access-control checks
SEED_DEMO_PASSWORD='…' node scripts/e2e.mjs         # Playwright flows through server actions
```

Both require a running server (`npm start`) and seeded data.

---

## Architecture

```
Next.js App Router (TypeScript, server actions + RBAC)
  ├─ app/
  │   ├─ (auth)/           login, register
  │   ├─ company/          dashboard, requirements, search, contractor profiles
  │   ├─ contractor/       dashboard, feed, proposals, clients, documents
  │   ├─ admin/            the verification console — separate sign-in, own chrome
  │   │   ├─ login/        public; the only unguarded route under /admin
  │   │   └─ (panel)/      everything behind requireAdmin(): queue, review, team, audit
  │   ├─ engagements/      awarded contracts, messaging, reviews
  │   └─ actions/          server actions, one module per domain area
  ├─ components/           UI primitives, cards, forms
  ├─ lib/
  │   ├─ constants.ts      the four categories, roles, industries, rating parameters
  │   ├─ validation.ts     Zod schemas, category-driven refinements
  │   ├─ matching.ts       contractor ↔ requirement scoring
  │   ├─ search.ts         the contractor search
  │   ├─ contacts.ts       contact visibility / reveal metering
  │   ├─ auth.ts           jose JWT sessions + bcrypt
  │   └─ ratelimit.ts      Postgres-backed fixed-window limiter
  ├─ prisma/               schema, migrations, seed
  └─ middleware.ts         edge auth gate + per-request nonce CSP
```

**Data model notes.** Multi-valued attributes (presence states, industries, categories, roles)
are Postgres `text[]` with GIN indexes, because the search filters on them with `hasSome`.
Every column used in a WHERE, ORDER BY or JOIN is indexed explicitly — Postgres does not index
foreign keys automatically and Prisma only indexes `@id`/`@unique`.

**Data protection.** Passwords are bcrypt hashes and `passwordHash` is referenced in exactly two
places — hashing at registration and comparison at login. It is never selected into a page, an
API response or a log line. Login compares against a dummy hash when the email is unknown, so a
missing account and a wrong password take the same time and the form cannot be used to enumerate
users.

Contractor phone and email are gated by `resolveContractorContact`; the masked strings are what
get serialised to the browser, so a gated contact is never sent and hidden with CSS. Uploaded
documents live in Postgres, are sniffed by magic number, and are returned under
`Content-Security-Policy: sandbox; default-src 'none'` so a script embedded in a crafted PDF has
no origin to act against. They are served by two separate routes: `/api/documents/[id]` to the
owner and nobody else, and `/api/admin/documents/[id]` to an administrator, which writes an
`ADMIN_DOC_VIEW` entry naming the admin and the document *before* the bytes go out. Two audiences
with different rules do not belong behind one branch — that is how an audit trail quietly
acquires a hole.

Admin oversight is itself accountable: opening a contractor or company review page, or running a
user search, writes an `ADMIN_VIEW_USER` entry that is highlighted on `/admin/audit`. The log is
append-only — there is no edit or delete path in the codebase, because a log an admin can rewrite
is not evidence of anything — and both foreign keys are `SetNull` with the actor's name frozen
into the row, so deleting an account cannot delete the evidence of what it did.

**Security.** Two independent identity systems that share no cookie, no token format and no
lookup path: signed httpOnly JWT sessions with a `tokenVersion` for the marketplace, and
opaque database-backed sessions for the admin console, stored only as a SHA-256 so a database
dump yields no usable session. Server-side authorisation in every action, not just in the
middleware — a layout check does not cover a server action, because the action is its own entry
point. Zod validation on every input; documents sniffed by magic number and served with the
detected type; Postgres-backed rate limiting plus a per-account lockout on the console; a
generic sign-in failure message that never says which half was wrong; `SameSite=Strict` and
`noindex`/`no-store` throughout `/admin`; per-request nonce CSP.

---

## Deploy

Vercel (app) + Neon (Postgres) is the current target. Document uploads live in the database
(`Document.data`), so no object storage is required.

**Environment variables:** `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `AUTH_SECRET`,
`NEXT_PUBLIC_SITE_URL`, `PLATFORM_NAME`.

**Email notifications** are optional. In-app notifications always work; set both
`RESEND_API_KEY` and `EMAIL_FROM` to also deliver the ones worth interrupting someone over
— proposals, invitations, awards, verification outcomes. Chat messages deliberately never
email. With either variable unset the whole path is inert: no provider call, not even a
user lookup, which is why development and the test suites need no credentials. Delivery is
best-effort and a failure is logged rather than thrown, so a provider outage can never roll
back the action that triggered it.

**One-time DB setup**, from a machine with the production URLs in `.env`:

```bash
npm run db:deploy        # apply migrations
npm run admin:create     # provision the first administrator
```

> ⚠️ Never run `npm run db:seed` against a deployed database — it truncates every table. It is
> guarded to refuse non-local databases for exactly this reason.

Host the database in an India-adjacent region (Mumbai / Singapore) for latency and DPDP data
residency. A `Dockerfile` is included if you move to a container host.

---

## Not built yet

- **Payments.** Deliberate — see above.
- **SMS / WhatsApp OTP.** Mobile numbers are collected, but OTP verification and SMS
  delivery need a provider (MSG91 / Gupshup) and are not wired. Email *is* wired — see
  below.
- **Automated KYC.** Licences and client-list entries are reviewed by an admin, which is the
  right call for v1. Aadhaar / PAN / GST API verification is a later add-on.
- **Multi-language.** English only today; Hindi and regional languages are a known gap for the
  contractor side.
