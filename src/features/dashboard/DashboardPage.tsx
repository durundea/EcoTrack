import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useDashboardData } from './useDashboardData';
import { DEFAULT_FILTERS, type DashboardFilters } from './filters';
import { exportSummaryToCsv } from './exportCsv';
import { WASTE_CATEGORIES, WASTE_CHART_COLORS, WASTE_LABELS } from '../../shared/domain/waste';
import { KpiCard } from '../../shared/ui/KpiCard';
import { PageHeader } from '../../shared/ui/PageHeader';
import { CrudActions } from '../../shared/ui/CrudActions';
import { Button, DataTable, Select } from '../../shared/ui/primitives';
import { getSession } from '../auth/sessionStore';

export function DashboardPage() {
  const user = getSession()?.user ?? null;
  const isAdmin = user?.role === 'admin';
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const { data: summary, isLoading } = useDashboardData(filters);

  const categoryBarData = WASTE_CATEGORIES.map((cat) => ({
    name: WASTE_LABELS[cat],
    kg: summary?.byCategory[cat] ?? 0,
    fill: WASTE_CHART_COLORS[cat],
  }));

  const categoryPieData = WASTE_CATEGORIES.map((cat) => ({
    name: WASTE_LABELS[cat],
    value: summary?.byCategory[cat] ?? 0,
    fill: WASTE_CHART_COLORS[cat],
  }));

  const pendingSalesApprovals = summary?.pendingSalesApprovals;
  const pendingApprovalsMessage = pendingSalesApprovals
    ? !pendingSalesApprovals.isDataAvailable
      ? (pendingSalesApprovals.message || 'Approval queue is temporarily unavailable.')
      : pendingSalesApprovals.count > 0
        ? `${pendingSalesApprovals.count} pending for approval`
        : 'No pending sales approvals.'
    : 'Approval data is currently unavailable.';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Track throughput, efficiency, revenue, and CO2 impact from a single operations view."
        actions={
          summary ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => exportSummaryToCsv(summary)}
            >
              Export CSV
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900/75 p-4 shadow-lg shadow-slate-950/30 sm:grid-cols-2">
        <Select
          label="Range"
          value={filters.range}
          options={[
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
          ]}
          onChange={(next) => setFilters((f) => ({ ...f, range: next as DashboardFilters['range'] }))}
        />
        <Select
          label="Waste Type"
          value={filters.wasteType}
          options={[
            { value: 'all', label: 'All' },
            ...WASTE_CATEGORIES.map((category) => ({
              value: category,
              label: WASTE_LABELS[category],
            })),
          ]}
          onChange={(next) => setFilters((f) => ({ ...f, wasteType: next as DashboardFilters['wasteType'] }))}
        />
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading analytics…</p>
      ) : !summary ? (
        <p className="text-slate-400">Dashboard data is currently unavailable.</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/30">
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
            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/30">
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
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-400">Category Breakdown</h2>
            <DataTable
              columns={[
                {
                  key: 'category',
                  header: 'Category',
                  render: (row: { category: string }) => row.category,
                },
                {
                  key: 'weight',
                  header: 'Weight (kg)',
                  render: (row: { kg: number }) => row.kg,
                },
                {
                  key: 'share',
                  header: 'Share (%)',
                  render: (row: { share: string }) => `${row.share}%`,
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: () => <CrudActions />,
                },
              ]}
              rows={WASTE_CATEGORIES.map((cat) => {
                const kg = summary.byCategory[cat];
                const share = summary.totalWasteProcessedKg > 0
                  ? ((kg / summary.totalWasteProcessedKg) * 100).toFixed(1)
                  : '0.0';

                return {
                  id: cat,
                  category: WASTE_LABELS[cat],
                  kg,
                  share,
                };
              })}
              state="ready"
              getRowKey={(row) => row.id}
            />
          </div>

          {isAdmin && (
            <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-5 shadow-lg shadow-slate-950/30">
              <h2 className="mb-2 text-sm font-semibold text-amber-200">Pending Sales Approvals</h2>
              <p className="text-sm text-amber-100">{pendingApprovalsMessage}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
