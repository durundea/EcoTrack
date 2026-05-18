import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useDashboardData } from './useDashboardData';
import { DEFAULT_FILTERS, type DashboardFilters } from './filters';
import { exportSummaryToCsv } from './exportCsv';
import type { WasteCategory } from '../../shared/api/contracts';

const CATEGORY_COLORS: Record<WasteCategory, string> = {
  plastic: '#3b82f6',
  organic: '#22c55e',
  metal: '#a855f7',
  paper: '#f59e0b',
  ewaste: '#ef4444',
};

const CATEGORIES: WasteCategory[] = ['plastic', 'organic', 'metal', 'paper', 'ewaste'];

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-100">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const { data: summary, isLoading } = useDashboardData(filters);

  const categoryBarData = CATEGORIES.map((cat) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    kg: summary?.byCategory[cat] ?? 0,
    fill: CATEGORY_COLORS[cat],
  }));

  const categoryPieData = CATEGORIES.map((cat) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: summary?.byCategory[cat] ?? 0,
    fill: CATEGORY_COLORS[cat],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
        {summary && (
          <button
            onClick={() => exportSummaryToCsv(summary)}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div>
          <label className="mr-2 text-xs text-slate-400">Range</label>
          <select
            value={filters.range}
            onChange={(e) => setFilters((f) => ({ ...f, range: e.target.value as DashboardFilters['range'] }))}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        <div>
          <label className="mr-2 text-xs text-slate-400">Waste Type</label>
          <select
            value={filters.wasteType}
            onChange={(e) => setFilters((f) => ({ ...f, wasteType: e.target.value as DashboardFilters['wasteType'] }))}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="all">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading analytics…</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              label="Total Waste Processed"
              value={`${(summary!.totalWasteProcessedKg / 1000).toFixed(1)} t`}
              sub={`${summary!.totalWasteProcessedKg} kg`}
            />
            <KpiCard
              label="Revenue"
              value={`₹${(summary!.revenueINR / 1000).toFixed(1)}k`}
              sub="INR"
            />
            <KpiCard
              label="Recycling Efficiency"
              value={`${summary!.recyclingEfficiencyPct}%`}
            />
            <KpiCard
              label="CO₂ Reduction"
              value={`${summary!.co2ReductionKg} kg`}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Bar chart */}
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-sm font-medium text-slate-300">Waste by Category (kg)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryBarData}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar dataKey="kg" radius={[4, 4, 0, 0]}>
                    {categoryBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-sm font-medium text-slate-300">Category Distribution</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drill-down table */}
          <div className="rounded-lg border border-slate-800">
            <div className="bg-slate-800 px-4 py-3 text-xs font-semibold uppercase text-slate-400">
              Category Breakdown
            </div>
            <table className="w-full text-sm text-slate-100">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-2 text-left text-xs text-slate-400">Category</th>
                  <th className="px-4 py-2 text-left text-xs text-slate-400">Weight (kg)</th>
                  <th className="px-4 py-2 text-left text-xs text-slate-400">Share (%)</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat) => {
                  const kg = summary!.byCategory[cat];
                  const share = ((kg / summary!.totalWasteProcessedKg) * 100).toFixed(1);
                  return (
                    <tr key={cat} className="border-b border-slate-800 hover:bg-slate-800/40">
                      <td className="px-4 py-2 capitalize">{cat}</td>
                      <td className="px-4 py-2">{kg}</td>
                      <td className="px-4 py-2">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
