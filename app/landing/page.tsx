'use client';

import { useRouter } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';
import { sampleJobs, sampleMonthlyStats } from '@/lib/sampleData';
import { formatCurrency, getProfitColor } from '@/lib/utils';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-gray to-medium-gray text-white">
      {/* Navigation - Jakob's Law: familiar pattern */}
      <nav className="border-b border-light-gray">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Profit<span className="text-safety-orange">Level</span>
          </h1>
          <div className="flex gap-4 items-center">
            <SignInButton mode="modal">
              <button className="text-safety-orange font-semibold hover:underline">
                Sign In
              </button>
            </SignInButton>
            <SignInButton mode="modal" forceRedirectUrl="/onboarding" signUpForceRedirectUrl="/onboarding">
              <button className="bg-safety-orange text-dark-gray px-6 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all">
                Start Free
              </button>
            </SignInButton>
          </div>
        </div>
      </nav>

      {/* Hero Section - Fitts's Law: large, easy-to-click CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Miller's Law: 7±2 chunks of info */}
          <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            Know Your True Hourly Rate.<br />
            <span className="text-safety-orange">Maximize Your Profits.</span>
          </h2>

          {/* Hick's Law: minimize choices, clear value prop */}
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Stop guessing if you're profitable. Track every job, expense, and hour to see your real earnings—before it's too late.
          </p>

          {/* Fitts's Law: large primary CTA */}
          <SignInButton mode="modal" forceRedirectUrl="/onboarding" signUpForceRedirectUrl="/onboarding">
            <button className="bg-safety-orange text-dark-gray px-10 py-4 rounded-lg text-xl font-bold hover:scale-105 transition-transform shadow-xl">
              Start Tracking Free →
            </button>
          </SignInButton>

          {/* Social Proof - immediately below CTA */}
          <p className="text-sm text-gray-400 mt-4">
            No credit card required • Set up in under 2 minutes
          </p>
        </div>
      </section>

      {/* Problem Section - Von Restorff Effect: distinctive formatting */}
      <section className="bg-medium-gray border-y border-light-gray py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-8">
              Working Hard But Still Broke?
            </h3>
            <div className="grid sm:grid-cols-3 gap-6 text-left">
              {/* Serial Position Effect: key points in grid */}
              <div className="bg-dark-gray p-6 rounded-lg border border-light-gray">
                <div className="text-4xl mb-3">😰</div>
                <h4 className="font-bold mb-2">You're Busy, Not Profitable</h4>
                <p className="text-gray-300 text-sm">
                  You finish jobs but don't know if you actually made money after materials, labor, and overhead.
                </p>
              </div>
              <div className="bg-dark-gray p-6 rounded-lg border border-light-gray">
                <div className="text-4xl mb-3">📊</div>
                <h4 className="font-bold mb-2">Spreadsheets Are a Mess</h4>
                <p className="text-gray-300 text-sm">
                  You've tried Excel but it's tedious, error-prone, and never tells you what you need to know.
                </p>
              </div>
              <div className="bg-dark-gray p-6 rounded-lg border border-light-gray">
                <div className="text-4xl mb-3">⏰</div>
                <h4 className="font-bold mb-2">Tax Time Is a Nightmare</h4>
                <p className="text-gray-300 text-sm">
                  Scrambling to find receipts and calculate earnings at year-end costs you time and money.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section - Aesthetic-Usability Effect: clean, visual */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold mb-4">
              Track Jobs. Know Your Numbers. <span className="text-safety-orange">Grow Profits.</span>
            </h3>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built for contractors who want to know their real hourly rate—not just hope they're making money.
            </p>
          </div>

          {/* Progressive Disclosure: features revealed in chunks */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-medium-gray p-8 rounded-lg border border-light-gray">
              <div className="text-safety-orange text-2xl mb-3">💰</div>
              <h4 className="text-2xl font-bold mb-3">See Your True Hourly Rate</h4>
              <p className="text-gray-300 mb-4">
                Not just revenue per hour—see your actual profit after materials, labor, mileage, and overhead. Know if you're hitting your goals on every single job.
              </p>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>✓ Gross vs. net hourly rates</li>
                <li>✓ Per-job profitability breakdown</li>
                <li>✓ Set profit goals and track progress</li>
              </ul>
            </div>

            <div className="bg-medium-gray p-8 rounded-lg border border-light-gray">
              <div className="text-safety-orange text-2xl mb-3">📱</div>
              <h4 className="text-2xl font-bold mb-3">Track Everything in Seconds</h4>
              <p className="text-gray-300 mb-4">
                Log jobs, materials, labor, and mileage instantly. No complicated software. Just fast, mobile-friendly tracking that actually works.
              </p>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>✓ Add expenses on the go</li>
                <li>✓ Auto-calculate IRS mileage rates</li>
                <li>✓ Track overhead costs monthly</li>
              </ul>
            </div>

            <div className="bg-medium-gray p-8 rounded-lg border border-light-gray">
              <div className="text-safety-orange text-2xl mb-3">📊</div>
              <h4 className="text-2xl font-bold mb-3">Business Health Dashboard</h4>
              <p className="text-gray-300 mb-4">
                See revenue, profit, billable hours, and overhead at a glance. Know exactly how your business is performing month-to-month.
              </p>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>✓ Monthly profit & loss summary</li>
                <li>✓ Yearly financial trends</li>
                <li>✓ Tax estimate calculator</li>
              </ul>
            </div>

            <div className="bg-medium-gray p-8 rounded-lg border border-light-gray">
              <div className="text-safety-orange text-2xl mb-3">🎯</div>
              <h4 className="text-2xl font-bold mb-3">Make Better Decisions</h4>
              <p className="text-gray-300 mb-4">
                Stop guessing what to charge or which jobs are worth it. Use real data to price jobs, negotiate rates, and grow strategically.
              </p>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>✓ See which clients are most profitable</li>
                <li>✓ Track hourly burden rate from overhead</li>
                <li>✓ Know your break-even hourly rate</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Preview Section */}
      <section className="py-20 bg-dark-gray">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold mb-4">
              See It in Action
            </h3>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Here's what your dashboard looks like with real jobs. This is sample data—yours will show your actual numbers.
            </p>
          </div>

          {/* Sample Dashboard Preview */}
          <div className="max-w-4xl mx-auto">
            {/* Month Overview Card */}
            <div className="bg-medium-gray rounded-lg p-6 border border-light-gray mb-6">
              <h4 className="text-lg font-bold text-white mb-4">February 2026 Overview</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Revenue</div>
                  <div className="text-xl font-bold text-white">{formatCurrency(sampleMonthlyStats.revenue)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Net Profit</div>
                  <div className="text-xl font-bold text-green-500">{formatCurrency(sampleMonthlyStats.net_profit)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Net Hourly</div>
                  <div className="text-xl font-bold text-safety-orange">${sampleMonthlyStats.net_hourly_rate.toFixed(2)}/hr</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Hours</div>
                  <div className="text-xl font-bold text-white">{sampleMonthlyStats.billable_hours}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Jobs</div>
                  <div className="text-xl font-bold text-white">{sampleMonthlyStats.job_count}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Overhead</div>
                  <div className="text-xl font-bold text-red-400">{formatCurrency(sampleMonthlyStats.overhead)}</div>
                </div>
              </div>
            </div>

            {/* Sample Jobs List */}
            <div className="bg-medium-gray rounded-lg p-6 border border-light-gray">
              <h4 className="text-lg font-bold text-white mb-4">Recent Jobs</h4>
              <div className="space-y-3">
                {sampleJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="bg-dark-gray p-4 rounded-lg border border-light-gray">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-white">{job.name}</div>
                        <div className="text-sm text-gray-400">{job.client_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{formatCurrency(job.contract_price)}</div>
                        <div className="text-xs text-gray-400">{job.hours_spent}hrs</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Gross Profit</span>
                      <span className={`font-semibold ${getProfitColor(job.gross_hourly_rate, 195, 120)}`}>
                        {formatCurrency(job.gross_profit)} (${job.gross_hourly_rate?.toFixed(2)}/hr)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <SignInButton mode="modal" forceRedirectUrl="/onboarding" signUpForceRedirectUrl="/onboarding">
                  <button className="text-safety-orange font-semibold hover:underline">
                    See Your Own Numbers →
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Doherty Threshold: fast interactions */}
      <section className="bg-medium-gray border-y border-light-gray py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">
            Simple Enough to Actually Use
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-safety-orange text-dark-gray w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-bold text-xl mb-2">Add a Job</h4>
              <p className="text-gray-300 text-sm">
                Enter the job name, contract price, date, and hours worked. Takes 30 seconds.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-safety-orange text-dark-gray w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-bold text-xl mb-2">Track Costs</h4>
              <p className="text-gray-300 text-sm">
                Log materials, labor, and mileage as you go. Everything auto-calculates.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-safety-orange text-dark-gray w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-bold text-xl mb-2">See Your Profit</h4>
              <p className="text-gray-300 text-sm">
                Instantly see gross profit, net profit, and your true hourly rate for every job.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section - Authority Bias */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-8">
            Built for Contractors, By Someone Who Gets It
          </h3>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            No bloated features you'll never use. No complicated accounting jargon. Just the numbers you need to know if you're actually making money.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-safety-orange text-xl">✓</span>
              <span>Made for solo contractors & small crews</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-safety-orange text-xl">✓</span>
              <span>No monthly fees or hidden costs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-safety-orange text-xl">✓</span>
              <span>Your data is private & secure</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Peak-End Rule: strong finish */}
      <section className="bg-safety-orange py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold text-dark-gray mb-4">
            Stop Wondering. Start Knowing.
          </h3>
          <p className="text-xl text-dark-gray mb-8">
            Free to start. See your true hourly rate in minutes.
          </p>
          <SignInButton mode="modal" forceRedirectUrl="/onboarding" signUpForceRedirectUrl="/onboarding">
            <button className="bg-dark-gray text-safety-orange px-10 py-4 rounded-lg text-xl font-bold hover:scale-105 transition-transform shadow-xl">
              Get Started Free →
            </button>
          </SignInButton>
          <p className="text-sm text-dark-gray opacity-80 mt-4">
            No credit card • No commitment • Set up in under 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-gray border-t border-light-gray py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>&copy; 2026 ProfitLevel. Built for contractors who want to know their numbers.</p>
        </div>
      </footer>
    </div>
  );
}
