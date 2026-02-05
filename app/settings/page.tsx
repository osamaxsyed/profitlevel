'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { IRSRate } from '@/lib/types';

export default function Settings() {
  const router = useRouter();
  const [rates, setRates] = useState<IRSRate[]>([]);
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState({ year: '', rate: '' });

  const [grossGoal, setGrossGoal] = useState('195');
  const [netGoal, setNetGoal] = useState('120');
  const [yearlyGoalHours, setYearlyGoalHours] = useState('2000');

  useEffect(() => {
    fetchRates();
    fetchGoals();
  }, []);

  const fetchRates = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    setRates(data);
  };

  const fetchGoals = async () => {
    const res = await fetch('/api/settings/goals');
    const data = await res.json();
    if (data.gross_hourly_goal) setGrossGoal(data.gross_hourly_goal);
    if (data.net_hourly_goal) setNetGoal(data.net_hourly_goal);
    if (data.yearly_goal_hours) setYearlyGoalHours(data.yearly_goal_hours);
  };

  const addRate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: parseInt(newRate.year),
        rate: parseFloat(newRate.rate),
      }),
    });
    setNewRate({ year: '', rate: '' });
    setShowAddRate(false);
    fetchRates();
  };

  const updateGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/settings/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gross_hourly_goal: parseFloat(grossGoal),
        net_hourly_goal: parseFloat(netGoal),
        yearly_goal_hours: parseFloat(yearlyGoalHours),
      }),
    });
    alert('Goals updated successfully!');
  };

  return (
    <div className="min-h-screen bg-dark-gray">
      {/* Header */}
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

        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

        {/* Profit Goals */}
        <div className="mb-8 bg-medium-gray p-4 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">Profit Goals</h3>
          <form onSubmit={updateGoals}>
            <div className="mb-3">
              <label className="text-sm text-gray-400 block mb-1">
                Gross Hourly Goal ($/hr)
              </label>
              <input
                type="number"
                step="0.01"
                value={grossGoal}
                onChange={(e) => setGrossGoal(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded"
                required
              />
            </div>
            <div className="mb-3">
              <label className="text-sm text-gray-400 block mb-1">
                Net Hourly Goal ($/hr)
              </label>
              <input
                type="number"
                step="0.01"
                value={netGoal}
                onChange={(e) => setNetGoal(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded"
                required
              />
            </div>
            <div className="mb-3">
              <label className="text-sm text-gray-400 block mb-1">
                Yearly Goal Hours (for overhead burden rate)
              </label>
              <input
                type="number"
                step="1"
                value={yearlyGoalHours}
                onChange={(e) => setYearlyGoalHours(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                Used to calculate hourly burden rate: Total Yearly Overhead / Goal Hours
              </div>
            </div>
            <button type="submit" className="w-full bg-safety-orange text-white py-2 rounded font-semibold">
              Save Goals
            </button>
          </form>
          <div className="mt-4 text-xs text-gray-400">
            <div className="mb-1">
              <span className="text-green-500">● Green</span>: Above Gross Goal
            </div>
            <div className="mb-1">
              <span className="text-yellow-500">● Yellow</span>: Between Net and Gross
            </div>
            <div>
              <span className="text-red-500">● Red</span>: Below Net Goal
            </div>
          </div>
        </div>

        {/* IRS Mileage Rates */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">IRS Mileage Rates by Year</h3>
            <button
              onClick={() => setShowAddRate(true)}
              className="bg-safety-orange text-white px-3 py-1 rounded text-sm font-semibold"
            >
              + Add Rate
            </button>
          </div>

          {showAddRate && (
            <form onSubmit={addRate} className="bg-medium-gray p-4 rounded-lg mb-4">
              <input
                type="number"
                placeholder="Year (e.g., 2024)"
                value={newRate.year}
                onChange={(e) => setNewRate({ ...newRate, year: e.target.value })}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
                min="2000"
                max="2100"
              />
              <input
                type="number"
                step="0.001"
                placeholder="Rate per mile (e.g., 0.67)"
                value={newRate.rate}
                onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
                min="0"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-safety-orange text-white py-2 rounded font-semibold">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRate(false)}
                  className="flex-1 bg-light-gray text-white py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {rates.map((rate) => (
              <div key={rate.id} className="bg-medium-gray p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-semibold text-lg">{rate.year}</div>
                    <div className="text-gray-400 text-sm">
                      ${rate.rate.toFixed(3)} per mile
                    </div>
                  </div>
                  <div className="text-safety-orange text-xl font-bold">
                    ${rate.rate.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-medium-gray p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">How it works:</h4>
            <p className="text-gray-400 text-sm">
              When you add mileage to a job, ProfitLevel automatically uses the IRS standard
              mileage rate for that job's year. If no rate exists for a specific year,
              it uses the most recent available rate.
            </p>
          </div>
        </div>

        {/* Link to Overhead */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/overhead')}
            className="w-full bg-medium-gray text-white py-3 rounded-lg font-semibold hover:bg-light-gray transition"
          >
            Manage Business Overhead →
          </button>
        </div>
      </main>
    </div>
  );
}
