'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState({
    grossHourlyGoal: '195',
    netHourlyGoal: '120',
    yearlyGoalHours: '2000',
  });

  const handleFinish = async () => {
    // Save goals to settings
    await fetch('/api/settings/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gross_hourly_goal: parseFloat(goals.grossHourlyGoal),
        net_hourly_goal: parseFloat(goals.netHourlyGoal),
        yearly_goal_hours: parseFloat(goals.yearlyGoalHours),
      }),
    });

    router.push('/');
  };

  return (
    <div className="min-h-screen bg-dark-gray flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Step {step} of 3</span>
            <span className="text-sm text-safety-orange">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="h-2 bg-medium-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-safety-orange transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="bg-medium-gray rounded-lg p-8 border border-light-gray">
            <h1 className="text-3xl font-bold text-white mb-4">
              Welcome to <span className="text-safety-orange">ProfitLevel</span>! 👋
            </h1>
            <p className="text-gray-300 mb-6 text-lg">
              Let's get you set up in under 2 minutes. We'll help you track your true hourly rate and maximize your profits.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="text-safety-orange text-2xl">💰</div>
                <div>
                  <h3 className="font-bold text-white mb-1">See Your Real Earnings</h3>
                  <p className="text-gray-400 text-sm">
                    Not just revenue—know your actual profit after all expenses
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-safety-orange text-2xl">📊</div>
                <div>
                  <h3 className="font-bold text-white mb-1">Track Every Job</h3>
                  <p className="text-gray-400 text-sm">
                    Materials, labor, mileage, and overhead—all in one place
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-safety-orange text-2xl">🎯</div>
                <div>
                  <h3 className="font-bold text-white mb-1">Hit Your Goals</h3>
                  <p className="text-gray-400 text-sm">
                    Set profit targets and get instant feedback on every job
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-safety-orange text-dark-gray py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition-all"
            >
              Let's Get Started →
            </button>
          </div>
        )}

        {/* Step 2: Set Goals */}
        {step === 2 && (
          <div className="bg-medium-gray rounded-lg p-8 border border-light-gray">
            <h2 className="text-3xl font-bold text-white mb-4">
              What Are Your Profit Goals? 🎯
            </h2>
            <p className="text-gray-300 mb-6">
              These help you see if each job is worth your time. Don't worry—you can change these anytime.
            </p>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-white font-semibold mb-2">
                  Gross Hourly Goal (before overhead)
                </label>
                <p className="text-sm text-gray-400 mb-3">
                  What do you want to make per hour before fixed costs? Industry average: $150-250/hr
                </p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    value={goals.grossHourlyGoal}
                    onChange={(e) => setGoals({ ...goals, grossHourlyGoal: e.target.value })}
                    className="w-full bg-dark-gray border border-light-gray rounded-lg py-3 pl-8 pr-4 text-white text-lg focus:outline-none focus:border-safety-orange"
                    placeholder="195"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">/hr</span>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Net Hourly Goal (after overhead)
                </label>
                <p className="text-sm text-gray-400 mb-3">
                  What you actually take home per hour. Industry average: $80-150/hr
                </p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    value={goals.netHourlyGoal}
                    onChange={(e) => setGoals({ ...goals, netHourlyGoal: e.target.value })}
                    className="w-full bg-dark-gray border border-light-gray rounded-lg py-3 pl-8 pr-4 text-white text-lg focus:outline-none focus:border-safety-orange"
                    placeholder="120"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">/hr</span>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Yearly Billable Hours Goal
                </label>
                <p className="text-sm text-gray-400 mb-3">
                  How many hours do you want to work this year? Standard: 1,800-2,200 hrs
                </p>
                <input
                  type="number"
                  value={goals.yearlyGoalHours}
                  onChange={(e) => setGoals({ ...goals, yearlyGoalHours: e.target.value })}
                  className="w-full bg-dark-gray border border-light-gray rounded-lg py-3 px-4 text-white text-lg focus:outline-none focus:border-safety-orange"
                  placeholder="2000"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-dark-gray border border-light-gray text-white py-4 rounded-lg font-bold hover:bg-opacity-80 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-safety-orange text-dark-gray py-4 rounded-lg font-bold hover:bg-opacity-90 transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Quick Tutorial */}
        {step === 3 && (
          <div className="bg-medium-gray rounded-lg p-8 border border-light-gray">
            <h2 className="text-3xl font-bold text-white mb-4">
              Here's How It Works 📚
            </h2>
            <p className="text-gray-300 mb-6">
              Three simple steps to track profitability on every job:
            </p>

            <div className="space-y-6 mb-8">
              <div className="bg-dark-gray p-5 rounded-lg border border-light-gray">
                <div className="flex items-start gap-4">
                  <div className="bg-safety-orange text-dark-gray w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-2">Add a Job</h3>
                    <p className="text-gray-400 text-sm">
                      Click "Add Job" and enter the job name, contract price, date, and hours worked. Takes 30 seconds.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-gray p-5 rounded-lg border border-light-gray">
                <div className="flex items-start gap-4">
                  <div className="bg-safety-orange text-dark-gray w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-2">Track Costs</h3>
                    <p className="text-gray-400 text-sm">
                      Click on the job and add materials, labor costs, and mileage. Everything auto-calculates your profit.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-gray p-5 rounded-lg border border-light-gray">
                <div className="flex items-start gap-4">
                  <div className="bg-safety-orange text-dark-gray w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-2">See Your Numbers</h3>
                    <p className="text-gray-400 text-sm">
                      Instantly see gross profit, net profit, and your true hourly rate. Track overhead in the "Overhead" tab.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-dark-gray p-4 rounded-lg border border-safety-orange mb-8">
              <p className="text-sm text-gray-300">
                <span className="text-safety-orange font-bold">💡 Pro Tip:</span> Check the "Financials" page to see monthly and yearly summaries of your business health.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-dark-gray border border-light-gray text-white py-4 rounded-lg font-bold hover:bg-opacity-80 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 bg-safety-orange text-dark-gray py-4 rounded-lg font-bold hover:bg-opacity-90 transition-all"
              >
                Go to Dashboard! 🚀
              </button>
            </div>
          </div>
        )}

        {/* Skip button */}
        {step < 3 && (
          <button
            onClick={() => router.push('/')}
            className="w-full text-center text-gray-400 hover:text-white mt-4 text-sm"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
