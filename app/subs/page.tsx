'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '../components/pl/PageHeader';
import BottomNav from '../components/pl/BottomNav';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';
import {
  coiState,
  num,
  THRESHOLD_1099,
  WC_OPTIONS,
  type Payee1099,
  type Sub,
} from '../components/pl/subTypes';

// The dispatcher's people screen, added in the Aug 2026 shift to subbed-out work.
//   Top    — who got paid this tax year, and who crosses the 1099 threshold.
//   Bottom — the sub roster with the compliance paperwork the owner owes:
//            W-9, NJ HIC number, COI expiry, workers-comp status.

const fieldStyle = { border: '1px solid rgba(255,255,255,0.1)' } as const;
const panelStyle = { background: '#13110F', border: '1px solid rgba(255,255,255,0.06)' } as const;

const EMPTY_SUB = {
  name: '',
  phone: '',
  hic_number: '',
  hic_verified: '',
  coi_gl_expiry: '',
  wc_status: 'unknown',
  notes: '',
};

/* ------------------------------------------------------------------ */
/* 1099 payee table                                                    */
/* ------------------------------------------------------------------ */

function PayeeTable({ year, payees }: { year: number; payees: Payee1099[] }) {
  const flagged = payees.filter((p) => p.needs_1099);

  return (
    <div className="bg-pl-card rounded-2xl p-5 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between">
        <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
          Who you paid · {year}
        </div>
        <div className="pl-mono text-pl-muted-2" style={{ fontSize: 12 }}>
          {flagged.length} need{flagged.length === 1 ? 's' : ''} a 1099
        </div>
      </div>
      <div className="text-pl-muted-2 mt-1" style={{ fontSize: 12 }}>
        Anyone you pay {fmtMoney(THRESHOLD_1099)} or more in {year} gets a 1099-NEC by January 31.
      </div>

      {payees.length === 0 ? (
        <div className="text-pl-muted mt-3" style={{ fontSize: 13 }}>
          Nobody paid yet this year.
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {payees.map((p) => {
            const legacy = p.source === 'labor';
            return (
              <div key={`${p.name}-${p.source}`} className="flex items-center gap-3 rounded-[11px] px-3 py-[11px]" style={panelStyle}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[6px]">
                    <span className="font-bold truncate" style={{ fontSize: 14 }}>{p.name}</span>
                    {legacy && (
                      <span
                        className="font-bold uppercase text-pl-faint"
                        style={{ fontSize: 9, letterSpacing: '0.08em', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 5 }}
                      >
                        Helper
                      </span>
                    )}
                  </div>
                  <div className="text-pl-muted-2" style={{ fontSize: 11 }}>
                    {p.payments} payment{p.payments === 1 ? '' : 's'}
                    {p.source === 'both' ? ' · helper + sub' : ''}
                  </div>
                </div>
                <span className="pl-mono font-semibold" style={{ fontSize: 15 }}>{fmtMoney(p.total_paid)}</span>
                {p.needs_1099 && (
                  <span
                    className="font-bold uppercase whitespace-nowrap"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: '0.08em',
                      color: '#E8B530',
                      background: 'rgba(232,181,48,0.12)',
                      border: '1px solid rgba(232,181,48,0.34)',
                      padding: '3px 7px',
                      borderRadius: 6,
                    }}
                  >
                    1099
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One sub's compliance card                                           */
/* ------------------------------------------------------------------ */

function SubCard({ sub, onSaved, onDeleted }: { sub: Sub; onSaved: () => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: sub.phone ?? '',
    hic_number: sub.hic_number ?? '',
    hic_verified: sub.hic_verified ?? '',
    coi_gl_expiry: sub.coi_gl_expiry ?? '',
    wc_status: sub.wc_status ?? 'unknown',
    notes: sub.notes ?? '',
  });

  const w9 = sub.w9_on_file === 1;
  const coi = coiState(sub.coi_gl_expiry);
  const wcLabel = WC_OPTIONS.find((o) => o.value === (sub.wc_status ?? 'unknown'))?.label ?? 'Not asked yet';
  const overThreshold = num(sub.ytd_paid) >= THRESHOLD_1099;

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/subs/${sub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
  };

  const toggleW9 = async () => {
    try {
      await patch({ w9_on_file: w9 ? 0 : 1 });
      onSaved();
    } catch {
      toast.error('Could not update the W-9 flag');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patch({
        phone: form.phone || null,
        hic_number: form.hic_number || null,
        hic_verified: form.hic_verified || null,
        coi_gl_expiry: form.coi_gl_expiry || null,
        wc_status: form.wc_status,
        notes: form.notes || null,
      });
      setEditing(false);
      toast.success(`${sub.name} updated`);
      onSaved();
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove ${sub.name} from the roster?`)) return;
    try {
      const res = await fetch(`/api/subs/${sub.id}`, { method: 'DELETE' });
      if (res.status === 409) {
        toast.error(`${sub.name} has payouts on file — those have to go first.`);
        return;
      }
      if (!res.ok) throw new Error();
      toast.success(`${sub.name} removed`);
      onDeleted();
    } catch {
      toast.error('Could not remove this sub');
    }
  };

  /* A compliance item: satisfied (quiet), or an open to-do (gentle amber). */
  const Item = ({ label, done, value, todo }: { label: string; done: boolean; value?: string; todo: string }) => (
    <div className="flex items-start gap-2 py-[6px]">
      <span style={{ fontSize: 12, lineHeight: '18px', color: done ? PL_ACCENT : '#6E665A' }}>{done ? '✓' : '○'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-pl-text-2" style={{ fontSize: 12.5 }}>
          {label}
          {done && value ? <span className="pl-mono text-pl-muted-2"> · {value}</span> : null}
        </div>
        {!done && <div className="text-pl-faint" style={{ fontSize: 11 }}>{todo}</div>}
      </div>
    </div>
  );

  return (
    <div className="bg-pl-card rounded-2xl p-[18px] mb-2" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold" style={{ fontSize: 16 }}>{sub.name}</div>
          <div className="text-pl-muted-2 mt-[2px]" style={{ fontSize: 12 }}>
            {sub.jobs_count} job{sub.jobs_count === 1 ? '' : 's'}
            {sub.phone ? ` · ${sub.phone}` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="pl-mono font-semibold" style={{ fontSize: 18 }}>{fmtMoney(num(sub.ytd_paid))}</div>
          <div className="text-pl-faint" style={{ fontSize: 10 }}>paid this year</div>
        </div>
      </div>

      {overThreshold && !w9 && (
        <div
          className="mt-3 rounded-[9px] px-3 py-2"
          style={{ background: 'rgba(232,181,48,0.1)', border: '1px solid rgba(232,181,48,0.3)', color: '#E8B530', fontSize: 12 }}
        >
          Over {fmtMoney(THRESHOLD_1099)} and no W-9 yet — you&apos;ll need one to file the 1099.
        </div>
      )}

      {!editing ? (
        <>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={toggleW9}
              className="flex items-center gap-2 py-[6px] w-full text-left"
              aria-pressed={w9}
            >
              <span
                className="flex items-center justify-center rounded"
                style={{
                  width: 18,
                  height: 18,
                  border: `1.5px solid ${w9 ? PL_ACCENT : 'rgba(255,255,255,0.18)'}`,
                  background: w9 ? PL_ACCENT : 'transparent',
                  color: '#1A0E04',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {w9 ? '✓' : ''}
              </span>
              <span className="text-pl-text-2" style={{ fontSize: 12.5 }}>
                W-9 on file{!w9 && <span className="text-pl-faint"> — tap when you have it</span>}
              </span>
            </button>

            <Item
              label="NJ HIC number"
              done={!!sub.hic_number}
              value={sub.hic_number ? `${sub.hic_number}${sub.hic_verified ? ` (checked ${sub.hic_verified})` : ''}` : undefined}
              todo="Ask for their registration number and verify it."
            />
            <Item
              label="General liability COI"
              done={coi === 'ok'}
              value={sub.coi_gl_expiry ? `expires ${sub.coi_gl_expiry}` : undefined}
              todo={coi === 'expired' ? `Expired ${sub.coi_gl_expiry} — get a fresh certificate.` : 'Request a certificate of insurance.'}
            />
            <Item
              label="Workers' comp"
              done={sub.wc_status === 'policy' || sub.wc_status === 'affidavit'}
              value={wcLabel}
              todo={sub.wc_status === 'none' ? 'No coverage — your policy may pick this up.' : 'Ask whether they carry WC or file an exemption.'}
            />

            {sub.notes && (
              <div className="text-pl-muted mt-2" style={{ fontSize: 12 }}>{sub.notes}</div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 py-2 rounded-lg font-bold"
              style={{ fontSize: 13, background: '#13110F', border: '1px solid rgba(255,255,255,0.08)', color: PL_ACCENT }}
            >
              Edit details
            </button>
            <button onClick={remove} className="px-4 py-2 rounded-lg" style={{ fontSize: 13, color: PL_CLAY }}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={save} className="mt-3 rounded-[11px] p-3" style={panelStyle}>
          <label className="text-pl-muted-2 block mb-1" style={{ fontSize: 11 }}>Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(732) 555-0134" className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle} />

          <label className="text-pl-muted-2 block mb-1" style={{ fontSize: 11 }}>NJ HIC number</label>
          <input type="text" value={form.hic_number} onChange={(e) => setForm({ ...form, hic_number: e.target.value })} placeholder="13VH________" className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2 pl-mono" style={fieldStyle} />

          <label className="text-pl-muted-2 block mb-1" style={{ fontSize: 11 }}>HIC verified on</label>
          <input type="date" value={form.hic_verified} onChange={(e) => setForm({ ...form, hic_verified: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle} />

          <label className="text-pl-muted-2 block mb-1" style={{ fontSize: 11 }}>COI expires</label>
          <input type="date" value={form.coi_gl_expiry} onChange={(e) => setForm({ ...form, coi_gl_expiry: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle} />

          <label className="text-pl-muted-2 block mb-1" style={{ fontSize: 11 }}>Workers&apos; comp</label>
          <select value={form.wc_status} onChange={(e) => setForm({ ...form, wc_status: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle}>
            {WC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label className="text-pl-muted-2 block mb-1" style={{ fontSize: 11 }}>Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Weekend only, brings own tools…" className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle} />

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg bg-light-gray text-pl-text">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SubsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [payees, setPayees] = useState<Payee1099[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_SUB });

  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    try {
      const [subsRes, payeesRes] = await Promise.all([
        fetch('/api/subs'),
        fetch('/api/payees-1099'),
      ]);
      if (subsRes.ok) {
        const d = await subsRes.json();
        setSubs(Array.isArray(d) ? d : []);
      }
      if (payeesRes.ok) {
        const d = await payeesRes.json();
        setPayees(Array.isArray(d) ? d.filter((p: Payee1099) => p.year === year) : []);
      }
    } catch {
      /* keep whatever we have */
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const addSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/subs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone || null,
          hic_number: form.hic_number || null,
          coi_gl_expiry: form.coi_gl_expiry || null,
          wc_status: form.wc_status,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ ...EMPTY_SUB });
      setShowAdd(false);
      toast.success('Sub added');
      load();
    } catch {
      toast.error('Could not add this sub');
    } finally {
      setSaving(false);
    }
  };

  const openTodos = subs.filter(
    (s) => s.w9_on_file !== 1 || !s.hic_number || coiState(s.coi_gl_expiry) !== 'ok' || !s.wc_status || s.wc_status === 'unknown'
  ).length;

  return (
    <div className="min-h-screen bg-pl-bg max-w-md mx-auto px-[18px]" style={{ paddingBottom: 96 }}>
      <PageHeader
        title="Subs"
        subtitle={loading ? 'Loading…' : `${subs.length} on the roster${openTodos > 0 ? ` · ${openTodos} need paperwork` : ''}`}
        right={
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="font-bold rounded-lg"
            style={{ fontSize: 14, padding: '9px 16px', background: PL_ACCENT, color: '#1A0E04' }}
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        }
      />

      {showAdd && (
        <form onSubmit={addSub} className="bg-pl-card rounded-2xl p-5 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="font-bold uppercase text-pl-muted-2 mb-3" style={{ fontSize: 11, letterSpacing: '0.16em' }}>New sub</div>
          <input type="text" placeholder="Name (e.g. Ian)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle} required />
          <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle} />
          <input type="text" placeholder="NJ HIC number (optional)" value={form.hic_number} onChange={(e) => setForm({ ...form, hic_number: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2 pl-mono" style={fieldStyle} />
          <select value={form.wc_status} onChange={(e) => setForm({ ...form, wc_status: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle}>
            {WC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="text" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2" style={fieldStyle} />
          <button type="submit" disabled={saving} className="w-full py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Adding…' : 'Add sub'}
          </button>
          <div className="text-pl-faint mt-2" style={{ fontSize: 11 }}>You can fill in the W-9, COI and comp details after.</div>
        </form>
      )}

      <PayeeTable year={year} payees={payees} />

      <div className="font-bold uppercase text-pl-muted-2 mt-5 mb-3" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
        Roster
      </div>

      {loading ? (
        <div className="text-pl-muted py-6 text-center" style={{ fontSize: 14 }}>Loading…</div>
      ) : subs.length === 0 ? (
        <div className="bg-pl-card rounded-[14px] p-6 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="font-bold" style={{ fontSize: 16 }}>No subs yet</div>
          <div className="text-pl-muted-2 mt-1" style={{ fontSize: 13 }}>
            Add the crews you dispatch so payouts and 1099s track themselves.
          </div>
          <button onClick={() => setShowAdd(true)} className="mt-4 font-bold rounded-lg" style={{ fontSize: 14, padding: '10px 18px', background: PL_ACCENT, color: '#1A0E04' }}>
            + Add your first sub
          </button>
        </div>
      ) : (
        subs.map((s) => <SubCard key={s.id} sub={s} onSaved={load} onDeleted={load} />)
      )}

      <BottomNav active="more" />
    </div>
  );
}
