import { tradeLabel, SKILL_LEVELS } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/utils";
import { StatusBadge } from "@/components/Badge";

const SKILL_LABEL: Record<string, string> = Object.fromEntries(
  SKILL_LEVELS.map((s) => [s.value, s.label]),
);

type Job = {
  title: string;
  description: string | null;
  city: string;
  district: string | null;
  state: string;
  startDate: Date | null;
  durationDays: number | null;
  shift: string | null;
  accommodationProvided: boolean;
  foodProvided: boolean;
  urgency: string;
  wageOffered: number | null;
  status: string;
  createdAt: Date;
  lines: { id: string; trade: string; headcount: number; skillLevel: string; wageOffered: number | null }[];
};

export function JobSummary({ job }: { job: Job }) {
  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
          <p className="text-sm text-slate-500">
            {job.city}
            {job.district ? `, ${job.district}` : ""}, {job.state} · posted {formatDate(job.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={job.urgency} />
          <StatusBadge status={job.status} />
        </div>
      </div>

      {job.description && <p className="whitespace-pre-line text-sm text-slate-700">{job.description}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Trade</th>
              <th className="px-4 py-2">Headcount</th>
              <th className="px-4 py-2">Skill</th>
              <th className="px-4 py-2">Wage/day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {job.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 font-medium text-slate-800">{tradeLabel(l.trade)}</td>
                <td className="px-4 py-2">{l.headcount}</td>
                <td className="px-4 py-2">{SKILL_LABEL[l.skillLevel] ?? l.skillLevel}</td>
                <td className="px-4 py-2">{formatINR(l.wageOffered)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Start date</dt>
          <dd className="font-medium text-slate-800">{formatDate(job.startDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Duration</dt>
          <dd className="font-medium text-slate-800">{job.durationDays ? `${job.durationDays} days` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Shift</dt>
          <dd className="font-medium text-slate-800">{job.shift ? job.shift.toLowerCase() : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Budget/worker/day</dt>
          <dd className="font-medium text-slate-800">{formatINR(job.wageOffered)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Accommodation</dt>
          <dd className="font-medium text-slate-800">{job.accommodationProvided ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Food</dt>
          <dd className="font-medium text-slate-800">{job.foodProvided ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </div>
  );
}
