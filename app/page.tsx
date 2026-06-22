'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import type { JobWithCosts, Material, Labor, Mileage, HoursLog } from '@/lib/types';
import MonthOverviewCard from './components/MonthOverview';
import { getProfitColor, formatCurrency, formatHours, formatNumber } from '@/lib/utils';
import AddExpenseModal from './components/AddExpenseModal';
import JobStampCard from './components/pl/JobStampCard';
import { tierSummary, resultTokens, TIER_LABELS, TIER_ORDER, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';

const DAY_TIER_OPTIONS = [
  { value: 'full', label: 'Full day' },
  { value: 'half', label: 'Half day' },
  { value: 'short', label: 'Short job' },
  { value: 'visit', label: 'Site visit' },
];

// Tier + count selector for a job's day-units. count > 1 = a multi-day project.
function TierSelector({
  tier,
  count,
  onChange,
}: {
  tier: string;
  count: string;
  onChange: (tier: string, count: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">Day type</label>
      <div className="flex gap-2">
        <select
          value={tier}
          onChange={(e) => onChange(e.target.value, count)}
          className="flex-1 bg-light-gray text-white px-3 py-2 rounded"
        >
          {DAY_TIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={count}
          onChange={(e) => onChange(tier, e.target.value)}
          className="w-20 bg-light-gray text-white px-3 py-2 rounded"
          title="Number of days at this tier (for multi-day projects)"
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">×{count || 1} day{(parseInt(count, 10) || 1) > 1 ? 's' : ''} — for big jobs, set the count of days.</p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobWithCosts[]>([]);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [showAddMileage, setShowAddMileage] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [labor, setLabor] = useState<Labor[]>([]);
  const [mileage, setMileage] = useState<Mileage[]>([]);
  const [hoursLog, setHoursLog] = useState<HoursLog[]>([]);

  const [grossGoal, setGrossGoal] = useState(195);
  const [netGoal, setNetGoal] = useState(120);
  const [existingClients, setExistingClients] = useState<string[]>([]);
  const [existingHelpers, setExistingHelpers] = useState<string[]>([]);

  // Form states
  const [newJob, setNewJob] = useState({ name: '', client_name: '', contract_price: '', job_date: '', day_tier: 'full', day_count: '1' });
  const [newMaterial, setNewMaterial] = useState({ item_name: '', cost: '', tax: '' });
  const [newLabor, setNewLabor] = useState({ helper_name: '', hours: '', rate: '', is_flat_rate: false });
  const [newMileage, setNewMileage] = useState({ miles: '' });
  const [newHoursLog, setNewHoursLog] = useState({ log_date: '', hours: '', note: '' });

  // Edit states
  const [editingJob, setEditingJob] = useState<number | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<number | null>(null);
  const [editingLabor, setEditingLabor] = useState<number | null>(null);
  const [editingMileage, setEditingMileage] = useState<number | null>(null);
  const [editingHoursLog, setEditingHoursLog] = useState<number | null>(null);

  const [editJob, setEditJob] = useState({ name: '', client_name: '', contract_price: '', job_date: '', day_tier: 'full', day_count: '1' });
  const [editMaterial, setEditMaterial] = useState({ item_name: '', cost: '', tax: '' });
  const [editLabor, setEditLabor] = useState({ helper_name: '', hours: '', rate: '', is_flat_rate: false });
  const [editMileage, setEditMileage] = useState({ miles: '' });
  const [editHoursLog, setEditHoursLog] = useState({ log_date: '', hours: '', note: '' });

  // Client dropdown states
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showEditClientDropdown, setShowEditClientDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState<string[]>([]);

  // Helper dropdown states
  const [showHelperDropdown, setShowHelperDropdown] = useState(false);
  const [showEditHelperDropdown, setShowEditHelperDropdown] = useState(false);
  const [filteredHelpers, setFilteredHelpers] = useState<string[]>([]);

  // Collapsible sections states with localStorage persistence
  const [showMaterialsList, setShowMaterialsList] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showMaterialsList');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [showLaborList, setShowLaborList] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showLaborList');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [showMileageList, setShowMileageList] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showMileageList');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [showHoursLogList, setShowHoursLogList] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showHoursLogList');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [showAddHoursLog, setShowAddHoursLog] = useState(false);

  // Form validation errors
  const [jobErrors, setJobErrors] = useState({ name: '', contract_price: '', job_date: '' });

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJobs();
    fetchGoals();
    fetchExistingClients();
    fetchExistingHelpers();
  }, []);

  // Persist collapsible states to localStorage
  useEffect(() => {
    localStorage.setItem('showMaterialsList', JSON.stringify(showMaterialsList));
  }, [showMaterialsList]);

  useEffect(() => {
    localStorage.setItem('showLaborList', JSON.stringify(showLaborList));
  }, [showLaborList]);

  useEffect(() => {
    localStorage.setItem('showMileageList', JSON.stringify(showMileageList));
  }, [showMileageList]);

  useEffect(() => {
    localStorage.setItem('showHoursLogList', JSON.stringify(showHoursLogList));
  }, [showHoursLogList]);

  useEffect(() => {
    if (selectedJob) {
      fetchJobDetails(selectedJob);
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    setJobs(data);
    fetchExistingClients();
  };

  const fetchGoals = async () => {
    const res = await fetch('/api/settings/goals');
    const data = await res.json();
    setGrossGoal(parseFloat(data.gross_hourly_goal));
    setNetGoal(parseFloat(data.net_hourly_goal));
  };

  const fetchExistingClients = async () => {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    const uniqueClients = Array.from(new Set(
      data
        .map((job: JobWithCosts) => job.client_name)
        .filter((name: string | null) => name && name.trim() !== '')
    )) as string[];
    setExistingClients(uniqueClients.sort());
  };

  const fetchExistingHelpers = async () => {
    const res = await fetch('/api/labor');
    const data = await res.json();
    const uniqueHelpers = Array.from(new Set(
      data
        .map((labor: Labor) => labor.helper_name)
        .filter((name: string | null) => name && name.trim() !== '')
    )) as string[];
    setExistingHelpers(uniqueHelpers.sort());
  };

  const fetchJobDetails = async (jobId: number) => {
    const [materialsRes, laborRes, mileageRes, hoursLogRes] = await Promise.all([
      fetch(`/api/materials?job_id=${jobId}`),
      fetch(`/api/labor?job_id=${jobId}`),
      fetch(`/api/mileage?job_id=${jobId}`),
      fetch(`/api/hours-log?job_id=${jobId}`),
    ]);
    setMaterials(await materialsRes.json());
    setLabor(await laborRes.json());
    setMileage(await mileageRes.json());
    setHoursLog(await hoursLogRes.json());
    fetchExistingHelpers();
  };

  const validateJobForm = () => {
    const errors = { name: '', contract_price: '', job_date: '' };
    let isValid = true;

    if (!newJob.name.trim()) {
      errors.name = 'Job name is required';
      isValid = false;
    }

    if (!newJob.contract_price || parseFloat(newJob.contract_price) <= 0) {
      errors.contract_price = 'Contract price must be greater than 0';
      isValid = false;
    }

    if (!newJob.job_date) {
      errors.job_date = 'Job date is required';
      isValid = false;
    }

    setJobErrors(errors);
    return isValid;
  };

  // Serialize a tier + count selection into the day_units JSON the API stores.
  const buildDayUnits = (tier: string, count: string): string | null => {
    const n = parseInt(count, 10);
    if (!tier || !n || n < 1) return null;
    return JSON.stringify({ [tier]: n });
  };

  const addJob = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateJobForm()) {
      return;
    }

    // Optimistic update - add temporary job immediately
    const tempJob: JobWithCosts = {
      id: Date.now(), // Temporary ID
      name: newJob.name,
      client_name: newJob.client_name || null,
      contract_price: parseFloat(newJob.contract_price),
      job_date: newJob.job_date,
      hours_spent: null,
      hours_logged: 0,
      created_at: new Date().toISOString(),
      materials_total: 0,
      labor_total: 0,
      mileage_total: 0,
      gross_profit: parseFloat(newJob.contract_price),
      gross_hourly_rate: null,
    };
    setJobs([tempJob, ...jobs]);
    const dayUnits = buildDayUnits(newJob.day_tier, newJob.day_count);
    setNewJob({ name: '', client_name: '', contract_price: '', job_date: '', day_tier: 'full', day_count: '1' });
    setJobErrors({ name: '', contract_price: '', job_date: '' });
    setShowAddJob(false);

    // Actual API call
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newJob.name,
        client_name: newJob.client_name || null,
        contract_price: parseFloat(newJob.contract_price),
        job_date: newJob.job_date,
        day_units: dayUnits,
      }),
    });
    fetchJobs();
  };

  const updateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    await fetch(`/api/jobs/${editingJob}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editJob.name,
        client_name: editJob.client_name || null,
        contract_price: parseFloat(editJob.contract_price),
        job_date: editJob.job_date,
        day_units: buildDayUnits(editJob.day_tier, editJob.day_count),
      }),
    });
    setEditingJob(null);
    fetchJobs();
  };

  const deleteJob = async (id: number) => {
    if (!confirm('Delete this job and all associated data?')) return;

    // Optimistic update - remove job immediately
    setJobs(jobs.filter(job => job.id !== id));
    setSelectedJob(null);

    // Actual API call
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    fetchJobs();
  };

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: selectedJob,
        item_name: newMaterial.item_name,
        cost: parseFloat(newMaterial.cost),
        tax: parseFloat(newMaterial.tax) || 0,
      }),
    });
    setNewMaterial({ item_name: '', cost: '', tax: '' });
    setShowAddMaterial(false);
    setShowMaterialsList(true); // Keep section expanded after adding
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const updateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    await fetch(`/api/materials/${editingMaterial}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: editMaterial.item_name,
        cost: parseFloat(editMaterial.cost),
        tax: parseFloat(editMaterial.tax) || 0,
      }),
    });
    setEditingMaterial(null);
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const deleteMaterial = async (id: number) => {
    if (!confirm('Delete this material entry?')) return;

    // Optimistic update - remove material immediately
    setMaterials(materials.filter(m => m.id !== id));

    // Actual API call
    await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const addLabor = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/labor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: selectedJob,
        helper_name: newLabor.helper_name,
        hours: newLabor.is_flat_rate ? 0 : parseFloat(newLabor.hours),
        rate: parseFloat(newLabor.rate),
        is_flat_rate: newLabor.is_flat_rate,
      }),
    });
    setNewLabor({ helper_name: '', hours: '', rate: '', is_flat_rate: false });
    setShowAddLabor(false);
    setShowLaborList(true); // Keep section expanded after adding
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const updateLabor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabor) return;

    await fetch(`/api/labor/${editingLabor}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        helper_name: editLabor.helper_name,
        hours: editLabor.is_flat_rate ? 0 : parseFloat(editLabor.hours),
        rate: parseFloat(editLabor.rate),
        is_flat_rate: editLabor.is_flat_rate,
      }),
    });
    setEditingLabor(null);
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const deleteLabor = async (id: number) => {
    if (!confirm('Delete this labor entry?')) return;

    // Optimistic update - remove labor immediately
    setLabor(labor.filter(l => l.id !== id));

    // Actual API call
    await fetch(`/api/labor/${id}`, { method: 'DELETE' });
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const addMileage = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/mileage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: selectedJob,
        miles: parseFloat(newMileage.miles),
      }),
    });
    setNewMileage({ miles: '' });
    setShowAddMileage(false);
    setShowMileageList(true); // Keep section expanded after adding
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const updateMileage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMileage) return;

    await fetch(`/api/mileage/${editingMileage}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        miles: parseFloat(editMileage.miles),
      }),
    });
    setEditingMileage(null);
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const deleteMileage = async (id: number) => {
    if (!confirm('Delete this mileage entry?')) return;

    // Optimistic update - remove mileage immediately
    setMileage(mileage.filter(m => m.id !== id));

    // Actual API call
    await fetch(`/api/mileage/${id}`, { method: 'DELETE' });
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const addHoursLog = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/hours-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: selectedJob,
        log_date: newHoursLog.log_date,
        hours: parseFloat(newHoursLog.hours),
        note: newHoursLog.note || null,
      }),
    });
    setNewHoursLog({ log_date: '', hours: '', note: '' });
    setShowAddHoursLog(false);
    setShowHoursLogList(true);
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const updateHoursLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoursLog) return;
    await fetch(`/api/hours-log/${editingHoursLog}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_date: editHoursLog.log_date,
        hours: parseFloat(editHoursLog.hours),
        note: editHoursLog.note || null,
      }),
    });
    setEditingHoursLog(null);
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const deleteHoursLog = async (id: number) => {
    if (!confirm('Delete this hours entry?')) return;
    setHoursLog(hoursLog.filter(h => h.id !== id));
    await fetch(`/api/hours-log/${id}`, { method: 'DELETE' });
    fetchJobs();
    if (selectedJob) fetchJobDetails(selectedJob);
  };

  const startEditJob = (job: JobWithCosts) => {
    // Derive the tier selector from day_units. For multi-tier (project) jobs,
    // default to the tier with the highest count so the single-tier form has a sensible value.
    let day_tier = 'full';
    let day_count = '1';
    const units = job.day_units;
    if (units && Object.keys(units).length) {
      const [topTier, topCount] = Object.entries(units).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
      day_tier = topTier;
      day_count = String(topCount);
    }
    setEditJob({
      name: job.name,
      client_name: job.client_name || '',
      contract_price: job.contract_price.toString(),
      job_date: job.job_date,
      day_tier,
      day_count,
    });
    setEditingJob(job.id);
  };

  const startEditMaterial = (mat: Material) => {
    setEditMaterial({
      item_name: mat.item_name,
      cost: mat.cost.toString(),
      tax: mat.tax.toString(),
    });
    setEditingMaterial(mat.id);
  };

  const startEditLabor = (lab: Labor) => {
    setEditLabor({
      helper_name: lab.helper_name,
      hours: lab.hours.toString(),
      rate: lab.rate.toString(),
      is_flat_rate: lab.is_flat_rate === 1,
    });
    setEditingLabor(lab.id);
  };

  const startEditMileage = (mil: Mileage) => {
    setEditMileage({
      miles: mil.miles.toString(),
    });
    setEditingMileage(mil.id);
  };

  const handleClientInput = (value: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditJob({ ...editJob, client_name: value });
    } else {
      setNewJob({ ...newJob, client_name: value });
    }

    if (value.trim() === '') {
      setFilteredClients([]);
      if (isEdit) {
        setShowEditClientDropdown(false);
      } else {
        setShowClientDropdown(false);
      }
    } else {
      const filtered = existingClients.filter(client =>
        client.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredClients(filtered);
      if (isEdit) {
        setShowEditClientDropdown(true);
      } else {
        setShowClientDropdown(true);
      }
    }
  };

  const selectClient = (client: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditJob({ ...editJob, client_name: client });
      setShowEditClientDropdown(false);
    } else {
      setNewJob({ ...newJob, client_name: client });
      setShowClientDropdown(false);
    }
    setFilteredClients([]);
  };

  const handleHelperInput = (value: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditLabor({ ...editLabor, helper_name: value });
    } else {
      setNewLabor({ ...newLabor, helper_name: value });
    }

    if (value.trim() === '') {
      setFilteredHelpers([]);
      if (isEdit) {
        setShowEditHelperDropdown(false);
      } else {
        setShowHelperDropdown(false);
      }
    } else {
      const filtered = existingHelpers.filter(helper =>
        helper.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredHelpers(filtered);
      if (isEdit) {
        setShowEditHelperDropdown(true);
      } else {
        setShowHelperDropdown(true);
      }
    }
  };

  const selectHelper = (helper: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditLabor({ ...editLabor, helper_name: helper });
      setShowEditHelperDropdown(false);
    } else {
      setNewLabor({ ...newLabor, helper_name: helper });
      setShowHelperDropdown(false);
    }
    setFilteredHelpers([]);
  };

  // Keyboard navigation for dropdowns
  const handleDropdownKeyDown = (e: React.KeyboardEvent, items: string[], onSelect: (item: string) => void, onClose: () => void) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault();
      onSelect(items[0]);
    } else if (e.key === 'Enter' && items.length > 0) {
      e.preventDefault();
      onSelect(items[0]);
    }
  };

  const currentJob = jobs.find(j => j.id === selectedJob);
  const currentYear = currentJob ? new Date(currentJob.job_date).getFullYear() : null;

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.name.toLowerCase().includes(query) ||
      (job.client_name && job.client_name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-dark-gray">
      {/* Header */}
      <header className="bg-medium-gray border-b border-light-gray px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Profit<span className="text-safety-orange">Level</span>
          </h1>
          <div className="flex gap-2 sm:gap-3 items-center">
            <button
              onClick={() => router.push('/overhead')}
              className="text-safety-orange font-semibold text-xs sm:text-sm"
            >
              <span className="hidden xs:inline">🏢 </span>Overhead
            </button>
            <button
              onClick={() => router.push('/financials')}
              className="text-safety-orange font-semibold text-xs sm:text-sm"
            >
              <span className="hidden xs:inline">📊 </span>Financials
            </button>
            <button
              onClick={() => router.push('/goals')}
              className="text-safety-orange font-semibold text-xs sm:text-sm"
            >
              <span className="hidden xs:inline">🎯 </span>Goals
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="text-safety-orange font-semibold text-xs sm:text-sm"
            >
              <span className="hidden xs:inline">⚙️ </span>Settings
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-3 sm:p-4">
        {!selectedJob ? (
          /* Job Dashboard */
          <div>
            <MonthOverviewCard />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Jobs</h2>
              <button
                onClick={() => setShowAddJob(true)}
                className="bg-safety-orange text-white px-3 py-2 sm:px-4 rounded-lg font-semibold text-sm sm:text-base"
              >
                + Add Job
              </button>
            </div>

            {/* Search Jobs */}
            {jobs.length > 0 && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Search jobs by name or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-medium-gray text-white px-4 py-2 rounded-lg border border-light-gray focus:border-safety-orange focus:outline-none"
                />
              </div>
            )}

            {showAddJob && (
              <form onSubmit={addJob} className="bg-medium-gray p-4 rounded-lg mb-4">
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Job Name (e.g., 3 Dogwood)"
                    value={newJob.name}
                    onChange={(e) => {
                      setNewJob({ ...newJob, name: e.target.value });
                      if (jobErrors.name) setJobErrors({ ...jobErrors, name: '' });
                    }}
                    className={`w-full bg-light-gray text-white px-3 py-2 rounded ${jobErrors.name ? 'border-2 border-red-500' : ''}`}
                  />
                  {jobErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{jobErrors.name}</p>
                  )}
                </div>
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Client Name (optional)"
                    value={newJob.client_name}
                    onChange={(e) => handleClientInput(e.target.value, false)}
                    onFocus={() => {
                      if (newJob.client_name.trim() !== '') {
                        const filtered = existingClients.filter(client =>
                          client.toLowerCase().includes(newJob.client_name.toLowerCase())
                        );
                        setFilteredClients(filtered);
                        setShowClientDropdown(true);
                      }
                    }}
                    onKeyDown={(e) => handleDropdownKeyDown(e, filteredClients, (client) => selectClient(client, false), () => setShowClientDropdown(false))}
                    className="w-full bg-light-gray text-white px-3 py-2 rounded"
                  />
                  {showClientDropdown && filteredClients.length > 0 && (
                    <div className="absolute z-10 w-full bg-medium-gray border border-light-gray rounded mt-1 max-h-40 overflow-y-auto">
                      {filteredClients.map((client) => (
                        <div
                          key={client}
                          onClick={() => selectClient(client, false)}
                          className="px-3 py-2 text-white hover:bg-light-gray cursor-pointer"
                        >
                          {client}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Contract Price"
                    value={newJob.contract_price}
                    onChange={(e) => {
                      setNewJob({ ...newJob, contract_price: e.target.value });
                      if (jobErrors.contract_price) setJobErrors({ ...jobErrors, contract_price: '' });
                    }}
                    className={`w-full bg-light-gray text-white px-3 py-2 rounded ${jobErrors.contract_price ? 'border-2 border-red-500' : ''}`}
                  />
                  {jobErrors.contract_price && (
                    <p className="text-red-500 text-xs mt-1">{jobErrors.contract_price}</p>
                  )}
                </div>
                <div className="mb-2">
                  <input
                    type="date"
                    value={newJob.job_date}
                    onChange={(e) => {
                      setNewJob({ ...newJob, job_date: e.target.value });
                      if (jobErrors.job_date) setJobErrors({ ...jobErrors, job_date: '' });
                    }}
                    className={`w-full bg-light-gray text-white px-3 py-2 rounded ${jobErrors.job_date ? 'border-2 border-red-500' : ''}`}
                  />
                  {jobErrors.job_date && (
                    <p className="text-red-500 text-xs mt-1">{jobErrors.job_date}</p>
                  )}
                </div>
                <div className="mb-2">
                  <TierSelector
                    tier={newJob.day_tier}
                    count={newJob.day_count}
                    onChange={(day_tier, day_count) => setNewJob({ ...newJob, day_tier, day_count })}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-safety-orange text-white py-2 rounded font-semibold">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddJob(false)}
                    className="flex-1 bg-light-gray text-white py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {jobs.length === 0 && !showAddJob ? (
                <div className="bg-medium-gray p-8 rounded-lg text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-xl font-bold text-white mb-2">No Jobs Yet</h3>
                  <p className="text-gray-400 mb-4">Get started by adding your first job</p>
                  <button
                    onClick={() => setShowAddJob(true)}
                    className="bg-safety-orange text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    + Add Your First Job
                  </button>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="bg-medium-gray p-8 rounded-lg text-center">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-white mb-2">No Jobs Found</h3>
                  <p className="text-gray-400 mb-4">No jobs match your search criteria</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-safety-orange text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <JobStampCard key={job.id} job={job} showSub onOpen={() => setSelectedJob(job.id)} />
                ))
              )}
            </div>
          </div>
        ) : (
          /* Job Details */
          <div>
            <button
              onClick={() => setSelectedJob(null)}
              className="mb-4 text-safety-orange font-semibold"
            >
              ← Back to Jobs
            </button>

            {currentJob && (
              <>
                {editingJob === currentJob.id ? (
                  <form onSubmit={updateJob} className="bg-medium-gray p-4 rounded-lg mb-4">
                    <input
                      type="text"
                      value={editJob.name}
                      onChange={(e) => setEditJob({ ...editJob, name: e.target.value })}
                      className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                      required
                    />
                    <div className="relative mb-2">
                      <input
                        type="text"
                        placeholder="Client Name (optional)"
                        value={editJob.client_name}
                        onChange={(e) => handleClientInput(e.target.value, true)}
                        onFocus={() => {
                          if (editJob.client_name.trim() !== '') {
                            const filtered = existingClients.filter(client =>
                              client.toLowerCase().includes(editJob.client_name.toLowerCase())
                            );
                            setFilteredClients(filtered);
                            setShowEditClientDropdown(true);
                          }
                        }}
                        className="w-full bg-light-gray text-white px-3 py-2 rounded"
                      />
                      {showEditClientDropdown && filteredClients.length > 0 && (
                        <div className="absolute z-10 w-full bg-medium-gray border border-light-gray rounded mt-1 max-h-40 overflow-y-auto">
                          {filteredClients.map((client) => (
                            <div
                              key={client}
                              onClick={() => selectClient(client, true)}
                              className="px-3 py-2 text-white hover:bg-light-gray cursor-pointer"
                            >
                              {client}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editJob.contract_price}
                      onChange={(e) => setEditJob({ ...editJob, contract_price: e.target.value })}
                      className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                      required
                    />
                    <input
                      type="date"
                      value={editJob.job_date}
                      onChange={(e) => setEditJob({ ...editJob, job_date: e.target.value })}
                      className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                      required
                    />
                    <div className="mb-2">
                      <TierSelector
                        tier={editJob.day_tier}
                        count={editJob.day_count}
                        onChange={(day_tier, day_count) => setEditJob({ ...editJob, day_tier, day_count })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-safety-orange text-white py-2 rounded font-semibold">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingJob(null)}
                        className="flex-1 bg-light-gray text-white py-2 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-medium-gray p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h2 className="text-2xl font-bold text-white">{currentJob.name}</h2>
                        {currentJob.client_name && (
                          <div className="text-sm text-safety-orange mt-1">
                            {currentJob.client_name}
                          </div>
                        )}
                        <div className="text-sm text-gray-400 mt-1">
                          {new Date(currentJob.job_date).toLocaleDateString()} ({currentYear})
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditJob(currentJob)}
                          className="text-safety-orange text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteJob(currentJob.id)}
                          className="text-red-500 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {/* The math — ledger */}
                    <div className="mt-4 pt-4 border-t border-light-gray pl-mono">
                      <div className="font-bold uppercase text-pl-muted-2 mb-1" style={{ fontSize: 11, letterSpacing: '0.16em', fontFamily: 'var(--font-archivo)' }}>The math</div>
                      {[
                        { label: 'Revenue', val: formatCurrency(currentJob.contract_price), color: '#F2EDE4', neg: false },
                        { label: 'Materials', val: formatCurrency(currentJob.materials_total), color: PL_CLAY, neg: true },
                        { label: 'Labor / helper', val: formatCurrency(currentJob.labor_total), color: PL_CLAY, neg: true },
                        { label: 'Mileage', val: formatCurrency(currentJob.mileage_total), color: PL_CLAY, neg: true },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between py-3" style={{ borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
                          <span className="text-pl-text-2" style={{ fontSize: 14 }}>{row.label}</span>
                          <span className="font-semibold" style={{ fontSize: 14, color: row.color }}>{row.neg ? '−' : ''}{row.val}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-baseline pt-4 pb-2">
                        <span className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 12, letterSpacing: '0.06em', fontFamily: 'var(--font-archivo)' }}>Gross profit</span>
                        <span className="font-semibold" style={{ fontSize: 28 }}>{formatCurrency(currentJob.gross_profit)}</span>
                      </div>
                    </div>
                    {/* Result banner */}
                    {currentJob.day_rate && currentJob.day_rate.met !== null && (() => {
                      const dr = currentJob.day_rate!;
                      const tok = resultTokens(dr.met);
                      return (
                        <div className="mt-2 p-[14px] rounded-[11px]" style={{ background: tok.bg, border: `1px solid ${tok.bd}` }}>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold" style={{ fontSize: 15, color: tok.color }}>
                              {dr.met ? '✓ Cleared the day rate' : '✗ Under the day rate'}
                            </span>
                            <span className="pl-mono font-semibold" style={{ fontSize: 17, color: tok.color }}>
                              {dr.delta >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dr.delta))}
                            </span>
                          </div>
                          <div className="text-pl-muted mt-[5px]" style={{ fontSize: 12 }}>
                            {dr.met
                              ? `Gross beat your ${formatCurrency(dr.target)} target (${dr.day_count} day${dr.day_count > 1 ? 's' : ''}). Priced right.`
                              : `Short of your ${formatCurrency(dr.target)} target — quote higher or trim costs next time.`}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Materials Section */}
                <div className="mb-6">
                  <div className="bg-medium-gray p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => setShowMaterialsList(!showMaterialsList)}
                          className="text-white"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${showMaterialsList ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <h3 className="text-lg font-bold text-white">Materials</h3>
                        <span className="text-safety-orange font-semibold ml-2">
                          {formatCurrency(currentJob.materials_total)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddMaterial(true);
                          setShowMaterialsList(true);
                        }}
                        className="bg-safety-orange text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        + Add
                      </button>
                    </div>

                  {showMaterialsList && (
                    <>
                      {showAddMaterial && (
                        <form onSubmit={addMaterial} className="bg-light-gray p-4 rounded-lg mb-2 mt-2">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={newMaterial.item_name}
                        onChange={(e) => setNewMaterial({ ...newMaterial, item_name: e.target.value })}
                        className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={newMaterial.cost}
                        onChange={(e) => setNewMaterial({ ...newMaterial, cost: e.target.value })}
                        className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Tax (optional)"
                        value={newMaterial.tax}
                        onChange={(e) => setNewMaterial({ ...newMaterial, tax: e.target.value })}
                        className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-safety-orange text-white py-2 rounded font-semibold">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddMaterial(false)}
                          className="flex-1 bg-light-gray text-white py-2 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2 mt-2">
                    {materials.map((m) => (
                      editingMaterial === m.id ? (
                        <form key={m.id} onSubmit={updateMaterial} className="bg-medium-gray p-3 rounded">
                          <input
                            type="text"
                            value={editMaterial.item_name}
                            onChange={(e) => setEditMaterial({ ...editMaterial, item_name: e.target.value })}
                            className="w-full bg-light-gray text-white px-2 py-1 rounded mb-1 text-sm"
                            required
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editMaterial.cost}
                            onChange={(e) => setEditMaterial({ ...editMaterial, cost: e.target.value })}
                            className="w-full bg-light-gray text-white px-2 py-1 rounded mb-1 text-sm"
                            required
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Tax"
                            value={editMaterial.tax}
                            onChange={(e) => setEditMaterial({ ...editMaterial, tax: e.target.value })}
                            className="w-full bg-light-gray text-white px-2 py-1 rounded mb-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-safety-orange text-white py-1 rounded text-sm">
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMaterial(null)}
                              className="flex-1 bg-light-gray text-white py-1 rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div key={m.id} className="bg-medium-gray p-3 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex justify-between text-white">
                                <span>{m.item_name}</span>
                                <span>{formatCurrency(m.cost + m.tax)}</span>
                              </div>
                              {m.tax > 0 && <div className="text-xs text-gray-400">Tax: {formatCurrency(m.tax)}</div>}
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => startEditMaterial(m)}
                                className="text-safety-orange text-sm px-3 py-2 hover:bg-light-gray rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteMaterial(m.id)}
                                className="text-red-500 text-sm px-3 py-2 hover:bg-light-gray rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                  </>
                  )}
                  </div>
                </div>

                {/* Labor Section */}
                <div className="mb-6">
                  <div className="bg-medium-gray p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => setShowLaborList(!showLaborList)}
                          className="text-white"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${showLaborList ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <h3 className="text-lg font-bold text-white">Labor</h3>
                        <span className="text-safety-orange font-semibold ml-2">
                          {formatCurrency(currentJob.labor_total)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddLabor(true);
                          setShowLaborList(true);
                        }}
                        className="bg-safety-orange text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        + Add
                      </button>
                    </div>

                  {showLaborList && (
                    <>
                      {showAddLabor && (
                        <form onSubmit={addLabor} className="bg-light-gray p-4 rounded-lg mb-2 mt-2">
                      <div className="relative mb-2">
                        <input
                          type="text"
                          placeholder="Helper Name"
                          value={newLabor.helper_name}
                          onChange={(e) => handleHelperInput(e.target.value, false)}
                          onFocus={() => {
                            if (newLabor.helper_name.trim() !== '') {
                              const filtered = existingHelpers.filter(helper =>
                                helper.toLowerCase().includes(newLabor.helper_name.toLowerCase())
                              );
                              setFilteredHelpers(filtered);
                              setShowHelperDropdown(true);
                            }
                          }}
                          className="w-full bg-dark-gray text-white px-3 py-2 rounded"
                          required
                        />
                        {showHelperDropdown && filteredHelpers.length > 0 && (
                          <div className="absolute z-10 w-full bg-medium-gray border border-light-gray rounded mt-1 max-h-40 overflow-y-auto">
                            {filteredHelpers.map((helper) => (
                              <div
                                key={helper}
                                onClick={() => selectHelper(helper, false)}
                                className="px-3 py-2 text-white hover:bg-light-gray cursor-pointer"
                              >
                                {helper}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="text-white text-sm font-semibold mb-2 block">Rate Type</label>
                        <div className="flex gap-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="rate_type"
                              checked={!newLabor.is_flat_rate}
                              onChange={() => setNewLabor({ ...newLabor, is_flat_rate: false })}
                              className="mr-2"
                            />
                            <span className="text-white">Hourly</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="rate_type"
                              checked={newLabor.is_flat_rate}
                              onChange={() => setNewLabor({ ...newLabor, is_flat_rate: true })}
                              className="mr-2"
                            />
                            <span className="text-white">Flat Rate</span>
                          </label>
                        </div>
                      </div>

                      {!newLabor.is_flat_rate && (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Hours"
                          value={newLabor.hours}
                          onChange={(e) => setNewLabor({ ...newLabor, hours: e.target.value })}
                          className="w-full bg-dark-gray text-white px-3 py-2 rounded mb-2"
                          required
                        />
                      )}
                      <input
                        type="number"
                        step="0.01"
                        placeholder={newLabor.is_flat_rate ? "Flat Rate ($)" : "Rate ($/hr)"}
                        value={newLabor.rate}
                        onChange={(e) => setNewLabor({ ...newLabor, rate: e.target.value })}
                        className="w-full bg-dark-gray text-white px-3 py-2 rounded mb-2"
                        required
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-safety-orange text-white py-2 rounded font-semibold">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddLabor(false)}
                          className="flex-1 bg-light-gray text-white py-2 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {labor.map((l) => (
                      editingLabor === l.id ? (
                        <form key={l.id} onSubmit={updateLabor} className="bg-medium-gray p-3 rounded">
                          <div className="relative mb-1">
                            <input
                              type="text"
                              value={editLabor.helper_name}
                              onChange={(e) => handleHelperInput(e.target.value, true)}
                              onFocus={() => {
                                if (editLabor.helper_name.trim() !== '') {
                                  const filtered = existingHelpers.filter(helper =>
                                    helper.toLowerCase().includes(editLabor.helper_name.toLowerCase())
                                  );
                                  setFilteredHelpers(filtered);
                                  setShowEditHelperDropdown(true);
                                }
                              }}
                              className="w-full bg-light-gray text-white px-2 py-1 rounded text-sm"
                              required
                            />
                            {showEditHelperDropdown && filteredHelpers.length > 0 && (
                              <div className="absolute z-10 w-full bg-medium-gray border border-light-gray rounded mt-1 max-h-40 overflow-y-auto">
                                {filteredHelpers.map((helper) => (
                                  <div
                                    key={helper}
                                    onClick={() => selectHelper(helper, true)}
                                    className="px-3 py-2 text-white hover:bg-light-gray cursor-pointer text-sm"
                                  >
                                    {helper}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mb-2">
                            <label className="text-white text-xs font-semibold mb-1 block">Rate Type</label>
                            <div className="flex gap-3">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name="edit_rate_type"
                                  checked={!editLabor.is_flat_rate}
                                  onChange={() => setEditLabor({ ...editLabor, is_flat_rate: false })}
                                  className="mr-1"
                                />
                                <span className="text-white text-xs">Hourly</span>
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name="edit_rate_type"
                                  checked={editLabor.is_flat_rate}
                                  onChange={() => setEditLabor({ ...editLabor, is_flat_rate: true })}
                                  className="mr-1"
                                />
                                <span className="text-white text-xs">Flat Rate</span>
                              </label>
                            </div>
                          </div>

                          {!editLabor.is_flat_rate && (
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Hours"
                              value={editLabor.hours}
                              onChange={(e) => setEditLabor({ ...editLabor, hours: e.target.value })}
                              className="w-full bg-light-gray text-white px-2 py-1 rounded mb-1 text-sm"
                              required
                            />
                          )}
                          <input
                            type="number"
                            step="0.01"
                            placeholder={editLabor.is_flat_rate ? "Flat Rate ($)" : "Rate ($/hr)"}
                            value={editLabor.rate}
                            onChange={(e) => setEditLabor({ ...editLabor, rate: e.target.value })}
                            className="w-full bg-light-gray text-white px-2 py-1 rounded mb-2 text-sm"
                            required
                          />
                          <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-safety-orange text-white py-1 rounded text-sm">
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLabor(null)}
                              className="flex-1 bg-light-gray text-white py-1 rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div key={l.id} className="bg-medium-gray p-3 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex justify-between text-white">
                                <span>{l.helper_name}</span>
                                <span>{formatCurrency(l.is_flat_rate ? l.rate : l.hours * l.rate)}</span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {l.is_flat_rate ? 'Flat Rate' : `${formatNumber(l.hours, 1)}h × ${formatCurrency(l.rate)}/hr`}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => startEditLabor(l)}
                                className="text-safety-orange text-sm px-3 py-2 hover:bg-light-gray rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteLabor(l.id)}
                                className="text-red-500 text-sm px-3 py-2 hover:bg-light-gray rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                  </>
                  )}
                  </div>
                </div>

                {/* Day Type panel — tier grid (matches redesign) */}
                <div className="mb-6">
                  <div className="bg-pl-card p-[18px] rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-baseline justify-between">
                      <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Day type</div>
                      <div className="text-pl-faint" style={{ fontSize: 11 }}>{tierSummary(currentJob.day_units ?? null)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-[14px]">
                      {TIER_ORDER.map((t) => {
                        const sel = (currentJob.day_units?.[t] || 0) > 0;
                        return (
                          <div
                            key={t}
                            className="text-left p-3 rounded-[11px]"
                            style={{
                              background: sel ? 'rgba(255,106,26,0.12)' : '#13110F',
                              border: `1.5px solid ${sel ? PL_ACCENT : 'rgba(255,255,255,0.08)'}`,
                            }}
                          >
                            <div className="font-bold uppercase" style={{ fontSize: 12, letterSpacing: '0.04em', color: sel ? PL_ACCENT : '#9A9183' }}>
                              {TIER_LABELS[t]}
                            </div>
                            <div className="pl-mono font-semibold mt-[3px]" style={{ fontSize: 20, color: sel ? '#F2EDE4' : '#B6AD9D' }}>
                              {sel && (currentJob.day_units?.[t] || 0) > 1 ? `×${currentJob.day_units?.[t]}` : (sel ? 'set' : '—')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-pl-faint mt-3" style={{ fontSize: 11 }}>Change the tier in Edit.</div>
                  </div>
                </div>

                {/* Mileage Section */}
                <div className="mb-6">
                  <div className="bg-medium-gray p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => setShowMileageList(!showMileageList)}
                          className="text-white"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${showMileageList ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <h3 className="text-lg font-bold text-white">Mileage</h3>
                        <span className="text-safety-orange font-semibold ml-2">
                          {formatCurrency(currentJob.mileage_total)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddMileage(true);
                          setShowMileageList(true);
                        }}
                        className="bg-safety-orange text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        + Add
                      </button>
                    </div>

                  {showMileageList && (
                    <>
                      {showAddMileage && (
                        <form onSubmit={addMileage} className="bg-light-gray p-4 rounded-lg mb-2 mt-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Miles"
                        value={newMileage.miles}
                        onChange={(e) => setNewMileage({ miles: e.target.value })}
                        className="w-full bg-light-gray text-white px-3 py-2 rounded mb-2"
                        required
                      />
                      <div className="text-xs text-gray-400 mb-2">
                        Rate for {currentYear}: Auto-calculated from IRS standards
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-safety-orange text-white py-2 rounded font-semibold">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddMileage(false)}
                          className="flex-1 bg-light-gray text-white py-2 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {mileage.map((m) => (
                      editingMileage === m.id ? (
                        <form key={m.id} onSubmit={updateMileage} className="bg-medium-gray p-3 rounded">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Miles"
                            value={editMileage.miles}
                            onChange={(e) => setEditMileage({ miles: e.target.value })}
                            className="w-full bg-light-gray text-white px-2 py-1 rounded mb-2 text-sm"
                            required
                          />
                          <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-safety-orange text-white py-1 rounded text-sm">
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMileage(null)}
                              className="flex-1 bg-light-gray text-white py-1 rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div key={m.id} className="bg-medium-gray p-3 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex justify-between text-white">
                                <span>{formatNumber(m.miles, 1)} miles</span>
                                <span>{formatCurrency(m.miles * m.rate)}</span>
                              </div>
                              <div className="text-xs text-gray-400">@{formatCurrency(m.rate)}/mile</div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => startEditMileage(m)}
                                className="text-safety-orange text-sm px-3 py-2 hover:bg-light-gray rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteMileage(m.id)}
                                className="text-red-500 text-sm px-3 py-2 hover:bg-light-gray rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                  </>
                  )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Floating Add Expense Button */}
      <button
        onClick={() => setShowAddExpenseModal(true)}
        className="fixed bottom-6 right-6 bg-safety-orange text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold z-40 hover:bg-orange-600 transition"
        aria-label="Add Expense"
      >
        +
      </button>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onSuccess={() => {
          fetchJobs();
          if (selectedJob) fetchJobDetails(selectedJob);
        }}
      />
    </div>
  );
}
