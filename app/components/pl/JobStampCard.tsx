'use client';

import type { JobWithCosts } from '@/lib/types';
import { fmtMoney, tierSummary, resultTokens } from '@/lib/dayRate';
import PaidChip from './PaidChip';
import { num, subLine, type JobDispatchFields, type PaidStatus } from './subTypes';

// Job "stamp" card: left accent stripe colored by result, tier chip + date,
// name (+ optional sub), gross profit, and a ✓/✗ cleared/under stamp.
// Since the Aug 2026 dispatch rehaul it also carries a paid-status chip, the
// sub payout line, and — while a job is only part-paid — its cash position.
// Used on the dashboard (recent) and jobs list.

type DispatchJob = JobWithCosts & Partial<JobDispatchFields>;

interface JobStampCardProps {
  job: DispatchJob;
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

  const paidStatus = job.paid_status as PaidStatus | undefined;
  const subs = subLine(job.sub_payouts);
  const cash = num(job.cash_position);
  const showCash = paidStatus === 'partial' || (paidStatus === 'unpaid' && num(job.outstanding) > 0);
  const cashNeg = cash < 0;

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
        <div className="flex items-center gap-[6px]">
          {paidStatus && <PaidChip status={paidStatus} />}
          <span className="pl-mono text-pl-muted-2" style={{ fontSize: 12 }}>{job.job_date}</span>
        </div>
      </div>
      <div className="font-bold mt-[11px] leading-tight" style={{ fontSize: 15 }}>{job.name}</div>
      {showSub && job.client_name && (
        <div className="text-pl-muted-2 mt-[1px]" style={{ fontSize: 12 }}>{job.client_name}</div>
      )}
      {subs && (
        <div className="text-pl-muted mt-[3px] pl-mono" style={{ fontSize: 11.5 }}>{subs}</div>
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
      {showCash && (
        <div
          className="mt-[10px] rounded-[8px] px-[10px] py-[7px] flex items-center justify-between"
          style={{
            background: cashNeg ? 'rgba(224,118,78,0.1)' : 'rgba(255,106,26,0.1)',
            border: `1px solid ${cashNeg ? 'rgba(224,118,78,0.28)' : 'rgba(255,106,26,0.26)'}`,
          }}
        >
          <span className="pl-mono font-semibold" style={{ fontSize: 12.5, color: cashNeg ? '#E0764E' : '#FF6A1A' }}>
            {cashNeg ? '−' : '+'}{fmtMoney(Math.abs(cash))}
          </span>
          <span className="text-pl-muted" style={{ fontSize: 11 }}>
            in pocket until final payment
          </span>
        </div>
      )}
    </div>
  );
}
