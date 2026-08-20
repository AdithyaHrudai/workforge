# WorkForge — Product & Architecture Specification

> A B2B marketplace where companies post contract manpower requirements and verified
> contractors respond. Market: Indian industry — tyre, steel, power, cement, auto, pharma,
> warehousing, EPC and general manufacturing.
>
> _This document reflects the requirements agreed on the client call. It supersedes the earlier
> draft, which described a construction-trades bidding app and no longer matches the product._

---

## 1. What changed, and why

The original build was a construction-labour app: trades like mason and bar bender, jobs with
headcount lines, and bids priced per worker per day. The client's actual business is **industrial
contract staffing**, which differs in three structural ways:

1. **There are four distinct contract categories**, not one. They are bought on different terms
   and cannot share a form or a quote structure.
2. **Contractors are evaluated on track record and regional presence**, not on a directory
   listing. "Who do you already run, and where" is the buying signal.
3. **Individual workers are irrelevant to the platform.** As the client put it, contract workers
   do not use the portal. What matters is the contractor's capacity and compliance record.

The product was rebuilt around those three facts.

---

## 2. The four contract categories

This is the organising principle of the entire system. `Requirement.category` decides the shape
of the posting, the shape of the proposal, and how the two are compared.

### 2.1 White-collar temp staffing
Engineers, supervisors, QA, safety officers, HR/accounts executives deployed on a term contract
against the company's establishment. Company specifies roles and headcount. Charged **per person
per month**.

### 2.2 Blue-collar temp staffing
Skilled operators, technicians and tradesmen against a sanctioned headcount. Company specifies
roles and headcount. Charged **per person per month**.

### 2.3 Job contract (output-based)
The company specifies the **scope of work and the output required** — 300 tonnes loaded per day,
18 mould changes per shift, a shutdown completed in fourteen days. The contractor decides how
many people, and how much machinery, to deploy against it; they may deploy twenty people, or ten
plus a robot, and the company has no interest in which. Charged **per tonne, per unit, per trip
or as a lump sum**.

> **Design consequence:** a job-contract proposal must not carry a headcount commitment. Asking
> for one quietly converts an output contract into a supply contract, which is a different
> commercial arrangement with different liabilities. `proposalSchemaFor(category)` returns a
> schema in which `headcountOffered` is typed `undefined` for this category, so it is
> structurally impossible to submit one. Contractors may volunteer a non-binding
> `indicativeCrewSize`.

### 2.4 Unskilled manpower supply
Helpers assisting operators and machines — the client's example was the helper every operator
needs beside them. Supplied on a per-person basis.

---

## 3. Registration

Deliberately light on both sides. The client was explicit that a company should not have to
disclose GST, PAN or anything commercially sensitive just to look around; those matter only when
invoices are raised, and they are optional throughout.

**Company:** name, nature of business (manufacturing / service / both), sectors, manpower
strength band, which of the four contract categories they engage, location, contact person.
Optional: entity type, website, GSTIN, PAN, CIN, about.

**Contractor:** firm name, owner, year established, location, plus the things that make them
findable — contract categories offered (with deployed strength in each), sectors worked in,
roles and scopes supplied, **states of presence**, **states workers are sourced from**,
workforce total / available / mobilisation days. Statutory numbers (CLRA licence, EPF, ESIC,
GST, PAN) are optional on the form but drive verification.

---

## 4. The contractor's client list

The single most important feature, and the reason companies will trust the platform.

Each entry records: client company, their sector, site city and state, contract category
supplied, scope, **manpower deployed**, start year, and whether it is ongoing. The client's own
example — *"In Yokohama Dahej I am providing 200 manpower, Yokohama Vizag 100, XYZ company 20"* —
is exactly the record shape.

Why it matters, in the client's words: a buyer hiring in Chhattisgarh who sees a contractor whose
presence is all in the south will not select them, because they cannot cover a shortfall quickly.
A firm already running sites in Chhattisgarh can. Regional presence therefore carries the heaviest
weight in matching, and **demonstrated** presence (a client site in that state) outranks
self-declared presence (a state ticked on a profile).

Admins verify entries against work orders and mark them ✓. Unverified entries still display but
are labelled self-declared. Editing an entry clears its verification, since the details it was
checked against have changed.

---

## 5. Search — the company-side counterpart to a resume database

The client asked for the Resdex equivalent: a filter panel producing a ranked list of suitable
contractors. Filters:

- free text (firm name, owner, city, **and the names of clients they serve** — "who supplies
  Yokohama?" is a real query)
- contract category · sector experience · specialised scope (mould change, refractory, shutdown)
- states of presence · zone (North / South / East / West / Central / North East)
- states workers are sourced from
- minimum workforce strength · minimum rating · verified only
- sort: best match / highest rated / largest workforce / recently joined

Results are cards showing capacity, categories, sectors and the top three client deployments,
with sites in the searched state highlighted. From a result the company can open the full profile
and **invite the firm to quote on a specific requirement** — which is what makes the directory a
marketplace rather than a phone book.

The search is a plain GET form, so every search is a shareable URL and the back button works.

---

## 6. Ratings

A single star rating is not enough. Companies judge contractors on distinct parameters, and the
client named the first three unprompted:

| Parameter | What it captures |
|---|---|
| Timely manpower deployment | Mobilised on the promised date; shortfalls covered quickly |
| Statutory compliance | PF, ESI, CLRA licence, wage registers, returns filed on time |
| Timely payment to workers | The contractor's own workers paid in full, on schedule |
| Manpower quality & retention | Skill as promised, low absenteeism, low attrition |
| Supervision & responsiveness | Site supervision, escalation handling |

Filed once per completed engagement by the company. The mean is stored alongside the five scores,
and all six are denormalised onto `ContractorProfile` so search can rank on any of them without
aggregating per query. Contractors also rate companies, more simply, on a single scale.

Worker-filed ratings were considered and rejected: contract workers do not use the portal.

---

## 7. Contact visibility and monetisation

The client's position: keep it free initially so the network grows by word of mouth, with a paid
tier possible later.

Implemented as a switch that is **off**. Any approved company sees contractor phone and email
immediately. Every reveal is nonetheless recorded in `ContactUnlock`, so when a paid tier arrives
there is already a usage history to price against and no migration is needed. Turning on
*Admin → Settings → contact masking* masks details in search and meters reveals against a monthly
quota. Companies that already hold a relationship — an engagement, or a proposal received on
their own requirement — are never metered.

**No payments are integrated.** WorkForge takes no commission and moves no money; the two parties
invoice each other through the GST system, as the trade already does. Dormant fee columns and a
`paymentsEnabled` flag exist so a paid tier needs no schema change.

---

## 8. Lifecycle

```
Company posts requirement
        │
        ├── matched into contractor feeds (category → region → sector → roles → capacity)
        └── company searches directory and invites specific firms
                │
        Contractor submits proposal  (shape depends on category)
                │
        Company shortlists / rejects / accepts
                │
        Accept → Engagement  (commercials snapshotted, contacts exchanged, thread opens)
                │
        Complete → five-parameter review → contractor's public rating
```

Postings expire on a clock derived from their urgency (21 / 45 / 120 days), because an "immediate"
requirement still sitting in feeds two months later destroys trust in the feed. Expiry is separate
from status and is checked independently — an expired posting is still reachable by direct URL.

A staffing requirement can be awarded to several contractors and only closes when the awarded
headcount covers what was asked for. A job contract settles on the first award, since there is no
headcount to satisfy. Both run inside one transaction, so a posting cannot stay open after it is
covered, nor a proposal produce two engagements.

---

## 9. Data model

```
User ─┬─ CompanyProfile ─── Requirement ─┬─ RequirementRole   (staffing only)
      │                                  ├─ Proposal ──── Engagement ─── ContractorReview
      │                                  └─ RequirementInvite            └─ Message
      └─ ContractorProfile ─┬─ ContractorClient      (the track record)
                            ├─ ContractorCapacity    (strength per category)
                            └─ Document              (verification files)
```

Supporting: `Notification`, `AuditLog`, `RateLimit`, `Setting`, `ContactUnlock`.

**Conventions.** Multi-valued attributes (presence states, worker source states, categories,
industries, roles) are Postgres `text[]` with GIN indexes, because search filters them with
`hasSome` — as JSON strings none of that would be indexable. Every column used in a WHERE,
ORDER BY or JOIN carries an explicit index; Postgres does not index foreign keys automatically
and Prisma only indexes `@id`/`@unique`.

Engagements use `onDelete: Restrict` throughout: trade history must not vanish because a party
was deleted. Erasure requests are served by anonymising the `User`, not by deleting the record.

---

## 10. Matching

Rules-based, weighted the way the client described the buying decision (max 100):

| Signal | Weight | Notes |
|---|---|---|
| Contract category | 20 | A firm that doesn't take this category scores **0** overall |
| Regional presence | 0–34 | Client sites in the state (30) > head office (22) > declared presence (20) > same zone (10) > willing outstation (4); +4 for same city |
| Industry experience | 0–15 | Sector match, plus a bonus for client sites in that sector |
| Role / scope coverage | 0–15 | Proportion of required roles supplied; exact scope match for job contracts |
| Capacity | 0–10 | Available vs required for staffing; overall strength for job contracts |
| Mobilisation vs urgency | 0–5 | Rewards fast mobilisation on urgent postings |
| Verification & reputation | 0–7 | Verified badge, plus a rating component weighted towards deployment |

An unrated firm sits level with the pack rather than below it — the reputation component is added
separately, so a new contractor is not penalised for having no history.

---

## 11. Security

- Signed httpOnly JWT sessions carrying `tokenVersion`; credential changes and suspensions revoke
  live sessions immediately rather than waiting for cookie expiry.
- Role checks in every server action, not only in middleware. The edge gate proves the token is
  well-formed and signed; it does no database work and is explicitly not the access control.
- Zod validation on every input, with category-driven refinements enforcing the commercial model.
- Uploaded documents sniffed by magic number, never by the browser-supplied MIME type, and served
  with the detected type.
- Postgres-backed fixed-window rate limiting (serverless instances share no memory), failing open
  so a limiter outage cannot lock the marketplace out.
- Audit log on privileged actions; per-request nonce CSP.

---

## 12. Deliberately not built

- **Payments.** See §7.
- **SMS / WhatsApp OTP and delivery.** Mobile numbers are collected and in-app notifications work;
  delivery needs a provider (MSG91 / Gupshup) and OTP is not wired.
- **Automated KYC.** Licences and client-list entries are reviewed manually, which is correct for
  v1. Aadhaar / PAN / GST API verification is a later add-on.
- **Worker-level records.** Removed by design — see §1.
- **Multi-language.** English only; Hindi and regional languages are a known gap on the
  contractor side.
