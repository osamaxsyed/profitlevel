'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';
import {
  crewLabel,
  payoutDetail,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  type Crew,
  type PayType,
  type Payout,
  type PayoutRole,
  type PayoutStatus,
} from './crewTypes';

// Money OUT to the crew for one job — ONE entry point since the crew migration,
// replacing the old labor-vs-sub-payout split. Pick someone (or type a new
// name), say whether they led or assisted, flat or hourly, and where it stands.
// Sits beside Materials in the job detail screen and follows the same
// collapsible + inline-form pattern.

// Agreed vs paid: you log what you agreed to pay; Zelle/check payouts get matched from the
// bank feed in the CNJ dashboard and flip the row to paid. Only cash is logged here as paid.
const PAY_METHODS = [
  { value: '', label: 'Not paid yet' },
  { value: 'Cash', label: 'Paid in cash' },
];

const fieldStyle = { border: '1px solid rgba(255,255,255,0.1)' } as const;

const NEW_CREW = '__new__';

const emptyForm = () => ({
  crew_id: '',
  crew_name: '',
  role: '' as PayoutRole | '',
  pay_type: 'flat' as PayType,
  hours: '',
  rate: '',
  status: 'agreed' as PayoutStatus,
  paid_via: '',
  paid_date: new Date().toISOString().slice(0, 10),
});

export default function CrewPayoutsSection({
  jobId,
  payouts,
  total,
  planned,
  onChange,
}: {
  jobId: number;
  payouts: Payout[];
  total: number;
  planned?: number;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [crew, setCrew] = useState<Crew[]>([]);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch('/api/crew')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setCrew(d))
      .catch(() => {});
  }, []);

  const addingNew = form.crew_id === NEW_CREW;

  const addPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.crew_id) {
      toast.error('Pick who worked this job');
      return;
    }
    if (addingNew && form.crew_name.trim() === '') {
      toast.error('Type their name');
      return;
    }
    // Role is the one thing the books can't guess, so it never gets defaulted.
    if (!form.role) {
      toast.error('Say whether they led the job or assisted');
      return;
    }
    setSaving(true);
    try {
      const isCash = form.paid_via === 'Cash';
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          ...(addingNew
            ? { crew_name: form.crew_name.trim() }
            : { crew_id: parseInt(form.crew_id, 10) }),
          role: form.role,
          pay_type: form.pay_type,
          hours: form.pay_type === 'hourly' ? parseFloat(form.hours) || 0 : null,
          rate: parseFloat(form.rate) || 0,
          status: isCash ? 'paid' : form.status,
          paid_via: form.paid_via || null,
          paid_date: isCash ? form.paid_date || null : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '');
      }
      setForm(emptyForm());
      setShowAdd(false);
      toast.success('Crew payout recorded');
      onChange();
    } catch (e) {
      toast.error((e as Error).message || 'Could not record the payout');
    } finally {
      setSaving(false);
    }
  };

  const deletePayout = async (id: number) => {
    if (!confirm('Delete this crew payout?')) return;
    try {
      const res = await fetch(`/api/payouts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onChange();
    } catch {
      toast.error('Could not delete the payout');
    }
  };

  const plannedTotal = planned ?? 0;

  return (
    <div className="mb-6">
      <div className="bg-pl-card p-[18px] rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
            <button onClick={() => setOpen(!open)} className="text-pl-text" aria-label="Toggle crew payouts">
              <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h3 className="font-bold" style={{ fontSize: 17 }}>Crew</h3>
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

        {plannedTotal > 0 && (
          <div className="text-pl-muted-2 mt-1 pl-mono" style={{ fontSize: 11.5 }}>
            {fmtMoney(plannedTotal)} planned — not counted against this job yet.
          </div>
        )}

        {open && (
          <>
            {showAdd && (
              <form onSubmit={addPayout} className="mt-3 rounded-[11px] p-3" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' }}>
                <select
                  value={form.crew_id}
                  onChange={(e) => setForm({ ...form, crew_id: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                  style={fieldStyle}
                  required
                >
                  <option value="">Who worked this job?</option>
                  {crew.map((c) => (
                    <option key={c.id} value={c.id}>
                      {crewLabel(c.name, c.needs_name === 1)}
                    </option>
                  ))}
                  <option value={NEW_CREW}>+ Someone new…</option>
                </select>

                {addingNew && (
                  <input
                    type="text"
                    placeholder="Their name"
                    value={form.crew_name}
                    onChange={(e) => setForm({ ...form, crew_name: e.target.value })}
                    className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                    style={fieldStyle}
                    required
                  />
                )}

                {/* Role — required, never defaulted. */}
                <div className="text-pl-muted-2 mb-1" style={{ fontSize: 11 }}>Their role on this job</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {ROLE_OPTIONS.map((r) => {
                    const on = form.role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm({ ...form, role: r.value })}
                        aria-pressed={on}
                        className="py-2 rounded-lg font-bold"
                        style={{
                          fontSize: 13,
                          background: on ? PL_ACCENT : '#13110F',
                          color: on ? '#1A0E04' : '#F2EDE4',
                          border: `1px solid ${on ? PL_ACCENT : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {r.label}
                        <span className="block font-normal" style={{ fontSize: 10, opacity: 0.75 }}>{r.hint}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Flat or hourly */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(['flat', 'hourly'] as PayType[]).map((t) => {
                    const on = form.pay_type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, pay_type: t })}
                        aria-pressed={on}
                        className="py-2 rounded-lg font-bold"
                        style={{
                          fontSize: 13,
                          background: on ? 'rgba(255,106,26,0.14)' : '#13110F',
                          color: on ? PL_ACCENT : '#8C8272',
                          border: `1px solid ${on ? 'rgba(255,106,26,0.34)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {t === 'flat' ? 'Flat amount' : 'Hourly'}
                      </button>
                    );
                  })}
                </div>

                {form.pay_type === 'hourly' && (
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="Hours worked"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2 pl-mono"
                    style={fieldStyle}
                    required
                  />
                )}
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={form.pay_type === 'hourly' ? 'Rate ($/hr)' : 'Amount ($)'}
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2 pl-mono"
                  style={fieldStyle}
                  required
                />

                {/* Where it stands */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {STATUS_OPTIONS.map((s) => {
                    const on = form.status === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm({ ...form, status: s.value })}
                        aria-pressed={on}
                        className="py-2 rounded-lg font-bold"
                        style={{
                          fontSize: 12,
                          background: on ? 'rgba(255,106,26,0.14)' : '#13110F',
                          color: on ? PL_ACCENT : '#8C8272',
                          border: `1px solid ${on ? 'rgba(255,106,26,0.34)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                <select
                  value={form.paid_via}
                  onChange={(e) => setForm({ ...form, paid_via: e.target.value })}
                  className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                  style={fieldStyle}
                >
                  {PAY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {form.paid_via === '' && (
                  <p className="text-pl-muted-2 mb-2" style={{ fontSize: 11 }}>
                    Zelle or check? Leave this unpaid; match the payment in the CNJ dashboard Money tab when it clears.
                  </p>
                )}
                {form.paid_via === 'Cash' && (
                  <input
                    type="date"
                    value={form.paid_date}
                    onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
                    className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2"
                    style={fieldStyle}
                  />
                )}

                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04', opacity: saving ? 0.5 : 1 }}>
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
                  You worked this one yourself — nobody else on the payroll.
                </div>
              )}
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-[9px] px-3 py-[10px]" style={{ background: '#13110F', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-semibold truncate" style={{ fontSize: 14 }}>
                        {crewLabel(p.crew_name, false)}
                      </span>
                      <span
                        className="pl-mono font-semibold"
                        style={{ fontSize: 14, color: p.status === 'planned' ? '#6E665A' : PL_CLAY }}
                      >
                        {p.status === 'planned' ? fmtMoney(p.amount) : `−${fmtMoney(p.amount)}`}
                      </span>
                    </div>
                    <div className="text-pl-muted-2 truncate" style={{ fontSize: 11 }}>
                      {payoutDetail(p)} ·{' '}
                      {p.status === 'planned'
                        ? 'planned, not counted yet'
                        : p.status === 'agreed'
                          ? 'agreed, not paid yet'
                          : [p.source === 'bank' ? 'paid · matched to bank' : p.paid_via, p.paid_date].filter(Boolean).join(' · ') || 'paid'}
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
