'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  billable_hours: number;
  hourly_burden_rate: number;
  yearly_goal_hours: number;
  tax_estimate: {
    taxable_income: number;
    estimated_tax_15pct: number;
    estimated_tax_25pct: number;
    estimated_tax_30pct: number;
  };
}

export default function FinancialsPage() {
  const router = useRouter();
  const [view, setView] = useState<'monthly' | 'yearly' | 'alltime'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [view, selectedMonth, selectedYear]);

  const fetchSummary = async () => {
    let params = '';
    if (view === 'monthly') {
      params = `?month=${selectedMonth}`;
    } else if (view === 'yearly') {
      params = `?year=${selectedYear}`;
    }
    // For alltime, no params needed

    const res = await fetch(`/api/financial-summary${params}`);
    const data = await res.json();
    setSummary(data);
  };

  const changeMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1); // month is 0-indexed in Date
    date.setMonth(date.getMonth() + delta);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const changeYear = (delta: number) => {
    const newYear = parseInt(selectedYear) + delta;
    setSelectedYear(newYear.toString());
  };

  if (!summary) return <div className="min-h-screen bg-dark-gray p-4 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-dark-gray">
      <header className="bg-medium-gray border-b border-light-gray px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">
          Profit<span className="text-safety-orange">Level</span>
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/overhead')}
            className="text-safety-orange font-semibold text-sm"
          >
            🏢 Overhead
          </button>
          <button
            onClick={() => router.push('/financials')}
            className="text-safety-orange font-semibold text-sm"
          >
            📊 Financials
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="text-safety-orange font-semibold text-sm"
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <button
          onClick={() => router.push('/')}
          className="mb-4 text-safety-orange font-semibold"
        >
          ← Back to Dashboard
        </button>

        <h2 className="text-2xl font-bold text-white mb-4">Financial Dashboard</h2>

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('monthly')}
            className={`flex-1 py-2 rounded font-semibold ${view === 'monthly' ? 'bg-safety-orange text-white' : 'bg-medium-gray text-gray-400'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setView('yearly')}
            className={`flex-1 py-2 rounded font-semibold ${view === 'yearly' ? 'bg-safety-orange text-white' : 'bg-medium-gray text-gray-400'}`}
          >
            Yearly
          </button>
          <button
            onClick={() => setView('alltime')}
            className={`flex-1 py-2 rounded font-semibold ${view === 'alltime' ? 'bg-safety-orange text-white' : 'bg-medium-gray text-gray-400'}`}
          >
            All Time
          </button>
        </div>

        {/* Period Selector */}
        {view !== 'alltime' && (
          <div className="mb-4">
            {view === 'monthly' ? (
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => changeMonth(-1)}
                  className="bg-medium-gray text-white px-3 py-2 rounded hover:bg-light-gray"
                >
                  ←
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-1 bg-medium-gray text-white px-3 py-2 rounded"
                />
                <button
                  onClick={() => changeMonth(1)}
                  className="bg-medium-gray text-white px-3 py-2 rounded hover:bg-light-gray"
                >
                  →
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => changeYear(-1)}
                  className="bg-medium-gray text-white px-3 py-2 rounded hover:bg-light-gray"
                >
                  ←
                </button>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  min="2020"
                  max="2100"
                  className="flex-1 bg-medium-gray text-white px-3 py-2 rounded"
                />
                <button
                  onClick={() => changeYear(1)}
                  className="bg-medium-gray text-white px-3 py-2 rounded hover:bg-light-gray"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Revenue & Net Profit */}
        <div className="bg-medium-gray p-4 rounded-lg mb-4">
          <div className="mb-4">
            <div className="text-sm text-gray-400">Total Revenue</div>
            <div className="text-3xl font-bold text-safety-orange">${summary.revenue.toFixed(2)}</div>
            <div className="text-xs text-gray-500">{summary.job_count} jobs • {summary.billable_hours.toFixed(1)} hours</div>
          </div>
          <div className="mb-4">
            <div className="text-sm text-gray-400">Net Profit</div>
            <div className={`text-3xl font-bold ${summary.net_profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${summary.net_profit.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              {summary.revenue > 0 ? `${((summary.net_profit / summary.revenue) * 100).toFixed(1)}% margin` : 'N/A'}
            </div>
          </div>
          {summary.billable_hours > 0 && (
            <div className="pt-3 border-t border-light-gray">
              <div className="text-sm text-gray-400">Net Hourly Rate</div>
              <div className="text-2xl font-bold text-white">
                ${(summary.net_profit / summary.billable_hours).toFixed(2)}/hr
              </div>
              <div className="text-xs text-gray-500">
                Net Profit ÷ Billable Hours
              </div>
            </div>
          )}
        </div>

        {/* Three-Bucket Expense Breakdown */}
        <div className="bg-medium-gray p-4 rounded-lg mb-4">
          <h3 className="text-lg font-bold text-white mb-3">📊 Three-Bucket System</h3>

          <div className="space-y-3">
            {/* Bucket A */}
            <div className="bg-light-gray p-3 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-semibold">🔧 Bucket A - Direct Costs</span>
                <span className="text-safety-orange font-bold">${summary.expenses.bucket_a_direct.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Materials: ${summary.expenses.materials.toFixed(2)}</div>
                <div>Labor/Subs: ${summary.expenses.labor.toFixed(2)}</div>
              </div>
            </div>

            {/* Bucket B */}
            <div className="bg-light-gray p-3 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-semibold">🚗 Bucket B - Variable Costs</span>
                <span className="text-safety-orange font-bold">${summary.expenses.bucket_b_variable.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-400">
                Mileage: ${summary.expenses.mileage.toFixed(2)}
              </div>
            </div>

            {/* Bucket C */}
            <div className="bg-light-gray p-3 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-semibold">🏢 Bucket C - Fixed Overhead</span>
                <span className="text-safety-orange font-bold">${summary.expenses.bucket_c_fixed.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-400">
                <div>Insurance, Software, Tools, etc.</div>
                <div className="mt-1">
                  Hourly Burden: ${summary.hourly_burden_rate.toFixed(2)}/hr
                </div>
                <div className="text-xs text-gray-500">
                  (${summary.expenses.bucket_c_fixed.toFixed(0)} YTD overhead ÷ {summary.yearly_goal_hours} goal hours)
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-dark-gray p-3 rounded border border-safety-orange">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Total Expenses (A+B+C)</span>
                <span className="text-safety-orange font-bold text-xl">${summary.expenses.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Estimator */}
        <div className="bg-medium-gray p-4 rounded-lg mb-4">
          <h3 className="text-lg font-bold text-white mb-3">💰 Tax Estimator</h3>

          <div className="mb-3">
            <div className="text-sm text-gray-400">Estimated Taxable Income</div>
            <div className="text-2xl font-bold text-white">${summary.tax_estimate.taxable_income.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Revenue - All Expenses (A+B+C)</div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">@ 15% tax rate:</span>
              <span className="text-white font-semibold">${summary.tax_estimate.estimated_tax_15pct.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">@ 25% tax rate:</span>
              <span className="text-yellow-500 font-semibold">${summary.tax_estimate.estimated_tax_25pct.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">@ 30% tax rate:</span>
              <span className="text-red-500 font-semibold">${summary.tax_estimate.estimated_tax_30pct.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 bg-light-gray p-2 rounded">
            💡 Tip: Consult with a tax professional for accurate estimates
          </div>
        </div>

        {/* Monthly Performance Note */}
        {view === 'monthly' && summary.job_count === 0 && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded p-3 text-yellow-400 text-sm">
            ⚠️ No jobs this month, but overhead costs still apply: ${summary.expenses.bucket_c_fixed.toFixed(2)}
          </div>
        )}
      </main>
    </div>
  );
}
