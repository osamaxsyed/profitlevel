export interface Job {
  id: number;
  name: string;
  client_name: string | null;
  contract_price: number;
  job_date: string;
  hours_spent: number | null;
  created_at: string;
}

export interface Material {
  id: number;
  job_id: number;
  item_name: string;
  cost: number;
  tax: number;
  created_at: string;
}

export interface Labor {
  id: number;
  job_id: number;
  helper_name: string;
  hours: number;
  rate: number;
  is_flat_rate: number;
  created_at: string;
}

export interface Mileage {
  id: number;
  job_id: number;
  miles: number;
  rate: number;
  created_at: string;
}

export interface HoursLog {
  id: number;
  job_id: number;
  log_date: string;
  hours: number;
  note: string | null;
  created_at: string;
}

export interface JobWithCosts extends Job {
  materials_total: number;
  labor_total: number;
  mileage_total: number;
  gross_profit: number;
  gross_hourly_rate: number | null;
  hours_logged: number;
}

export interface IRSRate {
  id: number;
  year: number;
  rate: number;
}

export interface Overhead {
  id: number;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  created_at: string;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
}

export interface BusinessHealth {
  total_monthly_overhead: number;
  total_billable_hours: number;
  overhead_per_hour: number;
  breakeven_hours: number;
}
