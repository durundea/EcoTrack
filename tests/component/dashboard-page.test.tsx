import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../../src/features/dashboard/DashboardPage';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  Legend: () => null,
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });

  activeQueryClients.push(queryClient);

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function setAdminSession() {
  setSession({
    token: 'admin-token',
    user: {
      id: 'U-001',
      name: 'Admin User',
      role: 'admin',
      email: 'admin@ecotrack.local',
    },
  });
}

let activeQueryClients: QueryClient[] = [];

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5000');
    clearSession();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    activeQueryClients.forEach((client) => client.clear());
    activeQueryClients = [];
    vi.unstubAllEnvs();
  });

  it('shows pending approval count for admins when analytics payload provides approval data', async () => {
    setAdminSession();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          range: { fromUtc: '2026-06-10T00:00:00Z', toUtc: '2026-06-16T23:59:59Z', label: '7d' },
          kpis: {
            totalWasteProcessedKg: 1000,
            revenueInr: 50000,
            recyclingEfficiencyPercent: 75,
            co2ReductionKg: 500,
          },
          wasteByCategory: [{ category: 'plastic', weightKg: 400, sharePercent: 40 }],
          categoryDistribution: [],
          pendingSalesApprovals: {
            count: 3,
            isDataAvailable: true,
            message: '3 approvals pending',
          },
        }),
        { status: 200 }
      )
    );

    renderDashboard();

    expect(await screen.findByRole('heading', { name: /pending sales approvals/i })).toBeInTheDocument();
    expect(await screen.findByText('3 pending for approval')).toBeInTheDocument();
  });

  it('shows fallback approval message for admins when approval data is unavailable', async () => {
    setAdminSession();

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    renderDashboard();

    expect(await screen.findByRole('heading', { name: /pending sales approvals/i })).toBeInTheDocument();
    expect(await screen.findByText('Pending approvals unavailable in mock mode.')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/analytics/dashboard?'),
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });
});