'use client';

import { useState, useEffect } from 'react';
import type { Job } from '@/lib/types';
import {
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  crewLabel,
  type Crew,
  type PayType,
  type PayoutRole,
  type PayoutStatus,
} from './pl/crewTypes';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ExpenseType = 'material' | 'crew' | 'mileage' | 'overhead';

const NEW_CREW = '__new__';

export default function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [expenseType, setExpenseType] = useState<ExpenseType>('material');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Material fields
  const [materialName, setMaterialName] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [materialTax, setMaterialTax] = useState('');

  // Crew payout fields — one entry for anyone you pay on a job.
  const [crew, setCrew] = useState<Crew[]>([]);
  const [crewId, setCrewId] = useState('');
  const [crewName, setCrewName] = useState('');
  const [role, setRole] = useState<PayoutRole | ''>('');
  const [payType, setPayType] = useState<PayType>('flat');
  const [payStatus, setPayStatus] = useState<PayoutStatus>('agreed');
  const [paidCash, setPaidCash] = useState(false);
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');

  // Mileage fields
  const [miles, setMiles] = useState('');

  // Overhead fields
  const [overheadDescription, setOverheadDescription] = useState('');
  const [overheadAmount, setOverheadAmount] = useState('');
  const [overheadCategory, setOverheadCategory] = useState('');
  const [overheadDate, setOverheadDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (isOpen) {
      fetchJobs();
      fetch('/api/crew')
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => Array.isArray(d) && setCrew(d))
        .catch(() => {});
    }
  }, [isOpen]);

  const fetchJobs = async () => {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    setJobs(data);
    if (data.length > 0 && !selectedJobId) {
      setSelectedJobId(data[0].id.toString());
    }
  };

  const resetForm = () => {
    setMaterialName('');
    setMaterialCost('');
    setMaterialTax('');
    setCrewId('');
    setCrewName('');
    setRole('');
    setPayType('flat');
    setPayStatus('agreed');
    setPaidCash(false);
    setHours('');
    setRate('');
    setMiles('');
    setOverheadDescription('');
    setOverheadAmount('');
    setOverheadCategory('');
    setOverheadDate(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (expenseType === 'overhead') {
        // Add overhead expense
        await fetch('/api/overhead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: overheadDescription,
            amount: parseFloat(overheadAmount),
            category: overheadCategory || null,
            expense_date: overheadDate,
          }),
        });
      } else {
        // Add job-specific expense
        if (!selectedJobId) {
          alert('Please select a job');
          return;
        }

        if (expenseType === 'material') {
          await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job_id: parseInt(selectedJobId),
              item_name: materialName,
              cost: parseFloat(materialCost),
              tax: parseFloat(materialTax) || 0,
            }),
          });
        } else if (expenseType === 'crew') {
          // Role is the one thing the books can't guess, so it's never defaulted.
          if (!role) {
            alert('Say whether they led the job or assisted');
            return;
          }
          const addingNew = crewId === NEW_CREW;
          if (!crewId || (addingNew && crewName.trim() === '')) {
            alert('Pick who worked this job');
            return;
          }
          const res = await fetch('/api/payouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job_id: parseInt(selectedJobId),
              ...(addingNew ? { crew_name: crewName.trim() } : { crew_id: parseInt(crewId, 10) }),
              role,
              pay_type: payType,
              hours: payType === 'hourly' ? parseFloat(hours) || 0 : null,
              rate: parseFloat(rate) || 0,
              status: paidCash ? 'paid' : payStatus,
              paid_via: paidCash ? 'Cash' : null,
              paid_date: paidCash ? new Date().toISOString().slice(0, 10) : null,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'Failed to add crew payout');
            return;
          }
        } else if (expenseType === 'mileage') {
          await fetch('/api/mileage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job_id: parseInt(selectedJobId),
              miles: parseFloat(miles),
            }),
          });
        }
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense');
    }
  };

  if (!isOpen) return null;

  const selectedJob = jobs.find(j => j.id.toString() === selectedJobId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-medium-gray rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-medium-gray border-b border-light-gray px-4 py-3 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Add Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {/* Expense Type Selector */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 block mb-2">Expense Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExpenseType('material')}
                className={`py-2 px-3 rounded font-semibold ${
                  expenseType === 'material'
                    ? 'bg-safety-orange text-white'
                    : 'bg-light-gray text-gray-400'
                }`}
              >
                🔧 Material
              </button>
              <button
                type="button"
                onClick={() => setExpenseType('crew')}
                className={`py-2 px-3 rounded font-semibold ${
                  expenseType === 'crew'
                    ? 'bg-safety-orange text-white'
                    : 'bg-light-gray text-gray-400'
                }`}
              >
                👷 Crew
              </button>
              <button
                type="button"
                onClick={() => setExpenseType('mileage')}
                className={`py-2 px-3 rounded font-semibold ${
                  expenseType === 'mileage'
                    ? 'bg-safety-orange text-white'
                    : 'bg-light-gray text-gray-400'
                }`}
              >
                🚗 Mileage
              </button>
              <button
                type="button"
                onClick={() => setExpenseType('overhead')}
                className={`py-2 px-3 rounded font-semibold ${
                  expenseType === 'overhead'
                    ? 'bg-safety-orange text-white'
                    : 'bg-light-gray text-gray-400'
                }`}
              >
                🏢 Overhead
              </button>
            </div>
          </div>

          {/* Job Selector (hidden for overhead) */}
          {expenseType !== 'overhead' && (
            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-1">Select Job</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded"
                required
              >
                <option value="">Choose a job...</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name} - {new Date(job.job_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Material Fields */}
          {expenseType === 'material' && (
            <>
              <input
                type="text"
                placeholder="Item Name (e.g., 2x4 Lumber)"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Cost"
                value={materialCost}
                onChange={(e) => setMaterialCost(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Tax (optional)"
                value={materialTax}
                onChange={(e) => setMaterialTax(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
              />
            </>
          )}

          {/* Crew Payout Fields */}
          {expenseType === 'crew' && (
            <>
              <select
                value={crewId}
                onChange={(e) => setCrewId(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
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

              {crewId === NEW_CREW && (
                <input
                  type="text"
                  placeholder="Their name"
                  value={crewName}
                  onChange={(e) => setCrewName(e.target.value)}
                  className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                  required
                />
              )}

              {/* Role — required, never defaulted server-side. */}
              <label className="text-sm text-gray-400 block mb-1">Their role on this job</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    aria-pressed={role === r.value}
                    className={`py-2 px-3 rounded font-semibold ${
                      role === r.value ? 'bg-safety-orange text-white' : 'bg-light-gray text-gray-400'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                {(['flat', 'hourly'] as PayType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPayType(t)}
                    aria-pressed={payType === t}
                    className={`py-2 px-3 rounded font-semibold ${
                      payType === t ? 'bg-safety-orange text-white' : 'bg-light-gray text-gray-400'
                    }`}
                  >
                    {t === 'flat' ? 'Flat amount' : 'Hourly'}
                  </button>
                ))}
              </div>

              {payType === 'hourly' && (
                <input
                  type="number"
                  step="0.1"
                  placeholder="Hours Worked"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                  required
                />
              )}
              <input
                type="number"
                step="0.01"
                placeholder={payType === 'hourly' ? 'Rate ($/hr)' : 'Amount ($)'}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />

              <label className="text-sm text-gray-400 block mb-1">Where it stands</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setPayStatus(s.value)}
                    aria-pressed={payStatus === s.value}
                    disabled={paidCash}
                    className={`py-2 px-3 rounded font-semibold ${
                      payStatus === s.value && !paidCash
                        ? 'bg-safety-orange text-white'
                        : 'bg-light-gray text-gray-400'
                    }`}
                    style={{ opacity: paidCash ? 0.5 : 1 }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-white text-sm mb-2">
                <input type="checkbox" checked={paidCash} onChange={(e) => setPaidCash(e.target.checked)} />
                Paid in cash (Zelle and checks get matched from the bank feed instead)
              </label>
            </>
          )}

          {/* Mileage Fields */}
          {expenseType === 'mileage' && (
            <>
              <input
                type="number"
                step="0.1"
                placeholder="Miles Driven"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
              {selectedJob && (
                <div className="text-xs text-gray-400 mb-2">
                  Rate auto-calculated for {new Date(selectedJob.job_date).getFullYear()} (IRS standard)
                </div>
              )}
            </>
          )}

          {/* Overhead Fields */}
          {expenseType === 'overhead' && (
            <>
              <input
                type="text"
                placeholder="Description (e.g., Insurance Premium)"
                value={overheadDescription}
                onChange={(e) => setOverheadDescription(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={overheadAmount}
                onChange={(e) => setOverheadAmount(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
              <input
                type="text"
                placeholder="Category (e.g., Insurance, Tools, Software)"
                value={overheadCategory}
                onChange={(e) => setOverheadCategory(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
              />
              <input
                type="date"
                value={overheadDate}
                onChange={(e) => setOverheadDate(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
            </>
          )}

          {/* Submit Button */}
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="flex-1 bg-safety-orange text-white py-2 rounded font-semibold"
            >
              Add Expense
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-light-gray text-white py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
