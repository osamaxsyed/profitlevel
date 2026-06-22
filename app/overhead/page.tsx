'use client';

import { useState, useEffect } from 'react';
import type { Overhead } from '@/lib/types';
import { toast } from 'sonner';
import PageHeader from '../components/pl/PageHeader';
import BottomNav from '../components/pl/BottomNav';
import { fmtMoney, PL_ACCENT } from '@/lib/dayRate';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function OverheadPage() {
  const [overhead, setOverhead] = useState<Overhead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: '', expense_date: new Date().toISOString().slice(0, 10) });
  const [editExpense, setEditExpense] = useState({ description: '', amount: '', category: '', expense_date: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const fetchOverhead = async () => {
      const res = await fetch(`/api/overhead?month=${selectedMonth}`);
      const data = await res.json();
      setOverhead(data);
      setLoaded(true);
    };
    fetchOverhead();
  }, [selectedMonth]);

  const refetch = async () => {
    const res = await fetch(`/api/overhead?month=${selectedMonth}`);
    setOverhead(await res.json());
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    await fetch('/api/overhead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: newExpense.description, amount: parseFloat(newExpense.amount), category: newExpense.category || null, expense_date: newExpense.expense_date }),
    });
    setNewExpense({ description: '', amount: '', category: '', expense_date: new Date().toISOString().slice(0, 10) });
    setShowAdd(false);
    toast.success('Expense added');
    refetch();
  };

  const updateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    await fetch(`/api/overhead/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editExpense.description, amount: parseFloat(editExpense.amount), category: editExpense.category || null, expense_date: editExpense.expense_date }),
    });
    setEditingId(null);
    toast.success('Expense updated');
    refetch();
  };

  const deleteExpense = async (id: number, description: string) => {
    if (!confirm(`Delete "${description}"?`)) return;
    try {
      await fetch(`/api/overhead/${id}`, { method: 'DELETE' });
      refetch();
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  const startEdit = (exp: Overhead) => {
    setEditExpense({ description: exp.description, amount: exp.amount.toString(), category: exp.category || '', expense_date: exp.expense_date });
    setEditingId(exp.id);
  };

  const total = overhead.reduce((s, e) => s + e.amount, 0);
  const [my, mm] = selectedMonth.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[mm - 1]} ${my}`;

  const fieldCls = 'w-full bg-pl-inset text-pl-text px-3 py-2 rounded-lg mb-2';
  const fieldStyle = { border: '1px solid rgba(255,255,255,0.1)' } as const;

  return (
    <div className="min-h-screen bg-pl-bg max-w-md mx-auto px-[18px]" style={{ paddingBottom: 96 }}>
      <PageHeader title="Overhead" subtitle={`${monthLabel} · recurring business costs`} />

      {/* Month filter */}
      <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full bg-pl-card text-pl-text px-3 py-2 rounded-lg mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />

      {/* Total card */}
      <div className="bg-pl-card rounded-2xl p-5 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Total this month</div>
        <div className="pl-mono font-semibold mt-1" style={{ fontSize: 34, color: PL_ACCENT, letterSpacing: '-0.02em' }}>{fmtMoney(total)}</div>
      </div>

      {/* Add */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Expenses</div>
        <button onClick={() => setShowAdd(!showAdd)} className="font-bold rounded-lg" style={{ fontSize: 13, padding: '7px 14px', background: PL_ACCENT, color: '#1A0E04' }}>{showAdd ? 'Cancel' : '+ Add'}</button>
      </div>

      {showAdd && (
        <form onSubmit={addExpense} className="bg-pl-card rounded-[13px] p-4 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <input type="text" placeholder="Description (e.g. Insurance)" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className={fieldCls} style={fieldStyle} required />
          <input type="number" step="0.01" placeholder="Amount" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className={`${fieldCls} pl-mono`} style={fieldStyle} required />
          <input type="text" placeholder="Category (optional)" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className={fieldCls} style={fieldStyle} />
          <input type="date" value={newExpense.expense_date} onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })} className={fieldCls} style={fieldStyle} required />
          <button type="submit" className="w-full py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04' }}>Save</button>
        </form>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {overhead.map((exp) =>
          editingId === exp.id ? (
            <form key={exp.id} onSubmit={updateExpense} className="bg-pl-card rounded-[13px] p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <input type="text" value={editExpense.description} onChange={(e) => setEditExpense({ ...editExpense, description: e.target.value })} className={fieldCls} style={fieldStyle} required />
              <input type="number" step="0.01" value={editExpense.amount} onChange={(e) => setEditExpense({ ...editExpense, amount: e.target.value })} className={`${fieldCls} pl-mono`} style={fieldStyle} required />
              <input type="text" value={editExpense.category} onChange={(e) => setEditExpense({ ...editExpense, category: e.target.value })} placeholder="Category" className={fieldCls} style={fieldStyle} />
              <input type="date" value={editExpense.expense_date} onChange={(e) => setEditExpense({ ...editExpense, expense_date: e.target.value })} className={fieldCls} style={fieldStyle} required />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-lg font-bold" style={{ background: PL_ACCENT, color: '#1A0E04' }}>Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-lg font-semibold bg-pl-panel text-pl-text" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>Cancel</button>
              </div>
            </form>
          ) : (
            <div key={exp.id} className="bg-pl-card rounded-[13px] p-4 flex items-center justify-between" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate" style={{ fontSize: 15 }}>{exp.description}</div>
                <div className="text-pl-muted-2" style={{ fontSize: 12 }}>
                  {exp.category ? `${exp.category} · ` : ''}{new Date(exp.expense_date + 'T00:00:00').toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className="pl-mono font-semibold" style={{ fontSize: 16 }}>{fmtMoney(exp.amount)}</span>
                <button onClick={() => startEdit(exp)} className="text-pl-muted" style={{ fontSize: 13 }}>Edit</button>
                <button onClick={() => deleteExpense(exp.id, exp.description)} style={{ fontSize: 13, color: '#E0764E' }}>Del</button>
              </div>
            </div>
          )
        )}
        {loaded && overhead.length === 0 && (
          <div className="bg-pl-card rounded-[13px] p-6 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-pl-muted" style={{ fontSize: 14 }}>No overhead logged for {monthLabel}.</div>
          </div>
        )}
      </div>

      <BottomNav active="more" />
    </div>
  );
}
