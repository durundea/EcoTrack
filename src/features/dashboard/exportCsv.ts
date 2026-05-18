import type { DashboardSummary, WasteCategory } from '../../shared/api/contracts';

export function exportSummaryToCsv(summary: DashboardSummary): void {
  const rows: string[][] = [
    ['Metric', 'Value'],
    ['Total Waste Processed (kg)', String(summary.totalWasteProcessedKg)],
    ['Revenue (INR)', String(summary.revenueINR)],
    ['Recycling Efficiency (%)', String(summary.recyclingEfficiencyPct)],
    ['CO2 Reduction (kg)', String(summary.co2ReductionKg)],
    [],
    ['Category', 'Weight (kg)'],
    ...(['plastic', 'organic', 'metal', 'paper', 'ewaste'] as WasteCategory[]).map((cat) => [
      cat.charAt(0).toUpperCase() + cat.slice(1),
      String(summary.byCategory[cat]),
    ]),
  ];

  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ecotrack-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
