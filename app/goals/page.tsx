'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';
import BottomNav from '../components/pl/BottomNav';

interface MonthRow {
  month: number;
  goal: number;
  actual: number;
}

interface GoalsData {
  year: number;
  months: MonthRow[];
  annual_target: number;
  annual_actual: number;
  pace_target: number;
  pace_actual: number;
  pace_delta: number;
  current_month: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Goals() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState<GoalsData | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchGoals = useCallback(async () => {
    const res = await fetch(`/api/monthly-goals?year=${year}`);
    const d: GoalsData = await res.json();
    setData(d);
  }, [year]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const openEdit = (m: MonthRow) => {
    setEditing(m.month);
    setDraft(m.goal ? String(m.goal) : '');
  };

  const saveMonth = async () => {
    if (editing == null) return;
    setSaving(true);
    const amount = parseFloat(draft || '0') || 0;
    await fetch('/api/monthly-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month: editing, amount }),
    });
    setSaving(false);
    toast.success(`${MONTH_NAMES[editing - 1]} goal saved`);
    setEditing(null);
    fetchGoals();
  };

  if (!data) return null;

  const yearAhead = data.pace_actual >= data.pace_target;

  return (
    <div className="min-h-screen bg-pl-bg max-w-md mx-auto px-[18px]" style={{ paddingBottom: 96 }}>
      {/* Header */}
      <div className="flex items-end justify-between pt-6 pb-4">
        <div>
          <div className="font-extrabold" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>Monthly goals</div>
          <div className="text-pl-muted-2 mt-[2px]" style={{ fontSize: 13 }}>Set each month. The year is the sum.</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setYear(year - 1)} className="bg-pl-card text-pl-text rounded px-[10px] py-[2px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>‹</button>
          <span className="font-bold pl-mono" style={{ fontSize: 16 }}>{year}</span>
          <button onClick={() => setYear(year + 1)} className="bg-pl-card text-pl-text rounded px-[10px] py-[2px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>›</button>
        </div>
      </div>

      {/* Annual target card */}
      <div className="bg-pl-card rounded-[14px] p-[18px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 10, letterSpacing: '0.16em' }}>{year} annual target</div>
        <div className="flex items-baseline gap-[9px] mt-2">
          <span className="pl-mono font-semibold" style={{ fontSize: 34, letterSpacing: '-0.02em' }}>{fmtMoney(data.annual_target)}</span>
          <span className="text-pl-muted-2" style={{ fontSize: 13 }}>= sum of 12 months</span>
        </div>
        <div className="mt-[6px] font-semibold" style={{ fontSize: 12, color: yearAhead ? PL_ACCENT : PL_CLAY }}>
          {fmtMoney(data.annual_actual)} earned so far · {yearAhead ? 'ahead of pace +' : 'behind pace −'}{fmtMoney(Math.abs(data.pace_delta))}
        </div>
        <div className="text-pl-faint mt-1" style={{ fontSize: 11 }}>
          (earned vs goal through {MONTH_NAMES[data.current_month - 1]})
        </div>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {data.months.map((m) => {
          const future = year > thisYear || (year === thisYear && m.month > data.current_month);
          const isCurrent = year === thisYear && m.month === data.current_month;
          const met = !future && m.goal > 0 && m.actual >= m.goal;
          const pct = m.goal > 0 ? Math.min(100, Math.round((m.actual / m.goal) * 100)) : 0;
          const barColor = future ? 'rgba(255,255,255,0.12)' : (met ? PL_ACCENT : PL_CLAY);
          const tag = isCurrent ? 'now' : (future ? '' : (m.goal > 0 ? (met ? '✓' : '✗') : ''));
          return (
            <button
              key={m.month}
              onClick={() => openEdit(m)}
              className="text-left rounded-[11px] p-[11px]"
              style={{
                background: isCurrent ? 'rgba(255,106,26,0.08)' : (future ? '#15130F' : '#1A1814'),
                border: `1px solid ${isCurrent ? PL_ACCENT : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase" style={{ fontSize: 12, letterSpacing: '0.04em', color: isCurrent ? PL_ACCENT : (future ? '#6E665A' : '#F2EDE4') }}>
                  {MONTH_NAMES[m.month - 1]}
                </span>
                <span className="pl-mono" style={{ fontSize: 10, color: met ? PL_ACCENT : (future ? '#6E665A' : (tag === '✗' ? PL_CLAY : '#6E665A')) }}>{tag}</span>
              </div>
              <div className="pl-mono font-semibold mt-[7px]" style={{ fontSize: 15, color: future || m.actual === 0 ? '#6E665A' : '#F2EDE4' }}>
                {future || m.actual === 0 ? '—' : fmtMoney(m.actual)}
              </div>
              <div className="pl-mono text-pl-faint" style={{ fontSize: 10 }}>goal {m.goal > 0 ? fmtMoney(m.goal) : '—'}</div>
              <div className="mt-[9px] h-[5px] rounded-[3px] overflow-hidden" style={{ background: '#0C0B09' }}>
                <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: barColor }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Edit sheet */}
      {editing != null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setEditing(null)}>
          <div className="bg-pl-card w-full max-w-md rounded-t-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div className="font-bold" style={{ fontSize: 18 }}>{MONTH_NAMES[editing - 1]} {year} goal</div>
            <div className="text-pl-muted-2 mt-1" style={{ fontSize: 13 }}>Gross profit target for the month.</div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-pl-muted" style={{ fontSize: 18 }}>$</span>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                value={draft}
                placeholder="0"
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 bg-pl-inset text-pl-text px-3 py-2 rounded-lg pl-mono"
                style={{ border: '1px solid rgba(255,255,255,0.1)', fontSize: 18 }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveMonth} disabled={saving} className="flex-1 py-3 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-lg font-semibold bg-pl-panel text-pl-text" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="goals" />
    </div>
  );
}
