// Get profit color based on hourly profit and goals
export function getProfitColor(
  hourlyProfit: number | null,
  grossGoal: number,
  netGoal: number
): string {
  if (hourlyProfit === null || hourlyProfit === undefined) return 'text-gray-400';

  if (hourlyProfit >= grossGoal) return 'text-green-500';
  if (hourlyProfit >= netGoal) return 'text-yellow-500';
  return 'text-red-500';
}

// Format currency with thousand separators
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format hours
export function formatHours(hours: number | null): string {
  if (hours === null || hours === undefined) return 'N/A';
  return `${hours.toFixed(1)}h`;
}

// Format number with thousand separators
export function formatNumber(num: number | null | undefined, decimals: number = 0): string {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format percentage
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(1)}%`;
}
