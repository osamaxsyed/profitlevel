'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/pl/PageHeader';
import BottomNav from '../components/pl/BottomNav';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';

interface DayRate {
  total_day_units: number;
  target_total: number;
  actual_total: number;
  avg_per_day: number | null;
  jobs_tagged: number;
  jobs_met: number;
}

interface FinancialSummary {
  period: string;
  revenue: number;
  expenses: {
    bucket_a_direct: number;
    materials: number;
    labor: number;
    bucket_b_variable: number;
    mileage: number;
    bucket_c_fixed: number;
    total: number;
  };
  net_profit: number;
  job_count: number;
  day_rate?: DayRate;
  tax_estimate: {
    taxable_income: number;
    estimated_tax_15pct: number;
    estimated_tax_25pct: number;
    estimated_tax_30pct: number;
  };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function FinancialsPage() {
  const [view, setView] = useState<'monthly' | 'yearly' | 'alltime'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  const fetchSummary = useCallback(async () => {
    let params = '';
    if (view === 'monthly') params = `?month=${selectedMonth}`;
    else if (view === 'yearly') params = `?year=${selectedYear}`;
    try {
      const res = await fetch(`/api/financial-summary${params}`);
      if (res.ok) setSummary(await res.json());
    } catch {
      /* leave prior summary */
    }
  }, [view, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const changeMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + delta);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const periodLabel = () => {
    if (view === 'alltime') return 'All time';
    if (view === 'yearly') return selectedYear;
    const [y, m] = selectedMonth.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  return (
    <div className="min-h-screen bg-pl-bg max-w-md mx-auto px-[18px]" style={{ paddingBottom: 96 }}>
      <PageHeader title="Financials" subtitle={periodLabel()} />

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-[10px] mb-3" style={{ background: '#1A1814', border: '1px solid rgba(255,255,255,0.07)' }}>
        {(['monthly', 'yearly', 'alltime'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex-1 py-[7px] rounded-[7px] font-bold"
            style={{
              fontSize: 12,
              letterSpacing: '0.04em',
              background: view === v ? PL_ACCENT : 'transparent',
              color: view === v ? '#1A0E04' : '#9A9183',
            }}
          >
            {v === 'monthly' ? 'Month' : v === 'yearly' ? 'Year' : 'All time'}
          </button>
        ))}
      </div>

      {/* Period stepper */}
      {view !== 'alltime' && (
        <div className="flex gap-2 items-center mb-3">
          {view === 'monthly' ? (
            <>
              <button onClick={() => changeMonth(-1)} className="bg-pl-card text-pl-text rounded px-[12px] py-[8px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>←</button>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="flex-1 bg-pl-card text-pl-text px-3 py-2 rounded" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
              <button onClick={() => changeMonth(1)} className="bg-pl-card text-pl-text rounded px-[12px] py-[8px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>→</button>
            </>
          ) : (
            <>
              <button onClick={() => setSelectedYear(String(+selectedYear - 1))} className="bg-pl-card text-pl-text rounded px-[12px] py-[8px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>←</button>
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} min="2020" max="2100" className="flex-1 bg-pl-card text-pl-text px-3 py-2 rounded pl-mono" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
              <button onClick={() => setSelectedYear(String(+selectedYear + 1))} className="bg-pl-card text-pl-text rounded px-[12px] py-[8px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>→</button>
            </>
          )}
        </div>
      )}

      {!summary ? (
        <div className="text-pl-muted py-10 text-center" style={{ fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* Revenue & net profit */}
          <div className="bg-pl-card rounded-2xl p-5 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Revenue</div>
            <div className="pl-mono font-semibold" style={{ fontSize: 30, color: PL_ACCENT, letterSpacing: '-0.02em' }}>{fmtMoney(summary.revenue)}</div>
            <div className="text-pl-muted-2" style={{ fontSize: 12 }}>{summary.job_count} {summary.job_count === 1 ? 'job' : 'jobs'}</div>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Net profit</div>
              <div className="pl-mono font-semibold" style={{ fontSize: 30, letterSpacing: '-0.02em', color: summary.net_profit >= 0 ? '#F2EDE4' : PL_CLAY }}>{fmtMoney(summary.net_profit)}</div>
              <div className="text-pl-muted-2" style={{ fontSize: 12 }}>{summary.revenue > 0 ? `${((summary.net_profit / summary.revenue) * 100).toFixed(1)}% margin` : '—'}</div>
            </div>

            {summary.day_rate && summary.day_rate.jobs_tagged > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Avg per day</div>
                <div className="pl-mono font-semibold" style={{ fontSize: 24, color: summary.day_rate.actual_total >= summary.day_rate.target_total ? PL_ACCENT : PL_CLAY }}>
                  {summary.day_rate.avg_per_day != null ? fmtMoney(summary.day_rate.avg_per_day) : '—'}<span className="text-pl-muted-2" style={{ fontSize: 14 }}>/day</span>
                </div>
                <div className="text-pl-muted-2" style={{ fontSize: 12 }}>{summary.day_rate.jobs_met}/{summary.day_rate.jobs_tagged} jobs cleared · {summary.day_rate.total_day_units} day-units</div>
              </div>
            )}
          </div>

          {/* Expense buckets */}
          <div className="bg-pl-card rounded-2xl p-5 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="font-bold uppercase text-pl-muted-2 mb-3" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Where the money went</div>
            <div className="flex flex-col gap-2 pl-mono">
              {[
                { label: 'Materials & labor', val: summary.expenses.bucket_a_direct, note: `Materials ${fmtMoney(summary.expenses.materials)} · Labor ${fmtMoney(summary.expenses.labor)}` },
                { label: 'Mileage', val: summary.expenses.bucket_b_variable, note: 'Variable — IRS standard rate' },
                { label: 'Overhead', val: summary.expenses.bucket_c_fixed, note: 'Fixed — insurance, software, tools' },
              ].map((b) => (
                <div key={b.label} className="rounded-[9px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex justify-between items-center">
                    <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 600, fontSize: 14 }}>{b.label}</span>
                    <span className="font-semibold" style={{ fontSize: 14, color: PL_CLAY }}>−{fmtMoney(b.val)}</span>
                  </div>
                  <div className="text-pl-muted-2 mt-[2px]" style={{ fontSize: 11, fontFamily: 'var(--font-archivo)' }}>{b.note}</div>
                </div>
              ))}
              <div className="flex justify-between items-center rounded-[9px] p-3 mt-1" style={{ background: '#0C0B09', border: `1px solid rgba(255,106,26,0.3)` }}>
                <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 14 }}>Total expenses</span>
                <span className="font-semibold" style={{ fontSize: 18, color: PL_ACCENT }}>−{fmtMoney(summary.expenses.total)}</span>
              </div>
            </div>
          </div>

          {/* Tax estimate */}
          <div className="bg-pl-card rounded-2xl p-5 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Tax set-aside estimate</div>
            <div className="pl-mono font-semibold mt-1" style={{ fontSize: 22 }}>{fmtMoney(summary.tax_estimate.taxable_income)}</div>
            <div className="text-pl-muted-2" style={{ fontSize: 12 }}>taxable income (revenue − all costs)</div>
            <div className="flex flex-col gap-2 mt-3 pl-mono" style={{ fontSize: 14 }}>
              {[['Set aside @ 15%', summary.tax_estimate.estimated_tax_15pct, '#F2EDE4'], ['@ 25%', summary.tax_estimate.estimated_tax_25pct, '#E8B530'], ['@ 30%', summary.tax_estimate.estimated_tax_30pct, PL_CLAY]].map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-pl-text-2" style={{ fontFamily: 'var(--font-archivo)' }}>{r[0] as string}</span>
                  <span className="font-semibold" style={{ color: r[2] as string }}>{fmtMoney(r[1] as number)}</span>
                </div>
              ))}
            </div>
            <div className="text-pl-faint mt-3" style={{ fontSize: 11 }}>Rough estimate — confirm with a tax professional.</div>
          </div>

          {view === 'monthly' && summary.job_count === 0 && (
            <div className="rounded-[11px] p-3" style={{ background: 'rgba(232,181,48,0.12)', border: '1px solid rgba(232,181,48,0.4)', color: '#E8B530', fontSize: 13 }}>
              No jobs this month, but overhead still applies: {fmtMoney(summary.expenses.bucket_c_fixed)}.
            </div>
          )}
        </>
      )}

      <BottomNav active="more" />
    </div>
  );
}
