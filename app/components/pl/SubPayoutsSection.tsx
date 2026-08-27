'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';
import { type Sub, type SubPayout } from './subTypes';

// Money OUT to 1099 subs for one job. Sits beside Materials / Labor in the
// job detail screen and follows the same collapsible + inline-form pattern.

// Agreed vs paid: you log what you agreed to pay; Zelle/check payouts get matched from the
// bank feed in the CNJ dashboard and flip the row to paid. Only cash is logged here as paid.
const PAY_METHODS = [
  { value: '', label: 'Not paid yet (agreed amount)' },
  { value: 'Cash', label: 'Paid in cash' },
];

const fieldStyle = { border: '1px solid rgba(255,255,255,0.1)' } as const;

export default function SubPayoutsSection({
  jobId,
  payouts,
  total,
  onChange,
}: {
  jobId: number;
  payouts: SubPayout[];
  total: number;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [form, setForm] = useState({
    sub_id: '',
    payout: '',
    paid_via: '',
    paid_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetch('/api/subs')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setSubs(d))
      .catch(() => {});
  }, []);

  const addPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sub_id) {
      toast.error('Pick a sub first');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/sub-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          sub_id: parseInt(form.sub_id, 10),
          payout: parseFloat(form.payout),
          paid_via: form.paid_via || null,
          paid_date: form.paid_date || null,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || ''); }
      setForm({ sub_id: '', payout: '', paid_via: '', paid_date: new Date().toISOString().slice(0, 10) });
      setShowAdd(false);
      toast.success('Sub payout recorded');
      onChange();
    } catch (e) {
      toast.error((e as Error).message || 'Could not record the payout');
    } finally {
      setSaving(false);
    }
  };

  const deletePayout = async (id: number) => {
    if (!confirm('Delete this sub payout?')) return;
    try {
      const res = await fetch(`/api/sub-payouts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onChange();
    } catch {
      toast.error('Could not delete the payout');
    }
  };

  return (
    <div className="mb-6">
      <div className="bg-pl-card p-[18px] rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
            <button onClick={() => setOpen(!open)} className="text-pl-text" aria-label="Toggle sub payouts">
              <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h3 className="font-bold" style={{ fontSize: 17 }}>Sub payouts</h3>
            <span className="pl-mono font-semibold ml-1" style={{ fontSize: 15, color: total > 0 ? PL_CLAY : '#6E665A' }}>
              {total > 0 ? `−${fmtMoney(total)}` : '—'}
            </span>
          </div>
          <button
            onClick={() => { setShowAdd(true); setOpen(true); }}
            className="font-bold rounded-lg"
            style={{ fontSize: 12, padding: '6px 12px', background: PL_ACCENT, color: '#1A0E04' }}
          >
            + Add
          </button>
        </div>

        {open && (
          <>
            {showAdd && (
              <form onSubmit={addPayout} className="mt-3 rounded-[11px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' }}>
                {subs.length === 0 ? (
                  <div className="text-pl-muted mb-2" style={{ fontSize: 12.5 }}>
                    No subs on file yet — add one on the Subs screen first.
                  </div>
                ) : (
                  <select
                    value={form.sub_id}
                    onChange={(e) => setForm({ ...form, sub_id: e.target.value })}
                    className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                    style={fieldStyle}
                    required
                  >
                    <option value="">Which sub?</option>
                    {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Payout amount"
                  value={form.payout}
                  onChange={(e) => setForm({ ...form, payout: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2 pl-mono"
                  style={fieldStyle}
                  required
                />
                <select
                  value={form.paid_via}
                  onChange={(e) => setForm({ ...form, paid_via: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                  style={fieldStyle}
                >
                  {PAY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {form.paid_via === '' && (
                  <p className="text-pl-muted-2 mb-2" style={{ fontSize: 11 }}>Zelle or check? Leave this as agreed; match the payment in the CNJ dashboard Money tab when it clears.</p>
                )}
                <input
                  type="date"
                  value={form.paid_date}
                  onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                  style={fieldStyle}
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={saving || subs.length === 0} className="flex-1 py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04', opacity: saving || subs.length === 0 ? 0.5 : 1 }}>
                    {saving ? 'Saving…' : 'Save payout'}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-light-gray text-pl-text">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-2 mt-3">
              {payouts.length === 0 && !showAdd && (
                <div className="text-pl-muted" style={{ fontSize: 13 }}>
                  You worked this one yourself — no sub payouts logged.
                </div>
              )}
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-[9px] px-3 py-[10px]" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-semibold truncate" style={{ fontSize: 14 }}>{p.sub_name}</span>
                      <span className="pl-mono font-semibold" style={{ fontSize: 14, color: PL_CLAY }}>−{fmtMoney(p.payout)}</span>
                    </div>
                    <div className="text-pl-muted-2 truncate" style={{ fontSize: 11 }}>
                      {p.status === 'agreed' ? 'agreed, not paid yet' : [p.source === 'bank' ? 'paid · matched to bank' : p.paid_via, p.paid_date].filter(Boolean).join(' · ') || 'paid'}
                    </div>
                  </div>
                  <button
                    onClick={() => deletePayout(p.id)}
                    className="text-sm px-3 py-2 rounded min-h-[44px] flex items-center justify-center ml-2"
                    style={{ color: PL_CLAY }}
                  >
                    Del
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
