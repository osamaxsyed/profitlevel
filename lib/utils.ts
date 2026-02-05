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

// Format currency
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Format hours
export function formatHours(hours: number | null): string {
  if (hours === null || hours === undefined) return 'N/A';
  return `${hours.toFixed(1)}h`;
}
