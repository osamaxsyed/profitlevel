'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MonthOverview {
  revenue: number;
  net_profit: number;
  net_hourly_rate: number;
  billable_hours: number;
  job_count: number;
  overhead: number;
}

export default function MonthOverviewCard() {
  const router = useRouter();
  const [overview, setOverview] = useState<MonthOverview | null>(null);
  const [netGoal, setNetGoal] = useState(120);

  useEffect(() => {
    fetchOverview();
    fetchGoals();
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
            {overview.job_count} jobs • {overview.billable_hours.toFixed(1)} hours
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

        {/* Net Hourly Rate */}
        {overview.billable_hours > 0 && (
          <div className="pt-2 border-t border-light-gray">
            <div className="text-xs text-gray-400">Net Hourly Rate</div>
            <div className={`text-2xl font-bold ${hourlyRateColor}`}>
              ${overview.net_hourly_rate.toFixed(2)}/hr
            </div>
            <div className="text-xs text-gray-500">
              Goal: ${netGoal}/hr
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
