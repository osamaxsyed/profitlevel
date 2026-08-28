'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';
import PaidChip from './PaidChip';
import { num, type JobPayment, type PaidStatus } from './crewTypes';

// Money IN for one job: what the client has actually paid, against the
// contract price. Mirrors the Materials/Labor/Mileage collapsible pattern
// used elsewhere in the job detail screen.

const PAY_METHODS = ['Check', 'Zelle', 'Cash', 'Card', 'ACH', 'Other'];

const fieldStyle = { border: '1px solid rgba(255,255,255,0.1)' } as const;

export default function JobPaymentsSection({
  jobId,
  contractPrice,
  payments,
  amountPaid,
  outstanding,
  paidStatus,
  onChange,
}: {
  jobId: number;
  contractPrice: number;
  payments: JobPayment[];
  amountPaid: number;
  outstanding: number;
  paidStatus?: PaidStatus;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    method: 'Check',
    paid_date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  const paid = num(amountPaid);
  const due = num(outstanding);
  const pct = contractPrice > 0 ? Math.min(100, (paid / contractPrice) * 100) : 0;

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/job-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          amount: parseFloat(form.amount),
          method: form.method || null,
          paid_date: form.paid_date || null,
          note: form.note || null,
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ amount: '', method: 'Check', paid_date: new Date().toISOString().slice(0, 10), note: '' });
      setShowAdd(false);
      toast.success('Payment recorded');
      onChange();
    } catch {
      toast.error('Could not record the payment');
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (id: number) => {
    if (!confirm('Delete this payment?')) return;
    try {
      const res = await fetch(`/api/job-payments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onChange();
    } catch {
      toast.error('Could not delete the payment');
    }
  };

  return (
    <div className="mb-6">
      <div className="bg-pl-card p-[18px] rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
            <button onClick={() => setOpen(!open)} className="text-pl-text" aria-label="Toggle payments">
              <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h3 className="font-bold" style={{ fontSize: 17 }}>Payments</h3>
            {paidStatus && <PaidChip status={paidStatus} />}
          </div>
          <button
            onClick={() => { setShowAdd(true); setOpen(true); }}
            className="font-bold rounded-lg"
            style={{ fontSize: 12, padding: '6px 12px', background: PL_ACCENT, color: '#1A0E04' }}
          >
            + Add
          </button>
        </div>

        {/* Collected vs contract */}
        <div className="mt-3">
          <div className="flex items-baseline justify-between pl-mono">
            <span className="font-semibold" style={{ fontSize: 20 }}>{fmtMoney(paid)}</span>
            <span className="text-pl-muted-2" style={{ fontSize: 13 }}>of {fmtMoney(contractPrice)}</span>
          </div>
          <div className="mt-[8px] rounded-full overflow-hidden" style={{ height: 6, background: '#0C0B09' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: due > 0 ? '#E8B530' : PL_ACCENT }} />
          </div>
          {due > 0 && (
            <div className="mt-[8px] pl-mono font-semibold" style={{ fontSize: 12.5, color: '#E8B530' }}>
              {fmtMoney(due)}<span className="text-pl-muted font-normal" style={{ fontFamily: 'var(--font-archivo)' }}> still owed</span>
            </div>
          )}
        </div>

        {open && (
          <>
            {showAdd && (
              <form onSubmit={addPayment} className="mt-3 rounded-[11px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Amount received"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2 pl-mono"
                  style={fieldStyle}
                  required
                />
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                  style={fieldStyle}
                >
                  {PAY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="date"
                  value={form.paid_date}
                  onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                  style={fieldStyle}
                />
                <input
                  type="text"
                  placeholder="Note (optional) — e.g. deposit, final"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                  style={fieldStyle}
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04', opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Saving…' : 'Save payment'}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-light-gray text-pl-text">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-2 mt-3">
              {payments.length === 0 && !showAdd && (
                <div className="text-pl-muted" style={{ fontSize: 13 }}>
                  Nothing collected yet. Log each check or transfer as it lands.
                </div>
              )}
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-[9px] px-3 py-[10px]" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="pl-mono font-semibold" style={{ fontSize: 14 }}>{fmtMoney(p.amount)}</div>
                    <div className="text-pl-muted-2 truncate" style={{ fontSize: 11 }}>
                      {[p.method, p.paid_date, p.note].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <button
                    onClick={() => deletePayment(p.id)}
                    className="text-sm px-3 py-2 rounded min-h-[44px] flex items-center justify-center"
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
