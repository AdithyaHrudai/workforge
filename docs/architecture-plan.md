# Manpower Marketplace — Architecture & Plan (Draft v0.1)

> A responsive web platform connecting companies that need contract labour fast
> (especially greenfield sites) with contractors who supply vetted manpower.
> Market: India. Model: job-posting + matching/bidding. Revenue: subscriptions.

_Status: DRAFT for client review. Sections marked **[CONFIRM]** need the client's input._

---

## 1. Vision & value proposition

Companies on greenfield/expansion sites often need skilled and unskilled labour at
short notice. Today they rely on word-of-mouth and brokers, which is slow and opaque.

- **For companies:** post a requirement, receive bids from verified contractors, compare
  on price / availability / mobilization time, and engage — fast, with no middlemen.
- **For contractors:** a steady stream of leads, a digital profile of their firm and
  workforce, and the ability to bid on jobs that match their trades and location.
- **For the platform (client):** subscription revenue from both sides, plus a data moat
  of contractors, workforce capacity, and job demand.

**North-star metric:** time-to-fill (hours from job posted → contractor accepted).

---

## 2. Users & roles

| Role | Who | Core needs |
|------|-----|-----------|
| **Company** | Builders, EPC firms, factories, project owners | Post requirements, review bids, shortlist, contact/engage contractors |
| **Contractor** | Labour-supply firms / individual contractors | Register firm + workforce, get matched, bid on jobs |
| **Worker** | Individual labourers | *No login.* Stored as records under a contractor |
| **Platform Admin** | The client / ops team | Moderate registrations, manage subscriptions, resolve disputes, view analytics |

> Workers are **data records owned by a contractor** (per our decision). The model is
> designed so workers could be given logins later without a rewrite.

---

## 3. Core flows

### 3.1 Contractor onboarding
1. Sign up with mobile (OTP) + email → choose role "Contractor".
2. Fill firm profile (see §5 field list).
3. Add workforce records (trades, counts, wages).
4. Submit → **admin moderates** → profile goes live.
5. Pick a subscription plan (or start on Free tier).

### 3.2 Company posts a requirement
1. Sign up → role "Company" → fill company profile.
2. Create a **Job Requirement**: trades needed, headcount per trade, skill level,
   location, start date, duration, wage/budget, accommodation, urgency.
3. Publish → system **matches** eligible contractors and notifies them.

### 3.3 Matching & bidding
1. System ranks contractors by **trade overlap, location/service radius, available
   capacity, mobilization time, rating** → notifies top matches (and lets others discover).
2. Contractor submits a **bid**: rate per worker/day, headcount they can supply,
   mobilization time, notes.
3. Company sees bids side-by-side, **shortlists**, and **accepts** one (or more).
4. On accept → contact details unlocked + an **Engagement** record is created.
5. (Phase 2+) ratings exchanged after the engagement.

### 3.4 Admin moderation
- Queue of pending contractor/company registrations and edits.
- Approve / reject / request-changes with reason.
- Flag/suspend abusive accounts; manage trade taxonomy and subscription plans.

---

## 4. Feature scope by phase

### Phase 1 — MVP (the buildable core)
- Auth: mobile OTP + email, role-based (Company / Contractor / Admin).
- Contractor registration + workforce management.
- Company registration + job requirement posting.
- Matching engine (rules-based) + contractor notifications.
- Bidding + shortlist + accept → contact unlock.
- Admin moderation panel + basic analytics.
- Subscription **gating** (plan limits enforced; billing can start manual/Razorpay).
- Notifications: SMS + email (transactional).

### Phase 2
- Automated Razorpay subscriptions + invoices.
- WhatsApp notifications (huge in India).
- Ratings & reviews; contractor "verified" badges.
- Advanced search/filter, saved searches, featured listings.
- Company & contractor dashboards (analytics).

### Phase 3 (later)
- Payments/escrow + commission option, attendance tracking.
- Automated KYC (Aadhaar/PAN/GST APIs).
- Native mobile app for contractors/workers.
- Multi-language (Hindi + regional).

---

## 5. Data model (key entities)

> Field lists below are my **draft for India** — **[CONFIRM]** the client's exact list,
> especially the contractor registration fields, since that's central to his ask.

### User
`id, name, mobile (unique, OTP-verified), email, passwordHash/authProvider, role, status, createdAt`

### Contractor (firm) profile
- **Identity:** firmName, entityType (proprietorship / partnership / Pvt Ltd / LLP),
  ownerName, primaryMobile, email, yearEstablished
- **Location:** address, city, district, state, pincode, **serviceAreas** (cities/states
  served), serviceRadiusKm, willingOutstation (bool)
- **Statutory (self-declared now):** PAN, GSTIN, **labour licence no.** (CLRA), ESIC no.,
  EPF no.
- **Capacity:** trades supplied (multi-select), total workforce size, currently available,
  typical mobilization time
- **Commercials:** indicative wage/rate per trade (optional), past clients/projects (optional)
- **Documents (optional upload):** PAN, GST cert, labour licence, ID — for admin review
- **System:** subscriptionPlan, rating, verifiedBadge, status, moderationNotes

### Worker (record under a contractor)
`id, contractorId, name, gender, age/DOB, trade, skillLevel (skilled/semi/unskilled),
yearsExperience, nativeState, mobile (optional), expectedDailyWage, certifications (optional),
availabilityStatus`

### Company profile
`companyName, entityType, industry, contactName, mobile, email, GSTIN/PAN (optional),
sites/locations[], status`

### Job Requirement
`id, companyId, title, lines[] (trade, headcount, skillLevel, wageOffered),
location(city/district/state/pincode), startDate, durationDays, shift,
accommodationProvided, foodProvided, urgency, description, status (open/closed/filled)`

### Bid
`id, jobId, contractorId, ratePerWorkerPerDay, headcountOffered, mobilizationTime,
notes, status (submitted/shortlisted/accepted/rejected), createdAt`

### Engagement
`id, jobId, contractorId, acceptedBid, status, createdAt` (+ ratings in Phase 2)

### SubscriptionPlan / Subscription
`plan(name, audience, price, limits{posts, bids, workforceSlots, featured}),
subscription(userId, planId, status, currentPeriodEnd, razorpayId)`

### Supporting
`Trade (taxonomy), Document, Notification, AdminAuditLog`

---

## 6. Subscription model (draft) **[CONFIRM pricing]**

| Audience | Free | Paid tier(s) |
|----------|------|--------------|
| **Contractor** | Limited bids/month, basic profile, capped workforce slots | More/unlimited bids, featured profile, unlimited workforce, priority in matching |
| **Company** | Limited active posts, limited contact unlocks | Unlimited posts, unlimited unlocks, priority support, analytics |

- Enforced via **plan limits** in code from day one (even if billing is manual at first).
- Phase 2: automated billing via **Razorpay Subscriptions** (India-native, UPI/cards/netbanking).

---

## 7. Technical architecture

**Stack:** Next.js (App Router, TypeScript, React) · Tailwind CSS + shadcn/ui ·
PostgreSQL + Prisma ORM · Auth.js (NextAuth) with mobile-OTP + email.

```
Browser (responsive web, PWA-ready)
        │  HTTPS
        ▼
Next.js app  ── App Router pages (Company / Contractor / Admin areas)
             ── Route handlers / server actions (API layer)
             ── Auth.js (sessions, RBAC by role)
             ── Service layer (matching, bidding, plan-limits, moderation)
                     │
        ┌────────────┼─────────────┬───────────────┐
        ▼            ▼             ▼               ▼
   PostgreSQL    Object store   Razorpay      Messaging
   (+ Prisma)    (S3 / R2 for   (subs/billing) (MSG91 SMS,
                  doc uploads)                  WhatsApp, email)
```

- **Matching engine:** rules-based scoring (trade match, distance, capacity, mobilization,
  rating) over Postgres with proper indexes; upgrade to a search service only if needed.
- **File storage:** AWS S3 or Cloudflare R2 for ID/licence uploads (private, signed URLs).
- **Notifications:** MSG91 or Twilio (SMS/OTP), WhatsApp Business (Gupshup/AiSensy) in P2,
  email via Resend or SES.
- **Hosting (cost-conscious):** Vercel **or** a VPS (Hetzner/DigitalOcean) + managed
  Postgres (Neon / Supabase / RDS). Single region (India/Mumbai) for latency + data residency.
- **Admin panel:** protected `/admin` routes within the same app.

**Repo layout (monorepo single app):**
```
/app            Next.js routes (marketing, auth, company, contractor, admin)
/components     UI components (shadcn/ui based)
/lib            services: matching, bidding, plans, auth, notifications
/prisma         schema + migrations + seed
/docs           this plan, API notes, decisions log
```

---

## 8. Security, privacy & compliance (India)

- **DPDP Act 2023:** explicit consent at signup, data minimization (store self-declared
  IDs only as needed; avoid full Aadhaar — prefer last-4 / masked), purpose limitation,
  deletion on request.
- Encryption in transit (TLS) and at rest; private object storage with signed URLs.
- RBAC on every server action; audit log for admin actions.
- OTP rate-limiting, input validation, and abuse/spam controls on job posts and bids.
- Data residency: host DB in an India region.

---

## 9. Non-functional targets (MVP)

- Mobile-first responsive (most contractors are on phones).
- p95 page load < 2.5s on 4G; works on low-end Android browsers.
- Graceful offline-ish behavior for flaky networks (PWA caching later).
- Seed/staging environment for the client to demo.

---

## 10. Roadmap & milestones

| Milestone | Deliverable |
|-----------|-------------|
| **M0 — Spec freeze** | Confirm field lists, trades taxonomy, plans, languages, branding |
| **M1 — Design** | Information architecture + wireframes for key screens |
| **M2 — Foundation** | Repo, DB schema, auth + roles, base UI |
| **M3 — Registration** | Contractor + workforce + company onboarding + admin moderation |
| **M4 — Marketplace** | Job posting + matching + bidding + shortlist/accept |
| **M5 — Monetization** | Subscription gating, then Razorpay billing |
| **M6 — Notifications & polish** | SMS/email (then WhatsApp), analytics, hardening |
| **M7 — Pilot launch** | Single-city pilot, gather feedback |

---

## 11. Open questions for the client **[CONFIRM]**

1. **Contractor registration fields** — please share the exact list the client wants.
   I'll merge it with the §5 draft.
2. **Trades/skills taxonomy** — which trades matter (masonry, RCC, electrical, plumbing,
   welding, scaffolding, fabrication, painting, helpers, operators…)?
3. **Languages at launch** — English only, or English + Hindi (and which regional)?
4. **Notification priority** — SMS, WhatsApp, or both? (WhatsApp adoption is very high.)
5. **Subscription details** — who pays (one side or both), tiers, and price points?
6. **Do companies need admin approval too**, or only contractors?
7. **Launch geography** — single-city pilot or pan-India from day one?
8. **Timeline & budget** — to right-size the phasing.
9. **Branding** — product name, logo, colours (or shall I propose options)?
10. **Worker IDs** — store Aadhaar/PAN at all, or keep it minimal (recommended) for privacy?
```
