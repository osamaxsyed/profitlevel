'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

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
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState<GoalsData | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const fetchGoals = useCallback(async () => {
    const res = await fetch(`/api/monthly-goals?year=${year}`);
    const d: GoalsData = await res.json();
    setData(d);
    const initial: Record<number, string> = {};
    d.months.forEach((m) => {
      initial[m.month] = m.goal ? String(m.goal) : '';
    });
    setDrafts(initial);
  }, [year]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const saveMonth = async (month: number) => {
    setSaving(month);
    const amount = parseFloat(drafts[month] || '0') || 0;
    await fetch('/api/monthly-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, amount }),
    });
    setSaving(null);
    toast.success(`${MONTH_NAMES[month - 1]} goal saved`);
    fetchGoals();
  };

  if (!data) return null;

  const annualOnPace = data.pace_actual >= data.pace_target;

  return (
    <div className="min-h-screen bg-dark-gray p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">🎯 Monthly Goals</h1>
        <button onClick={() => router.push('/')} className="text-safety-orange font-semibold text-sm">
          ← Back
        </button>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setYear(year - 1)} className="bg-medium-gray text-white px-3 py-1 rounded">‹</button>
        <span className="text-white font-bold text-lg">{year}</span>
        <button onClick={() => setYear(year + 1)} className="bg-medium-gray text-white px-3 py-1 rounded">›</button>
      </div>

      {/* On-pace-for-the-year summary */}
      <div className="bg-medium-gray p-4 rounded-lg mb-4">
        <div className="text-xs text-gray-400">On pace for {year}</div>
        <div className={`text-3xl font-bold ${annualOnPace ? 'text-green-500' : 'text-red-500'}`}>
          {formatCurrency(data.pace_actual)}
          <span className="text-gray-500 text-lg"> / {formatCurrency(data.pace_target)}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Through {MONTH_NAMES[data.current_month - 1]} • {annualOnPace ? '+' : ''}{formatCurrency(data.pace_delta)}{' '}
          {annualOnPace ? 'ahead of pace' : 'behind pace'}
        </div>
        <div className="mt-2 pt-2 border-t border-light-gray flex justify-between text-sm">
          <span className="text-gray-400">Full-year target</span>
          <span className="text-white">{formatCurrency(data.annual_target)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Actual so far (YTD)</span>
          <span className="text-white">{formatCurrency(data.annual_actual)}</span>
        </div>
      </div>

      {/* Per-month grid */}
      <div className="bg-medium-gray p-4 rounded-lg">
        <div className="text-xs text-gray-400 mb-2">Set each month&apos;s gross goal. Unset months count as $0.</div>
        <div className="space-y-2">
          {data.months.map((m) => {
            const hit = m.goal > 0 && m.actual >= m.goal;
            const isPast = year < thisYear || (year === thisYear && m.month < data.current_month);
            const isCurrent = year === thisYear && m.month === data.current_month;
            return (
              <div key={m.month} className="flex items-center gap-2">
                <span className={`w-10 text-sm ${isCurrent ? 'text-safety-orange font-bold' : 'text-gray-300'}`}>
                  {MONTH_NAMES[m.month - 1]}
                </span>
                <span className="text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={drafts[m.month] ?? ''}
                  placeholder="0"
                  onChange={(e) => setDrafts({ ...drafts, [m.month]: e.target.value })}
                  className="flex-1 bg-light-gray text-white px-2 py-1 rounded text-sm w-20"
                />
                <button
                  onClick={() => saveMonth(m.month)}
                  disabled={saving === m.month}
                  className="bg-safety-orange text-white px-3 py-1 rounded text-xs font-semibold disabled:opacity-50"
                >
                  {saving === m.month ? '…' : 'Save'}
                </button>
                {/* Actual vs goal indicator */}
                <span className="w-28 text-right text-xs">
                  {(isPast || isCurrent) && m.actual > 0 ? (
                    <span className={m.goal === 0 ? 'text-gray-400' : hit ? 'text-green-500' : 'text-red-500'}>
                      {formatCurrency(m.actual)}{m.goal > 0 ? (hit ? ' ✓' : ' ✗') : ''}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
