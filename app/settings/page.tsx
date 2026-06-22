'use client';

import { useState, useEffect } from 'react';
import type { IRSRate } from '@/lib/types';
import { toast } from 'sonner';
import PageHeader from '../components/pl/PageHeader';
import BottomNav from '../components/pl/BottomNav';
import { fmtMoney, TIER_ORDER, TIER_LABELS, DEFAULT_DAY_RATE_TARGETS, PL_ACCENT, type DayTier } from '@/lib/dayRate';

const TIER_NOTE: Record<DayTier, string> = {
  full: 'A full day on one job (~5h+).',
  half: 'About half a day (~2.5–5h).',
  short: 'A quick 1–2.5h job.',
  visit: 'A site visit / estimate (~1h).',
};

export default function Settings() {
  const [rates, setRates] = useState<IRSRate[]>([]);
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState({ year: '', rate: '' });
  const [isAddingRate, setIsAddingRate] = useState(false);

  const [targets, setTargets] = useState<Record<DayTier, string>>({
    full: String(DEFAULT_DAY_RATE_TARGETS.full),
    half: String(DEFAULT_DAY_RATE_TARGETS.half),
    short: String(DEFAULT_DAY_RATE_TARGETS.short),
    visit: String(DEFAULT_DAY_RATE_TARGETS.visit),
  });
  const [savingTargets, setSavingTargets] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setRates).catch(() => {});
    fetch('/api/settings/day-rates')
      .then((r) => r.json())
      .then((d) => setTargets({ full: String(d.full), half: String(d.half), short: String(d.short), visit: String(d.visit) }))
      .catch(() => {});
  }, []);

  const saveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTargets(true);
    try {
      const body: Record<string, number> = {};
      for (const t of TIER_ORDER) body[t] = parseFloat(targets[t]) || 0;
      const res = await fetch('/api/settings/day-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success('Day-rate targets saved');
    } catch {
      toast.error('Failed to save targets');
    } finally {
      setSavingTargets(false);
    }
  };

  const addRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingRate(true);
    try {
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: parseInt(newRate.year), rate: parseFloat(newRate.rate) }) });
      if (!res.ok) throw new Error();
      setNewRate({ year: '', rate: '' });
      setShowAddRate(false);
      fetch('/api/settings').then((r) => r.json()).then(setRates);
      toast.success('Mileage rate added');
    } catch {
      toast.error('Failed to add rate');
    } finally {
      setIsAddingRate(false);
    }
  };

  const fieldStyle = { border: '1px solid rgba(255,255,255,0.1)' } as const;

  return (
    <div className="min-h-screen bg-pl-bg max-w-md mx-auto px-[18px]" style={{ paddingBottom: 96 }}>
      <PageHeader title="Settings" subtitle="Day-rate targets & mileage" />

      {/* Day-rate targets */}
      <form onSubmit={saveTargets} className="bg-pl-card rounded-2xl p-5 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Day-rate targets</div>
        <div className="text-pl-muted-2 mt-1 mb-3" style={{ fontSize: 12 }}>Gross-profit goal for each type of day. A job clears when it beats its tier.</div>
        <div className="flex flex-col gap-2">
          {TIER_ORDER.map((t) => (
            <div key={t} className="flex items-center gap-3 rounded-[11px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex-1">
                <div className="font-bold" style={{ fontSize: 14 }}>{TIER_LABELS[t]}</div>
                <div className="text-pl-muted-2" style={{ fontSize: 11 }}>{TIER_NOTE[t]}</div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-pl-muted" style={{ fontSize: 15 }}>$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targets[t]}
                  onChange={(e) => setTargets({ ...targets, [t]: e.target.value })}
                  className="w-24 bg-pl-inset text-pl-text px-2 py-2 rounded-lg pl-mono text-right"
                  style={fieldStyle}
                />
              </div>
            </div>
          ))}
        </div>
        <button type="submit" disabled={savingTargets} className="w-full mt-3 py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04', opacity: savingTargets ? 0.6 : 1 }}>
          {savingTargets ? 'Saving…' : 'Save targets'}
        </button>
      </form>

      {/* IRS mileage rates */}
      <div className="bg-pl-card rounded-2xl p-5 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Mileage rates by year</div>
          <button onClick={() => setShowAddRate(!showAddRate)} className="font-bold rounded-lg" style={{ fontSize: 12, padding: '6px 12px', background: PL_ACCENT, color: '#1A0E04' }}>{showAddRate ? 'Cancel' : '+ Add'}</button>
        </div>
        <div className="text-pl-muted-2 mt-1" style={{ fontSize: 12 }}>Used to cost mileage on each job (IRS standard rate).</div>

        {showAddRate && (
          <form onSubmit={addRate} className="mt-3 rounded-[11px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input type="number" placeholder="Year (e.g. 2026)" value={newRate.year} onChange={(e) => setNewRate({ ...newRate, year: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2 pl-mono" style={fieldStyle} required />
            <input type="number" step="0.001" placeholder="Rate per mile (e.g. 0.67)" value={newRate.rate} onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2 pl-mono" style={fieldStyle} required />
            <button type="submit" disabled={isAddingRate} className="w-full py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04', opacity: isAddingRate ? 0.6 : 1 }}>{isAddingRate ? 'Adding…' : 'Add rate'}</button>
          </form>
        )}

        <div className="flex flex-col gap-2 mt-3">
          {rates.length === 0 && <div className="text-pl-muted" style={{ fontSize: 13 }}>No rates set.</div>}
          {rates.map((r) => (
            <div key={r.year} className="flex justify-between items-center rounded-[9px] px-3 py-2" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="pl-mono" style={{ fontSize: 14 }}>{r.year}</span>
              <span className="pl-mono font-semibold" style={{ fontSize: 14 }}>${r.rate.toFixed(3)}/mi</span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="more" />
    </div>
  );
}
