'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DayRateSummary {
  targets: Record<string, number>;
  tier_counts: { full: number; half: number; short: number; visit: number };
  total_day_units: number;
  target_total: number;
  actual_total: number;
  avg_per_day: number | null;
  jobs_tagged: number;
  jobs_met: number;
}

interface MonthOverview {
  revenue: number;
  net_profit: number;
  net_hourly_rate: number;
  billable_hours: number;
  job_count: number;
  overhead: number;
  day_rate?: DayRateSummary;
}

const TIER_META: { key: 'full' | 'half' | 'short' | 'visit'; label: string }[] = [
  { key: 'full', label: 'Full' },
  { key: 'half', label: 'Half' },
  { key: 'short', label: 'Short' },
  { key: 'visit', label: 'Visit' },
];

interface MonthlyGoals {
  months: { month: number; goal: number; actual: number }[];
  pace_target: number;
  pace_actual: number;
  pace_delta: number;
  annual_target: number;
  current_month: number;
}

export default function MonthOverviewCard() {
  const router = useRouter();
  const [overview, setOverview] = useState<MonthOverview | null>(null);
  const [netGoal, setNetGoal] = useState(120);
  const [goals, setGoals] = useState<MonthlyGoals | null>(null);

  useEffect(() => {
    fetchOverview();
    fetchGoals();
    fetchMonthlyGoals();
  }, []);

  const fetchOverview = async () => {
    const res = await fetch('/api/business-health');
    const data = await res.json();
    setOverview(data);
  };

  const fetchGoals = async () => {
    const res = await fetch('/api/settings/goals');
    const data = await res.json();
    setNetGoal(parseFloat(data.net_hourly_goal));
  };

  const fetchMonthlyGoals = async () => {
    const res = await fetch(`/api/monthly-goals?year=${new Date().getFullYear()}`);
    if (res.ok) setGoals(await res.json());
  };

  if (!overview) return null;

  const profitColor = overview.net_profit >= 0 ? 'text-green-500' : 'text-red-500';
  const hourlyRateColor = overview.net_hourly_rate >= netGoal ? 'text-green-500' :
                          overview.net_hourly_rate >= netGoal * 0.8 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="bg-medium-gray p-4 rounded-lg mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-white">📊 This Month</h3>
        <button
          onClick={() => router.push('/overhead')}
          className="text-safety-orange text-sm font-semibold hover:underline"
        >
          Manage Overhead →
        </button>
      </div>

      <div className="space-y-3">
        {/* Revenue */}
        <div>
          <div className="text-xs text-gray-400">Revenue</div>
          <div className="text-2xl font-bold text-safety-orange">
            ${overview.revenue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            {overview.job_count} jobs
          </div>
        </div>

        {/* Net Profit */}
        <div className="pt-2 border-t border-light-gray">
          <div className="text-xs text-gray-400">Net Profit</div>
          <div className={`text-3xl font-bold ${profitColor}`}>
            ${overview.net_profit.toFixed(2)}
          </div>
          {overview.revenue > 0 && (
            <div className="text-xs text-gray-500">
              {((overview.net_profit / overview.revenue) * 100).toFixed(1)}% margin
            </div>
          )}
        </div>

        {/* Monthly income goal + annual pace */}
        {goals && (() => {
          const cm = goals.months.find((m) => m.month === goals.current_month);
          const monthGoal = cm?.goal || 0;
          const monthActual = cm?.actual || 0;
          if (monthGoal === 0 && goals.annual_target === 0) {
            return (
              <div className="pt-2 border-t border-light-gray">
                <button onClick={() => router.push('/goals')} className="text-xs text-safety-orange hover:underline">
                  🎯 Set your monthly income goals →
                </button>
              </div>
            );
          }
          const monthOnGoal = monthActual >= monthGoal;
          const paceOn = goals.pace_actual >= goals.pace_target;
          return (
            <div className="pt-2 border-t border-light-gray">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400">This Month vs Goal</div>
                <button onClick={() => router.push('/goals')} className="text-xs text-safety-orange hover:underline">
                  Edit goals →
                </button>
              </div>
              {monthGoal > 0 ? (
                <>
                  <div className={`text-2xl font-bold ${monthOnGoal ? 'text-green-500' : 'text-red-500'}`}>
                    ${monthActual.toFixed(0)}<span className="text-gray-500 text-base"> / ${monthGoal.toFixed(0)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {monthOnGoal ? '+' : ''}${(monthActual - monthGoal).toFixed(0)} {monthOnGoal ? 'over goal' : 'to go'}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">No goal set for this month</div>
              )}
              {/* Annual pace */}
              <div className="mt-2 pt-2 border-t border-light-gray text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>On pace for the year</span>
                  <span className={paceOn ? 'text-green-500' : 'text-red-500'}>
                    ${goals.pace_actual.toFixed(0)} / ${goals.pace_target.toFixed(0)}
                    {' '}({paceOn ? '+' : ''}${goals.pace_delta.toFixed(0)})
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Full-year target</span>
                  <span>${goals.annual_target.toFixed(0)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Day-Rate Performance */}
        {overview.day_rate && overview.day_rate.jobs_tagged > 0 && (() => {
          const dr = overview.day_rate;
          const onTarget = dr.actual_total >= dr.target_total;
          const dayColor = onTarget ? 'text-green-500' :
                           dr.actual_total >= dr.target_total * 0.8 ? 'text-yellow-500' : 'text-red-500';
          const avgGoal = dr.total_day_units > 0 ? dr.target_total / dr.total_day_units : 0;
          return (
            <div className="pt-2 border-t border-light-gray">
              <div className="text-xs text-gray-400">Avg per Day</div>
              <div className={`text-2xl font-bold ${dayColor}`}>
                {dr.avg_per_day != null ? `$${dr.avg_per_day.toFixed(0)}` : '—'}/day
              </div>
              <div className="text-xs text-gray-500">
                Goal: ${avgGoal.toFixed(0)}/day • {dr.jobs_met}/{dr.jobs_tagged} jobs hit target
              </div>
              {/* Target vs actual */}
              <div className="mt-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Day-rate target ({dr.total_day_units} days)</span>
                  <span className="text-white">${dr.target_total.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Actual gross</span>
                  <span className={onTarget ? 'text-green-500' : 'text-red-500'}>
                    ${dr.actual_total.toFixed(0)} ({dr.actual_total - dr.target_total >= 0 ? '+' : ''}
                    ${(dr.actual_total - dr.target_total).toFixed(0)})
                  </span>
                </div>
              </div>
              {/* Tier counts */}
              <div className="mt-2 flex gap-2">
                {TIER_META.map(({ key, label }) => (
                  dr.tier_counts[key] > 0 && (
                    <span key={key} className="text-xs bg-light-gray px-2 py-0.5 rounded text-gray-300">
                      {dr.tier_counts[key]} {label}
                    </span>
                  )
                ))}
              </div>
            </div>
          );
        })()}

        {/* Net Hourly Rate (secondary, legacy) */}
        {overview.billable_hours > 0 && (
          <div className="pt-2 border-t border-light-gray">
            <div className="text-xs text-gray-500">
              Net hourly: <span className={hourlyRateColor}>${overview.net_hourly_rate.toFixed(2)}/hr</span>
              {' '}· {overview.billable_hours.toFixed(1)}h logged
            </div>
          </div>
        )}

        {/* Overhead */}
        <div className="pt-2 border-t border-light-gray">
          <div className="text-xs text-gray-400">Overhead</div>
          <div className="text-lg font-bold text-white">
            ${overview.overhead.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
