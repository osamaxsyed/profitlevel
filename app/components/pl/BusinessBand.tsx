'use client';

import { useEffect, useState } from 'react';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';
import { num } from './subTypes';

// Dashboard KPI band, split two ways since the Aug 2026 dispatch shift:
//
//   BUSINESS  — every job, subbed or not: revenue, honest net profit
//               (sub payouts are now subtracted upstream), sub spend, and
//               outstanding receivables (earned, not yet collected).
//   YOUR LABOR — day-rate metrics for the jobs the owner personally worked.
//
// Both read /api/financial-summary for the period so the numbers match the
// Financials screen exactly.

interface DayRate {
  total_day_units: number;
  target_total: number;
  actual_total: number;
  avg_per_day: number | null;
  jobs_tagged: number;
  jobs_met: number;
}

interface Summary {
  revenue: number;
  net_profit: number;
  job_count: number;
  total_sub_payouts?: number;
  total_outstanding?: number;
  owner_jobs?: { revenue: number; count: number };
  day_rate?: DayRate;
}

function Stat({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note?: string;
  color?: string;
}) {
  return (
    <div className="rounded-[11px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 9.5, letterSpacing: '0.14em' }}>
        {label}
      </div>
      <div className="pl-mono font-semibold mt-[3px]" style={{ fontSize: 21, letterSpacing: '-0.02em', color: color || '#F2EDE4' }}>
        {value}
      </div>
      {note && <div className="text-pl-faint mt-[2px]" style={{ fontSize: 10.5 }}>{note}</div>}
    </div>
  );
}

export default function BusinessBand({ month }: { month?: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const period = month ?? new Date().toISOString().slice(0, 7);
    fetch(`/api/financial-summary?month=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d))
      .catch(() => {});
  }, [month]);

  if (!summary) return null;

  const revenue = num(summary.revenue);
  const net = num(summary.net_profit);
  const subSpend = num(summary.total_sub_payouts);
  const outstanding = num(summary.total_outstanding);
  const dr = summary.day_rate;
  const ownerCount = summary.owner_jobs ? num(summary.owner_jobs.count) : (dr?.jobs_tagged ?? 0);
  const ownerRevenue = summary.owner_jobs ? num(summary.owner_jobs.revenue) : 0;

  const hasOwnerLabor = ownerCount > 0 && !!dr && dr.jobs_tagged > 0;

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* ===== BUSINESS ===== */}
      <div className="bg-pl-card rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
            Business · this month
          </div>
          <div className="text-pl-faint" style={{ fontSize: 11 }}>
            all {summary.job_count} {summary.job_count === 1 ? 'job' : 'jobs'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-[14px]">
          <Stat label="Revenue" value={fmtMoney(revenue)} color={PL_ACCENT} />
          <Stat
            label="Net profit"
            value={fmtMoney(net)}
            note={revenue > 0 ? `${((net / revenue) * 100).toFixed(0)}% margin` : undefined}
            color={net >= 0 ? '#F2EDE4' : PL_CLAY}
          />
          <Stat
            label="Sub spend"
            value={subSpend > 0 ? `−${fmtMoney(subSpend)}` : '—'}
            note={subSpend > 0 ? 'paid out to subs' : 'no subbed work yet'}
            color={subSpend > 0 ? PL_CLAY : '#6E665A'}
          />
          <Stat
            label="Outstanding"
            value={outstanding > 0 ? fmtMoney(outstanding) : '—'}
            note={outstanding > 0 ? 'earned, not collected' : 'all collected'}
            color={outstanding > 0 ? '#E8B530' : '#6E665A'}
          />
        </div>
      </div>

      {/* ===== YOUR LABOR ===== */}
      <div className="bg-pl-panel-2 rounded-[14px] px-[18px] py-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 10, letterSpacing: '0.16em' }}>
            Jobs you worked
          </div>
          {hasOwnerLabor && (
            <div className="pl-mono text-pl-muted-2" style={{ fontSize: 12 }}>
              {ownerCount} {ownerCount === 1 ? 'job' : 'jobs'}
              {ownerRevenue > 0 ? ` · ${fmtMoney(ownerRevenue)}` : ''}
            </div>
          )}
        </div>

        {!hasOwnerLabor ? (
          <div className="text-pl-muted mt-[10px]" style={{ fontSize: 13 }}>
            You dispatched every job this month. Your day-rate scoring comes back when you work one yourself.
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-[9px] mt-[12px]">
              <div
                className="pl-mono font-semibold"
                style={{
                  fontSize: 30,
                  letterSpacing: '-0.02em',
                  color: dr!.actual_total >= dr!.target_total ? PL_ACCENT : PL_CLAY,
                }}
              >
                {dr!.avg_per_day != null ? fmtMoney(dr!.avg_per_day) : '—'}
              </div>
              <div className="pl-mono text-pl-muted-2" style={{ fontSize: 14 }}>/ day worked</div>
            </div>
            <div className="text-pl-muted-2 mt-[6px]" style={{ fontSize: 12 }}>
              {dr!.jobs_met}/{dr!.jobs_tagged} cleared their tier · {dr!.total_day_units} day-unit
              {dr!.total_day_units === 1 ? '' : 's'} · target {fmtMoney(dr!.target_total)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
