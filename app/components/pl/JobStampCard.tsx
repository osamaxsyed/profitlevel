'use client';

import type { JobWithCosts } from '@/lib/types';
import { fmtMoney, tierSummary, resultTokens } from '@/lib/dayRate';

// Job "stamp" card: left accent stripe colored by result, tier chip + date,
// name (+ optional sub), gross profit, and a ✓/✗ cleared/under stamp.
// Used on the dashboard (recent) and jobs list.

interface JobStampCardProps {
  job: JobWithCosts;
  onOpen?: () => void;
  showSub?: boolean;
}

export default function JobStampCard({ job, onOpen, showSub = false }: JobStampCardProps) {
  const dr = job.day_rate;
  const met = dr?.met ?? null;
  const tokens = resultTokens(met);
  const stripe = met === null ? 'rgba(255,255,255,0.12)' : tokens.color;

  const tierText = tierSummary(job.day_units ?? null);
  const targetText = dr && dr.target > 0 ? ` · ${fmtMoney(dr.target)}` : '';

  let stamp = '';
  if (dr && met !== null) {
    const sign = met ? '+' : '−';
    stamp = `${met ? '✓' : '✗'} ${sign}${fmtMoney(Math.abs(dr.delta))}`;
  }

  return (
    <div
      onClick={onOpen}
      className="relative overflow-hidden rounded-[13px] bg-pl-card p-[14px]"
      style={{ border: '1px solid rgba(255,255,255,0.07)', cursor: onOpen ? 'pointer' : 'default' }}
    >
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: stripe }} />
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-bold uppercase text-pl-muted"
          style={{
            fontSize: 10,
            letterSpacing: '0.08em',
            background: '#13110F',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '3px 8px',
            borderRadius: 6,
          }}
        >
          {tierText}{targetText}
        </span>
        <span className="pl-mono text-pl-muted-2" style={{ fontSize: 12 }}>{job.job_date}</span>
      </div>
      <div className="font-bold mt-[11px] leading-tight" style={{ fontSize: 15 }}>{job.name}</div>
      {showSub && job.client_name && (
        <div className="text-pl-muted-2 mt-[1px]" style={{ fontSize: 12 }}>{job.client_name}</div>
      )}
      <div className="h-px my-[12px]" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="flex items-end justify-between">
        <div>
          <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 9, letterSpacing: '0.14em' }}>
            Gross profit
          </div>
          <div className="pl-mono font-semibold mt-[2px]" style={{ fontSize: 22 }}>{fmtMoney(job.gross_profit)}</div>
        </div>
        {stamp && (
          <span
            className="pl-mono font-semibold whitespace-nowrap"
            style={{ fontSize: 12, color: tokens.color, background: tokens.bg, border: `1px solid ${tokens.bd}`, padding: '5px 9px', borderRadius: 7 }}
          >
            {stamp}
          </span>
        )}
      </div>
    </div>
  );
}
