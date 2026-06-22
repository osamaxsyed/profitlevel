'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LevelTube from './pl/LevelTube';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';

interface MonthlyGoals {
  months: { month: number; goal: number; actual: number }[];
  pace_target: number;
  pace_actual: number;
  pace_delta: number;
  annual_target: number;
  annual_actual: number;
  current_month: number;
}

// Dashboard "Level" card: this-month goal as a level-tube with a pace tick
// (where you should be by today), plus a year pace strip. Wired to real data
// from /api/monthly-goals.
export default function MonthOverviewCard() {
  const router = useRouter();
  const [goals, setGoals] = useState<MonthlyGoals | null>(null);

  useEffect(() => {
    fetch(`/api/monthly-goals?year=${new Date().getFullYear()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setGoals(d));
  }, []);

  if (!goals) return null;

  const cm = goals.months.find((m) => m.month === goals.current_month);
  const monthGoal = cm?.goal || 0;
  const monthActual = cm?.actual || 0;

  // No goals at all → prompt to set them.
  if (monthGoal === 0 && goals.annual_target === 0) {
    return (
      <div className="bg-pl-card rounded-2xl p-5 mb-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
          This month · goal
        </div>
        <p className="text-pl-muted mt-2" style={{ fontSize: 14 }}>
          No income goals set yet. Your month and year pace will appear here once you do.
        </p>
        <button
          onClick={() => router.push('/goals')}
          className="mt-3 font-bold"
          style={{ fontSize: 13, color: PL_ACCENT }}
        >
          🎯 Set your monthly goals →
        </button>
      </div>
    );
  }

  // Day-of-month pace: how far through the month are we.
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = goals.current_month === now.getMonth() + 1 ? now.getDate() : daysInMonth;
  const pacePct = (dayOfMonth / daysInMonth) * 100;
  const paceDollars = monthGoal * (dayOfMonth / daysInMonth);
  const monthDelta = monthActual - paceDollars;
  const aheadMonth = monthDelta >= 0;
  const monthPct = monthGoal > 0 ? (monthActual / monthGoal) * 100 : 0;

  // Year pace
  const yearAhead = goals.pace_delta >= 0;
  const yearPct = goals.annual_target > 0 ? (goals.annual_actual / goals.annual_target) * 100 : 0;
  const yearPaceTick = goals.annual_target > 0 ? (goals.pace_target / goals.annual_target) * 100 : 0;

  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* THIS MONTH · level */}
      <div className="bg-pl-card rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
            This month · goal
          </div>
          <div className="pl-mono" style={{ fontSize: 12, color: aheadMonth ? PL_ACCENT : PL_CLAY }}>
            {aheadMonth ? 'on pace ✓' : 'behind ✗'}
          </div>
        </div>

        {monthGoal > 0 ? (
          <>
            <div className="flex items-baseline gap-[9px] mt-[14px]">
              <div className="pl-mono font-semibold" style={{ fontSize: 40, letterSpacing: '-0.03em' }}>
                {fmtMoney(monthActual)}
              </div>
              <div className="pl-mono text-pl-muted-2" style={{ fontSize: 16 }}>/ {fmtMoney(monthGoal)}</div>
            </div>

            <div className="mt-[22px]">
              <LevelTube pct={monthPct} paceTick={pacePct} size="lg" showPaceLabel />
            </div>

            <div className="flex items-center gap-2 mt-[18px]">
              <span style={{ color: aheadMonth ? PL_ACCENT : PL_CLAY, fontSize: 15 }}>{aheadMonth ? '▲' : '▼'}</span>
              <span className="font-bold" style={{ fontSize: 14 }}>{aheadMonth ? 'Ahead of pace' : 'Behind pace'}</span>
              <span className="pl-mono text-pl-text-2" style={{ fontSize: 13 }}>
                {aheadMonth ? '+' : '−'}{fmtMoney(Math.abs(monthDelta))} vs. day {dayOfMonth}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-pl-muted" style={{ fontSize: 14 }}>No goal set for this month</span>
            <button onClick={() => router.push('/goals')} style={{ fontSize: 13, color: PL_ACCENT }} className="font-bold">
              Set goal →
            </button>
          </div>
        )}
      </div>

      {/* YEAR strip */}
      <div className="bg-pl-panel-2 rounded-[14px] px-[18px] py-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 10, letterSpacing: '0.16em' }}>
            On pace for the year
          </div>
          <div className="pl-mono text-pl-muted-2" style={{ fontSize: 12 }}>
            {fmtMoney(goals.annual_actual)} / {fmtMoney(goals.annual_target)}
          </div>
        </div>
        <div className="mt-3">
          <LevelTube pct={yearPct} paceTick={yearPaceTick} size="sm" />
        </div>
        <div className="mt-[9px] font-semibold" style={{ fontSize: 12, color: yearAhead ? PL_ACCENT : PL_CLAY }}>
          {yearAhead ? 'Ahead of pace · +' : 'Behind pace · −'}{fmtMoney(Math.abs(goals.pace_delta))}
          <span className="text-pl-faint font-normal"> (earned vs goal through this month)</span>
        </div>
      </div>
    </div>
  );
}
