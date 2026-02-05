'use client';

import { useState, useEffect } from 'react';
import type { Job } from '@/lib/types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ExpenseType = 'material' | 'labor' | 'mileage' | 'overhead';

export default function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [expenseType, setExpenseType] = useState<ExpenseType>('material');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Material fields
  const [materialName, setMaterialName] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [materialTax, setMaterialTax] = useState('');

  // Labor fields
  const [helperName, setHelperName] = useState('');
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
    setHelperName('');
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
        } else if (expenseType === 'labor') {
          await fetch('/api/labor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job_id: parseInt(selectedJobId),
              helper_name: helperName,
              hours: parseFloat(hours),
              rate: parseFloat(rate),
            }),
          });
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
                onClick={() => setExpenseType('labor')}
                className={`py-2 px-3 rounded font-semibold ${
                  expenseType === 'labor'
                    ? 'bg-safety-orange text-white'
                    : 'bg-light-gray text-gray-400'
                }`}
              >
                👷 Labor
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

          {/* Labor Fields */}
          {expenseType === 'labor' && (
            <>
              <input
                type="text"
                placeholder="Helper/Sub Name"
                value={helperName}
                onChange={(e) => setHelperName(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
              <input
                type="number"
                step="0.1"
                placeholder="Hours Worked"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Rate ($/hr)"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                required
              />
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
