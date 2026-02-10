'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Overhead } from '@/lib/types';
import { toast } from 'sonner';

export default function OverheadPage() {
  const router = useRouter();
  const [overhead, setOverhead] = useState<Overhead[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: '',
    expense_date: new Date().toISOString().slice(0, 10),
  });

  const [editExpense, setEditExpense] = useState({
    description: '',
    amount: '',
    category: '',
    expense_date: '',
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchOverhead();
  }, [selectedMonth]);

  const fetchOverhead = async () => {
    const res = await fetch(`/api/overhead?month=${selectedMonth}`);
    const data = await res.json();
    setOverhead(data);
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/overhead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category || null,
        expense_date: newExpense.expense_date,
      }),
    });
    setNewExpense({
      description: '',
      amount: '',
      category: '',
      expense_date: new Date().toISOString().slice(0, 10),
    });
    setShowAdd(false);
    fetchOverhead();
  };

  const updateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    await fetch(`/api/overhead/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: editExpense.description,
        amount: parseFloat(editExpense.amount),
        category: editExpense.category || null,
        expense_date: editExpense.expense_date,
      }),
    });
    setEditingId(null);
    fetchOverhead();
  };

  const deleteExpense = async (id: number, description: string) => {
    if (!confirm(`Delete "${description}"?`)) return;
    try {
      await fetch(`/api/overhead/${id}`, { method: 'DELETE' });
      fetchOverhead();
      toast.success('Expense deleted');
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const startEdit = (exp: Overhead) => {
    setEditExpense({
      description: exp.description,
      amount: exp.amount.toString(),
      category: exp.category || '',
      expense_date: exp.expense_date,
    });
    setEditingId(exp.id);
  };

  const totalOverhead = overhead.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="min-h-screen bg-dark-gray">
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

        <h2 className="text-2xl font-bold text-white mb-4">Business Overhead</h2>

        <div className="mb-4">
          <label className="text-sm text-gray-400 block mb-1">Filter by Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-medium-gray text-white px-3 py-2 rounded"
          />
        </div>

        <div className="bg-medium-gray p-4 rounded-lg mb-4">
          <div className="text-gray-400 text-sm">Total Overhead ({new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</div>
          <div className="text-safety-orange text-3xl font-bold">${totalOverhead.toFixed(2)}</div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Expenses</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-safety-orange text-white px-4 py-2 rounded-lg font-semibold"
          >
            + Add Expense
          </button>
        </div>

        {showAdd && (
          <form onSubmit={addExpense} className="bg-medium-gray p-4 rounded-lg mb-4">
            <input
              type="text"
              placeholder="Description (e.g., Insurance)"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
              required
            />
            <input
              type="text"
              placeholder="Category (e.g., Tools, Marketing)"
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
            />
            <input
              type="date"
              value={newExpense.expense_date}
              onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
              className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-safety-orange text-white py-2 rounded font-semibold">
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-light-gray text-white py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {overhead.map((exp) => (
            editingId === exp.id ? (
              <form key={exp.id} onSubmit={updateExpense} className="bg-medium-gray p-3 rounded">
                <input
                  type="text"
                  value={editExpense.description}
                  onChange={(e) => setEditExpense({ ...editExpense, description: e.target.value })}
                  className="w-full bg-light-gray text-white px-2 py-1 rounded mb-1 text-sm"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  value={editExpense.amount}
                  onChange={(e) => setEditExpense({ ...editExpense, amount: e.target.value })}
                  className="w-full bg-light-gray text-white px-2 py-1 rounded mb-1 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={editExpense.category}
                  onChange={(e) => setEditExpense({ ...editExpense, category: e.target.value })}
                  className="w-full bg-light-gray text-white px-2 py-1 rounded mb-1 text-sm"
                />
                <input
                  type="date"
                  value={editExpense.expense_date}
                  onChange={(e) => setEditExpense({ ...editExpense, expense_date: e.target.value })}
                  className="w-full bg-light-gray text-white px-2 py-1 rounded mb-2 text-sm"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-safety-orange text-white py-1 rounded text-sm">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex-1 bg-light-gray text-white py-1 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div key={exp.id} className="bg-medium-gray p-3 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between text-white">
                      <span className="font-semibold">{exp.description}</span>
                      <span className="text-safety-orange">${exp.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {exp.category && <span className="mr-2">📁 {exp.category}</span>}
                      <span>{new Date(exp.expense_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => startEdit(exp)}
                      className="text-safety-orange text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteExpense(exp.id, exp.description)}
                      className="text-red-500 text-xs"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        {overhead.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No overhead expenses for this month.
          </div>
        )}
      </main>
    </div>
  );
}
