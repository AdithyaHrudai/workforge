# WorkForge

India's contract-manpower marketplace. Companies post contract-staffing
requirements; verified manpower contractors respond. Next.js 14 (App Router,
TypeScript) · Prisma · PostgreSQL · Tailwind.

---

## Running it

One command does everything — Docker, container, migrations, server, browser:

```bash
npm run go              # dev server with hot reload
npm run go -- --prod    # production build, then serve
npm run go -- --seed    # reseed first (wipes rows)
npm run stop            # kill the server and stop the container
```

`START.bat` in the project root does the same on a double-click.

Ctrl-C stops it. If a server is ever left holding port 3000, `npm run go`
kills it on the next start, or `npm run stop` clears it immediately.

The lower-level commands still exist:

```bash
npm run db:local        # switch .env to local Postgres, migrate, seed
npm run build           # prisma generate + next build — the "no errors" gate
npm run start           # next start, assumes everything else is already up
```

`npm run db:local -- --restore` switches back to the hosted Neon database
(saved in `.env.hosted.bak`).

### Test credentials

| Where | Who | Password |
|---|---|---|
| `/login` | `rajesh@meridiantyres.in` (company, has live data) | `demo12345` |
| `/login` | `vikram@navyaindustrial.in` (contractor) | `demo12345` |
| `/login` | `imran@unifiedworkforce.in` (contractor, pending approval) | `demo12345` |
| `/admin/login` | `admin` (SUPER_ADMIN) | `AdminDemo12345` |

### Tests

```bash
node scripts/smoke.mjs                                        # 53 route + access-control checks
ADMIN_USERNAME=admin ADMIN_PASSWORD='…' node scripts/admin-e2e.mjs   # 29 admin security checks
```

Both need a running server. There is no unit-test framework yet.

---

## Gotchas that will waste your time

- **Stop the server before `npm run build`.** A running Next process holds
  `query_engine-windows.dll.node` and `prisma generate` fails with `EPERM`.
  If it persists, kill stray `node` processes.
- **Docker Desktop stops on its own.** The container has
  `--restart unless-stopped`, but if the *engine* is down the app 500s on every
  page. Check `docker info` first when things break inexplicably.
- **The hosted database is in Singapore, ~450ms per round trip.** Anything that
  feels slow against Neon is latency, not code. Local Docker is ~1ms.
- **`.env` is gitignored and is the only place secrets live.** Never commit it.

---

## Architecture

```
app/
  (auth)/           login, register            — marketplace
  admin/            login + (panel)/*          — SEPARATE auth, see below
  company/          dashboard, requirements, search
  contractor/       dashboard, feed, proposals, clients, documents
  contractors/      PUBLIC directory + firm profiles (SEO surface)
  engagements/      awarded work, messaging, reviews
  actions/          server actions, one module per domain
lib/                domain logic — matching, search, validation, auth, audit
prisma/             schema, migrations, seed
middleware.ts       edge auth gate + per-request nonce CSP
```

There is **no separate API layer**. Mutations are server actions; only two REST
route handlers exist (`/api/documents/[id]`, `/api/engagements/[id]/messages`).

### Two independent auth systems

This is the most important structural fact.

| | Marketplace | Admin console |
|---|---|---|
| Table | `User` | `AdminUser` |
| Cookie | `wf_session` | `wf_admin` |
| Module | `lib/auth.ts` | `lib/admin-auth.ts` |
| Roles | COMPANY, CONTRACTOR | SUPER_ADMIN, VERIFIER, … |

They share nothing. Signing into one does **not** grant the other. There is no
`requireRole("ADMIN")` path any more — do not reintroduce one.

Marketplace credentials are managed at `/account` (name, mobile, password, sign
out everywhere) and recovered through `/forgot-password` → `/reset-password`.
Both those links and `/verify-email` are single-use hashed tokens in `AuthToken`
(`lib/tokens.ts`); `User.tokenVersion` is bumped on every password change, which
is what makes a reset actually evict an attacker's session. With no email
provider configured the links are printed to the server log instead of sent.

`app/admin/layout.tsx` deliberately holds no auth (the login page lives under
it); the gate is `app/admin/(panel)/layout.tsx`.

---

## Domain rules that the code enforces

Four contract categories, and the category drives everything downstream:

| Category | Company specifies | Contractor quotes |
|---|---|---|
| White-collar staffing | roles + headcount | rate per person / month |
| Blue-collar staffing | roles + headcount | rate per person / month |
| **Job contract** | scope + **output target** | per tonne / unit / lump sum |
| Unskilled supply | roles + headcount | rate per person / month |

**A job contract never carries a headcount.** The company buys an outcome; how
many people to deploy is the contractor's commercial call. This is enforced in
`lib/validation.ts`, not just hidden in the form.

**Roles are free text.** The catalogue in `lib/constants.ts` is a convenience,
not a constraint — a company may type any job title. Validation only rejects a
role code belonging to a *different* category's catalogue.

Contractors are judged on two things, both searchable: their **published client
list** (which plants, which states, how many people, since when) and **five
rating parameters** filed by companies after each engagement.

---

## Conventions

- **Comments explain *why*, never *what*.** The existing ~170 JSDoc blocks set
  the bar; match it. Note the non-obvious decision, not the obvious mechanic.
- **Validate every input with Zod** in `lib/validation.ts`. Server actions parse
  before touching data.
- **Authorisation is re-proved at every layer** — middleware is a cheap first
  filter, never the access control itself. Pages and actions check again.
- **Gated data is masked server-side.** Never send a value to the browser and
  hide it with CSS (see `lib/contacts.ts`).
- **Privileged actions write an audit row.** `audit()` for marketplace users,
  `adminAudit()` for admins, `systemAudit()` for events with no actor. The log
  is append-only — there is no edit or delete path, by design.
- **Grids need a base column count.** `grid gap-4` with no `grid-cols-1` puts
  items in an implicit `auto` track that will not shrink, which overflows on
  phones. `globals.css` sets `grid-auto-columns: minmax(0, 1fr)` to catch this.
- No payment provider is integrated, deliberately. The schema carries dormant
  fee columns so a paid tier needs no migration.

---

## Known gaps

- **Document verification is manual.** An admin looks at the uploaded file and
  clicks approve. Nothing is checked against any government registry — PAN and
  GSTIN are format-checked only. Never describe this as "verified against
  government records".
- **The seed creates no documents**, so the verification queue renders empty.
- **Mobile numbers are collected but never verified** — no OTP provider is wired.
  `User.mobileVerified` exists and is reset when the number changes, so the flow
  has somewhere to land when one is.
- **Email addresses cannot be changed** in the app. Verification is tied to the
  address, so changing one has to re-verify it; support does it by hand today.
- **The legal pages are drafts.** `/privacy`, `/terms` and `/contact` are written
  against the DPDP Act and the IT Rules, but every entity detail is a placeholder
  in `lib/legal.ts` and the pages render a visible draft warning until they are
  filled in. The text has not been reviewed by a lawyer.
- **Account closure is a support action**, not a button. There is no self-service
  delete, which the DPDP Act's erasure right will eventually want.
- **Contact masking is off** (`Setting.contactMaskingEnabled`), so any signed-in
  company sees every contractor's phone and email. Deliberate launch posture —
  the quota machinery in `lib/contacts.ts` is built and dormant.
- No unit tests, no CI, no error monitoring.
- ESLint is declared in `package.json` but not installed.
- Statutory identifiers (PAN, GSTIN, licence numbers) are stored unencrypted.

# Important Instructions:
## Communication Style
Respond like a caveman. No articles, no filler words, no pleasantries. Short. Direct. Code speaks for itself.
## Token Usage
Use tokens wisely and avoid unnecessary verbosity. 
Build this web application platform like a professional product. Make it secure, scalable, and user-friendly. Reliable, fast. 
Like Naukri. Avoid unneccesary complexity. Keep it simple. And don't add further sample data profile examples like companies and contractor data in the app. Focus on core functionality and scalability. 
Read my stage-wise instructions carefully. Follow them strictly.