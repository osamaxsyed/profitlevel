'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TIER_ORDER, TIER_LABELS, DEFAULT_DAY_RATE_TARGETS, fmtMoney, PL_ACCENT, type DayTier } from '@/lib/dayRate';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [targets, setTargets] = useState<Record<DayTier, string>>({
    full: String(DEFAULT_DAY_RATE_TARGETS.full),
    half: String(DEFAULT_DAY_RATE_TARGETS.half),
    short: String(DEFAULT_DAY_RATE_TARGETS.short),
    visit: String(DEFAULT_DAY_RATE_TARGETS.visit),
  });
  const [monthGoal, setMonthGoal] = useState('');

  const finish = async (saveData: boolean) => {
    if (saveData) {
      setSaving(true);
      try {
        const body: Record<string, number> = {};
        for (const t of TIER_ORDER) body[t] = parseFloat(targets[t]) || 0;
        await fetch('/api/settings/day-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

        const goal = parseFloat(monthGoal);
        if (Number.isFinite(goal) && goal > 0) {
          const now = new Date();
          await fetch('/api/monthly-goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: now.getFullYear(), month: now.getMonth() + 1, amount: goal }) });
        }
      } catch {
        /* proceed regardless */
      } finally {
        setSaving(false);
      }
    }
    router.push('/');
  };

  const fieldStyle = { border: '1px solid rgba(255,255,255,0.1)' } as const;
  const primaryBtn = { background: PL_ACCENT, color: '#1A0E04' } as const;

  return (
    <div className="min-h-screen bg-pl-bg flex flex-col items-center justify-center px-[18px]">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-pl-muted-2" style={{ fontSize: 13 }}>Step {step} of 3</span>
            <span className="pl-mono" style={{ fontSize: 13, color: PL_ACCENT }}>{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1A1814' }}>
            <div className="h-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%`, background: PL_ACCENT }} />
          </div>
        </div>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="bg-pl-card rounded-2xl p-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="font-extrabold" style={{ fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Welcome to Profit<span style={{ color: PL_ACCENT }}>Level</span></div>
            <p className="text-pl-text-2 mt-3" style={{ fontSize: 15, lineHeight: 1.5 }}>
              Score every job against your day rate, and see if you&apos;re on pace for your month. No timesheets, no hourly math.
            </p>
            <div className="flex flex-col gap-3 mt-5">
              {[['🧾', 'Tag each job by day type', 'Full, half, short, or a site visit.'], ['✓', 'Get a clear stamp', 'Cleared or under your day rate — instantly.'], ['📈', 'Stay on pace', 'A running level on your month and year.']].map((f, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span style={{ fontSize: 20 }}>{f[0]}</span>
                  <span>
                    <span className="block font-bold" style={{ fontSize: 14 }}>{f[1]}</span>
                    <span className="block text-pl-muted-2" style={{ fontSize: 13 }}>{f[2]}</span>
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full mt-6 py-3 rounded-lg font-bold" style={{ fontSize: 15, ...primaryBtn }}>Let&apos;s set it up →</button>
          </div>
        )}

        {/* Step 2 — Day-rate targets */}
        {step === 2 && (
          <div className="bg-pl-card rounded-2xl p-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="font-extrabold" style={{ fontSize: 22 }}>Set your day rates</div>
            <p className="text-pl-text-2 mt-2 mb-4" style={{ fontSize: 14, lineHeight: 1.5 }}>What should each type of day clear in gross profit? You can change these later.</p>
            <div className="flex flex-col gap-2">
              {TIER_ORDER.map((t) => (
                <div key={t} className="flex items-center gap-3 rounded-[11px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="flex-1 font-bold" style={{ fontSize: 14 }}>{TIER_LABELS[t]}</span>
                  <span className="text-pl-muted" style={{ fontSize: 15 }}>$</span>
                  <input type="number" inputMode="decimal" value={targets[t]} onChange={(e) => setTargets({ ...targets, [t]: e.target.value })} className="w-24 bg-pl-inset text-pl-text px-2 py-2 rounded-lg pl-mono text-right" style={fieldStyle} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-lg font-semibold bg-pl-panel text-pl-text" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>← Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-lg font-bold" style={primaryBtn}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3 — First monthly goal */}
        {step === 3 && (
          <div className="bg-pl-card rounded-2xl p-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="font-extrabold" style={{ fontSize: 22 }}>This month&apos;s goal</div>
            <p className="text-pl-text-2 mt-2 mb-4" style={{ fontSize: 14, lineHeight: 1.5 }}>
              How much gross profit do you want to make this month? Set different numbers each month later — the year is the sum.
            </p>
            <div className="flex items-center gap-2 rounded-[11px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-pl-muted" style={{ fontSize: 20 }}>$</span>
              <input type="number" inputMode="decimal" autoFocus value={monthGoal} placeholder="e.g. 7500" onChange={(e) => setMonthGoal(e.target.value)} className="flex-1 bg-transparent text-pl-text pl-mono" style={{ fontSize: 22, outline: 'none', border: 'none' }} />
            </div>
            {monthGoal && parseFloat(monthGoal) > 0 && (
              <div className="text-pl-muted-2 mt-2" style={{ fontSize: 12 }}>≈ {fmtMoney(parseFloat(monthGoal) * 12)} a year if every month matched.</div>
            )}
            <button onClick={() => finish(true)} disabled={saving} className="w-full mt-5 py-3 rounded-lg font-bold" style={{ fontSize: 15, ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Setting up…' : 'Go to dashboard 🚀'}
            </button>
            <button onClick={() => setStep(2)} className="w-full mt-2 py-2 font-semibold text-pl-muted" style={{ fontSize: 13 }}>← Back</button>
          </div>
        )}

        {step < 3 && (
          <button onClick={() => finish(false)} className="w-full mt-4 font-semibold text-pl-muted-2" style={{ fontSize: 13 }}>Skip for now</button>
        )}
      </div>
    </div>
  );
}
