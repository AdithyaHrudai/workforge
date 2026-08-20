/**
 * The two-sided workflow, as a diagram rather than prose.
 *
 * New visitors need the shape of the platform before they need its details, and
 * three paragraphs of text does not give them that. Each step describes itself
 * on hover or keyboard focus.
 *
 * Built with CSS `:hover` / `:focus-within` and no JavaScript, so it works in a
 * server component, needs nothing from the nonce CSP, and is keyboard-reachable
 * by default. Every step is a <button> so focus works without a tabindex hack,
 * and the description is also rendered inline underneath for touch and screen
 * readers — the tooltip enhances, it never gates the content.
 */

export type WorkflowStep = {
  id: string;
  lane: "company" | "contractor" | "shared";
  title: string;
  short: string;
  detail: string;
};

const LANE_STYLE: Record<WorkflowStep["lane"], { dot: string; ring: string; label: string }> = {
  company: { dot: "#0284c7", ring: "ring-sky-200", label: "Company" },
  contractor: { dot: "#059669", ring: "ring-emerald-200", label: "Contractor" },
  shared: { dot: "#ea6408", ring: "ring-forge-200", label: "Both" },
};

export function WorkflowDiagram({
  steps,
  caption,
}: {
  steps: WorkflowStep[];
  caption?: string;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {/* Lane key — the diagram encodes who acts at each step, so the key is
            information rather than decoration. */}
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          {(["company", "contractor", "shared"] as const).map((lane) => (
            <span key={lane} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: LANE_STYLE[lane].dot }}
                aria-hidden
              />
              {LANE_STYLE[lane].label}
            </span>
          ))}
          <span className="ml-auto text-xs text-slate-400">Hover any step for detail</span>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => {
            const lane = LANE_STYLE[step.lane];
            return (
              <li key={step.id} className="group relative">
                <button
                  type="button"
                  className={`flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${lane.ring}`}
                  aria-describedby={`wf-detail-${step.id}`}
                >
                  <span className="mb-2 flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: lane.dot }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {lane.label}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-900">{step.title}</span>
                  <span className="mt-1 text-sm leading-relaxed text-slate-500">{step.short}</span>
                </button>

                {/* Tooltip on pointer/keyboard. Hidden from assistive tech
                    because the same text is rendered in the list below, which
                    is what aria-describedby points at. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 max-w-[85vw] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm leading-relaxed text-slate-100 shadow-lift group-hover:block group-focus-within:block"
                >
                  <span
                    className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900"
                    aria-hidden
                  />
                  {step.detail}
                </div>
              </li>
            );
          })}
        </ol>

        {caption && <p className="mt-5 text-xs text-slate-400">{caption}</p>}
      </div>

      {/* The same detail as plain text: the tooltip is an enhancement, and on a
          touch screen there is no hover to rely on. */}
      <dl className="mt-4 space-y-2">
        {steps.map((step, i) => (
          <div
            key={step.id}
            id={`wf-detail-${step.id}`}
            className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5"
          >
            <dt className="text-sm font-semibold text-slate-800">
              {i + 1}. {step.title}
            </dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The full two-sided flow, used on the "How it works" page. */
export const FULL_WORKFLOW: WorkflowStep[] = [
  {
    id: "register",
    lane: "shared",
    title: "Both sides register",
    short: "A company account or a contractor firm account.",
    detail:
      "Registration is light — name, location, sectors and the contract types you deal in. GST and PAN are optional at this stage, so nobody is blocked from looking around before they commit.",
  },
  {
    id: "profile",
    lane: "contractor",
    title: "Contractor builds a track record",
    short: "Client list, workforce strength, states covered.",
    detail:
      "This is the part companies actually judge. The firm lists which clients it serves, at which plant, in which state, how many people and since when — plus its own workforce strength and the states its workers come from.",
  },
  {
    id: "verify",
    lane: "contractor",
    title: "Documents go for verification",
    short: "GST and PAN certificates.",
    detail:
      "The firm answers whether it holds each registration and uploads the certificate with its number. Our team reviews them and marks the firm verified. Client-list entries are separately corroborated against work orders and get their own tick.",
  },
  {
    id: "post",
    lane: "company",
    title: "Company posts a requirement",
    short: "One of four contract types.",
    detail:
      "The form adapts to the contract type. Staffing requirements ask for roles and headcount; a job contract asks for scope and an output target instead, because on those the contractor decides how many people to deploy.",
  },
  {
    id: "match",
    lane: "shared",
    title: "Matching runs both ways",
    short: "Ranked feed for contractors, ranked shortlist for companies.",
    detail:
      "The requirement lands in the feed of every contractor whose contract types, sectors and regions fit — ranked by how well they fit. The company simultaneously sees which firms match, with the reasons shown: already running manpower in that state, has worked in that sector, documents verified.",
  },
  {
    id: "invite",
    lane: "company",
    title: "Company invites firms to quote",
    short: "Optional — or contractors apply themselves.",
    detail:
      "A company can search the directory and invite specific firms, exactly like a recruiter approaching a candidate. Contractors can also submit a proposal without being invited.",
  },
  {
    id: "propose",
    lane: "contractor",
    title: "Contractor submits a proposal",
    short: "Priced on the right commercial basis.",
    detail:
      "The proposal form follows the contract type: a rate per person per month plus headcount offered for staffing, or a rate per tonne, per unit or a lump sum for a job contract — where a headcount is deliberately not asked for.",
  },
  {
    id: "compare",
    lane: "company",
    title: "Company compares side by side",
    short: "Rate, capacity, mobilisation, track record.",
    detail:
      "Proposals sit next to each other with each firm's track record and ratings attached, so the comparison is not on price alone.",
  },
  {
    id: "award",
    lane: "shared",
    title: "Award opens an engagement",
    short: "Contact details, message thread, commercials on record.",
    detail:
      "Accepting a proposal creates the engagement. Both sides get each other's contact details, a message thread, and a record of what was agreed. Deployed headcount can be updated as the work runs.",
  },
  {
    id: "rate",
    lane: "shared",
    title: "Both sides rate each other",
    short: "Five parameters for contractors.",
    detail:
      "On completion the company rates the contractor on timely deployment, statutory compliance, timely payment to workers, manpower quality and supervision. Those averages feed straight back into search ranking — which is what makes the next match better than the last.",
  },
];

/** Company-side slice, for the "For companies" page. */
export const COMPANY_WORKFLOW: WorkflowStep[] = [
  {
    id: "c-register",
    lane: "company",
    title: "Register your company",
    short: "Name, location, sectors, contract types.",
    detail:
      "Light registration — GST and PAN are optional. You can search the contractor directory before you post anything.",
  },
  {
    id: "c-post",
    lane: "company",
    title: "Post a requirement",
    short: "The form adapts to the contract type.",
    detail:
      "Pick white-collar staffing, blue-collar staffing, a job contract or unskilled supply. Staffing asks for roles and headcount; a job contract asks for scope and output, and never asks how many people — that is the contractor's commercial call.",
  },
  {
    id: "c-search",
    lane: "company",
    title: "Search and invite contractors",
    short: "Filter by sector, state, capacity and rating.",
    detail:
      "Filter the directory by contract type, sector experience, the states a firm operates in, where its workers come from, workforce strength and rating. Then invite the right firms to quote.",
  },
  {
    id: "c-compare",
    lane: "company",
    title: "Compare proposals",
    short: "Rate against real track record.",
    detail:
      "Each proposal carries the firm's client list, workforce and five rating parameters, so you are comparing capability, not just price.",
  },
  {
    id: "c-award",
    lane: "company",
    title: "Award and coordinate",
    short: "Engagement, contacts, messages.",
    detail:
      "Accepting a proposal opens an engagement with contact details, a message thread and the commercials on record.",
  },
  {
    id: "c-rate",
    lane: "company",
    title: "Rate on completion",
    short: "Five parameters.",
    detail:
      "Rate the firm on deployment, compliance, worker payment, manpower quality and supervision. This is what keeps the directory honest for everyone.",
  },
];

/** Contractor-side slice, for the "For contractors" page. */
export const CONTRACTOR_WORKFLOW: WorkflowStep[] = [
  {
    id: "k-register",
    lane: "contractor",
    title: "Register your firm",
    short: "Contract types, sectors, states, strength.",
    detail:
      "Tell us which of the four contract types you take on, the sectors you have worked in, the states you operate in and where your workers come from. This is what puts you in front of the right requirements.",
  },
  {
    id: "k-clients",
    lane: "contractor",
    title: "Publish your client list",
    short: "Plants, states, manpower, since when.",
    detail:
      "The single biggest factor in winning work here. A plant hiring in Chhattisgarh wants a firm already running people in Chhattisgarh — your client list is how they find you.",
  },
  {
    id: "k-verify",
    lane: "contractor",
    title: "Get verified",
    short: "GST and PAN certificates.",
    detail:
      "Answer two questions and upload the certificates behind them. A verified badge ranks you higher and is the first thing a serious buyer filters on.",
  },
  {
    id: "k-feed",
    lane: "contractor",
    title: "Work comes to your feed",
    short: "Ranked by how well you fit.",
    detail:
      "Requirements matching your contract types, sectors and regions appear automatically, best fit first, with the reasons shown. You can also be invited directly by a company.",
  },
  {
    id: "k-quote",
    lane: "contractor",
    title: "Quote on the right basis",
    short: "Per person, per tonne, or lump sum.",
    detail:
      "The proposal form follows the contract type — a rate per person per month for staffing, or per tonne, per unit or a lump sum for a job contract, where how many people you deploy is your decision.",
  },
  {
    id: "k-deliver",
    lane: "contractor",
    title: "Win, deliver, get rated",
    short: "Ratings compound into ranking.",
    detail:
      "An accepted proposal opens an engagement with contact details and a message thread. Good ratings on deployment, compliance and worker payment lift you in every future search.",
  },
];
