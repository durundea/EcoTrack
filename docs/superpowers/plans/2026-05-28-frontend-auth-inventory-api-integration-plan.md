# EcoTrack Frontend Auth and Inventory API Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend mock auth and inventory adapter with real .NET API calls so login, inventory changes, and sales approval actions persist to PostgreSQL.

**Architecture:** Keep the existing frontend domain models and React screens stable, but split the shared API layer into focused modules: a low-level HTTP transport, an auth adapter, and an inventory adapter. During this phase, `auth` and `inventory` move to the real backend while `collection`, `segregation`, `recycling`, and `dashboard summary` remain on a legacy mock path so the migration stays narrow and reversible.

**Tech Stack:** React, TypeScript, Vite, TanStack Query, React Router, Vitest, React Testing Library, .NET 8 Web API, PostgreSQL, JWT bearer auth.

---

## Scope and Constraints

- This plan only covers frontend integration for `Auth` and `Inventory`.
- The backend is expected to run from the sibling repository created by the backend phase-1 work.
- There is no runtime mock fallback for auth or inventory once this plan is implemented.
- Existing frontend types in `src/shared/api/contracts.ts` remain the UI-facing contract. Backend DTO differences are handled in adapter mapping code.
- Non-target modules keep their current mock behavior until a later migration plan replaces them.

## File Structure and Responsibilities

Shared API foundation:
- Create: `src/shared/api/http.ts`
  - Centralized fetch wrapper, JSON parsing, bearer-token injection, and stable HTTP error objects.
- Create: `src/shared/api/authApi.ts`
  - Real API adapter for `login` and `me`.
- Create: `src/shared/api/inventoryApi.ts`
  - Real API adapter for inventory items and sales approval workflow.
- Create: `src/shared/api/legacyMockModules.ts`
  - Houses the current mock `collection`, `segregation`, `recycling`, and `dashboard` modules so `client.ts` can compose real and mock modules cleanly.
- Modify: `src/shared/api/client.ts`
  - Export one `api` object that uses real `auth` and `inventory` modules plus legacy mocks for the remaining areas.

Auth and app bootstrap:
- Modify: `src/features/auth/types.ts`
  - Add session and auth response types.
- Modify: `src/features/auth/sessionStore.ts`
  - Store `{ token, user }`, expose token access helpers, and preserve existing `canAccess()` behavior.
- Create: `src/features/auth/useAuthBootstrap.ts`
  - Revalidate the stored token with `/api/auth/me` when protected routes mount.
- Modify: `src/features/auth/LoginPage.tsx`
  - Replace hardcoded users with a mutation that calls the backend.
- Modify: `src/app/routes.tsx`
  - Gate protected routes on the stored auth session and trigger auth bootstrap on entry.
- Modify: `src/app/providers.tsx`
  - Keep one `QueryClient`, but add query defaults that are safe for authenticated API calls.

Inventory integration:
- Modify: `src/features/inventory/InventoryPage.tsx`
  - Remove client-supplied actor metadata from inventory mutations and use the new API signatures.
- Modify: `src/features/inventory/useInventoryApproval.ts`
  - Approve pending sales without passing actor details from the UI.
- Modify: `src/features/dashboard/DashboardPage.tsx`
  - Update the pending-approval action to use JWT-derived backend identity.

Error handling and configuration:
- Modify: `src/shared/errors/mapApiError.ts`
  - Accept transport errors consistently and preserve existing user-facing copy.
- Modify: `src/vite-env.d.ts`
  - Add typing for `VITE_API_BASE_URL`.
- Modify: `README.md`
  - Document frontend-to-backend local setup and required environment variables.

Tests:
- Create: `tests/unit/auth-session.test.ts`
  - Session/token storage behavior.
- Create: `tests/unit/http-api.test.ts`
  - Fetch wrapper behavior, token header injection, and HTTP error mapping.
- Create: `tests/component/login-page.test.tsx`
  - Login submission and session persistence against mocked fetch.
- Modify: `tests/component/inventory-approval.test.tsx`
  - Keep UI assertions, but stub API responses via `fetch` instead of relying on in-memory mock arrays.
- Modify: `tests/unit/mock-api.test.ts`
  - Remove auth and inventory expectations that are no longer true once those modules stop using dummy data.

### Task 1: Add Session Storage and HTTP Transport Foundations

**Files:**
- Modify: `src/features/auth/types.ts`
- Modify: `src/features/auth/sessionStore.ts`
- Modify: `src/vite-env.d.ts`
- Create: `tests/unit/auth-session.test.ts`
- Create: `src/shared/api/http.ts`
- Create: `tests/unit/http-api.test.ts`

- [ ] **Step 1: Write the failing session-store unit test**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, getAccessToken, getSession, setSession } from '../../src/features/auth/sessionStore';

describe('auth session store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearSession();
  });

  it('persists token and user in one session object', () => {
    setSession({
      token: 'jwt-token',
      user: {
        id: 'U-001',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@ecotrack.local',
      },
    });

    expect(getAccessToken()).toBe('jwt-token');
    expect(getSession()?.user.role).toBe('admin');
  });
});
```

- [ ] **Step 2: Run the session-store test to verify it fails against the old user-only storage shape**

Run: `npm test -- --run tests/unit/auth-session.test.ts`
Expected: FAIL because `setSession()` and `getSession()` currently store only an `AuthUser` and there is no `getAccessToken()` helper.

- [ ] **Step 3: Implement auth session types, token helpers, env typing, and the HTTP transport**

```ts
// src/features/auth/types.ts
export type UserRole = 'admin' | 'collector';
export type AppArea = 'dashboard' | 'collection' | 'segregation' | 'recycling' | 'inventory';

export type AuthUser = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type LoginResponse = AuthSession;
```

```ts
// src/features/auth/sessionStore.ts
import type { AppArea, AuthSession, UserRole } from './types';

const SESSION_KEY = 'ecotrack_session';

const collectorAreas: AppArea[] = ['collection', 'segregation', 'recycling', 'inventory'];

export function canAccess(role: UserRole, area: AppArea): boolean {
  if (role === 'admin') return true;
  return collectorAreas.includes(area);
}

export function setSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): AuthSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return getSession()?.token ?? null;
}

export function getCurrentRole(): UserRole | null {
  return getSession()?.user.role ?? null;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
```

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

```ts
// src/shared/api/http.ts
import { getAccessToken } from '../../features/auth/sessionStore';

export class ApiHttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiHttpError(response.status, message || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Write the failing transport test and make it pass**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestJson, ApiHttpError } from '../../src/shared/api/http';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

describe('requestJson', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('adds the bearer token from session storage', async () => {
    setSession({
      token: 'jwt-token',
      user: { id: 'U-001', name: 'Admin', role: 'admin', email: 'admin@ecotrack.local' },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await requestJson('/api/auth/me');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('throws ApiHttpError for failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    await expect(requestJson('/api/auth/me')).rejects.toEqual(expect.any(ApiHttpError));
  });
});
```

Run: `npm test -- --run tests/unit/http-api.test.ts`
Expected: PASS after the new HTTP helper is in place.

- [ ] **Step 5: Commit the transport foundation**

```bash
git add src/features/auth/types.ts src/features/auth/sessionStore.ts src/shared/api/http.ts src/vite-env.d.ts tests/unit/auth-session.test.ts tests/unit/http-api.test.ts
git commit -m "feat: add frontend auth session and http transport foundation"
```

### Task 2: Replace Mock Login with Real Auth Endpoints

**Files:**
- Create: `src/shared/api/authApi.ts`
- Create: `src/features/auth/useAuthBootstrap.ts`
- Modify: `src/features/auth/LoginPage.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/providers.tsx`
- Modify: `src/shared/api/client.ts`
- Create: `tests/component/login-page.test.tsx`

- [ ] **Step 1: Write the failing login component test**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../../src/features/auth/LoginPage';
import { clearSession, getSession } from '../../src/features/auth/sessionStore';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

describe('LoginPage', () => {
  beforeEach(() => {
    clearSession();
    navigateMock.mockReset();
    vi.restoreAllMocks();
  });

  it('stores token and redirects after successful login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'jwt-token',
          user: {
            id: 'U-001',
            name: 'Admin User',
            role: 'admin',
            email: 'admin@ecotrack.local',
          },
        }),
        { status: 200 }
      )
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@ecotrack.local' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(getSession()?.token).toBe('jwt-token'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });
});
```

- [ ] **Step 2: Run the login component test to verify it fails against the hardcoded credential flow**

Run: `npm test -- --run tests/component/login-page.test.tsx`
Expected: FAIL because `LoginPage` still reads `MOCK_USERS` and stores only the user object.

- [ ] **Step 3: Implement the auth API adapter, query bootstrap, and login mutation**

```ts
// src/shared/api/authApi.ts
import type { AuthUser, LoginCredentials, LoginResponse } from '../../features/auth/types';
import { requestJson } from './http';

export const authApi = {
  login(credentials: LoginCredentials) {
    return requestJson<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  me() {
    return requestJson<AuthUser>('/api/auth/me');
  },
};
```

```ts
// src/features/auth/useAuthBootstrap.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { clearSession, getAccessToken, getSession, setSession } from './sessionStore';

export function useAuthBootstrap() {
  const token = getAccessToken();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await api.auth.me();
      setSession({ token: token!, user });
      return user;
    },
    enabled: Boolean(token),
    retry: false,
    initialData: getSession()?.user,
    throwOnError: false,
    meta: { clearSessionOnUnauthorized: true },
  });
}
```

```ts
// src/shared/api/client.ts
import { authApi } from './authApi';

export const api = {
  auth: authApi,
};
```

```tsx
// src/features/auth/LoginPage.tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { mapApiError } from '../../shared/errors/mapApiError';
import { setSession } from './sessionStore';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const login = useMutation({
    mutationFn: () => api.auth.login({ email, password }),
    onSuccess: (session) => {
      setSession(session);
      navigate(session.user.role === 'admin' ? '/dashboard' : '/collection');
    },
    onError: (err: unknown) => {
      const mapped = mapApiError(err);
      setError(mapped.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    login.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* existing fields stay as-is */}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={login.isPending} className="w-full rounded bg-brand-600 py-2 font-semibold text-white">
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

```tsx
// src/app/routes.tsx
import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../features/auth/sessionStore';
import { useAuthBootstrap } from '../features/auth/useAuthBootstrap';

function ProtectedLayout() {
  const session = getSession();
  const navigate = useNavigate();
  const authBootstrap = useAuthBootstrap();

  useEffect(() => {
    if (authBootstrap.error) {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [authBootstrap.error, navigate]);

  if (!session) return <Navigate to="/login" replace />;
  if (authBootstrap.isLoading) return <div className="p-6 text-slate-400">Validating session…</div>;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
```

- [ ] **Step 4: Make the provider safe for authenticated queries and rerun the auth test**

```tsx
// src/app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clearSession } from '../features/auth/sessionStore';
import { ApiHttpError } from '../shared/api/http';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
      onError: (error) => {
        if (error instanceof ApiHttpError && error.statusCode === 401) {
          clearSession();
        }
      },
    },
  },
});
```

Run: `npm test -- --run tests/component/login-page.test.tsx`
Expected: PASS with successful login now persisting `{ token, user }` and redirecting correctly.

- [ ] **Step 5: Commit the auth integration slice**

```bash
git add src/shared/api/authApi.ts src/shared/api/client.ts src/features/auth/useAuthBootstrap.ts src/features/auth/LoginPage.tsx src/app/routes.tsx src/app/providers.tsx tests/component/login-page.test.tsx
git commit -m "feat: bind frontend login flow to real auth api"
```

### Task 3: Move Inventory Reads and Writes to the Backend Adapter

**Files:**
- Create: `src/shared/api/inventoryApi.ts`
- Create: `src/shared/api/legacyMockModules.ts`
- Modify: `src/shared/api/client.ts`
- Modify: `src/shared/errors/mapApiError.ts`
- Create: `tests/unit/inventory-api.test.ts`
- Modify: `tests/unit/mock-api.test.ts`

- [ ] **Step 1: Write the failing inventory adapter unit test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../src/shared/api/client';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

describe('inventory api adapter', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'jwt-token',
      user: { id: 'U-001', name: 'Admin User', role: 'admin', email: 'admin@ecotrack.local' },
    });
    vi.restoreAllMocks();
  });

  it('uses PATCH price endpoint and maps inventory DTO casing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'INV-001',
          name: 'Compost',
          category: 'recycledProduct',
          quantityKg: 35,
          unit: 'kg',
          standardPriceInr: 77,
        }),
        { status: 200 }
      )
    );

    const item = await api.inventory.updateItemPrice('INV-001', 77);

    expect(item.standardPriceINR).toBe(77);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/inventory/items/INV-001/price'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
```

- [ ] **Step 2: Run the new inventory adapter test and the existing mock-api test to confirm the old mixed client is the wrong shape**

Run: `npm test -- --run tests/unit/inventory-api.test.ts tests/unit/mock-api.test.ts`
Expected: FAIL because `api.inventory.updateItemPrice()` still expects actor metadata and `client.ts` is still backed by in-memory arrays.

- [ ] **Step 3: Implement DTO mappers, the real inventory adapter, and split non-target modules into a legacy mock file**

```ts
// src/shared/api/inventoryApi.ts
import type { InventoryItem, SaleApprovalStatus, SaleRecord } from './contracts';
import { requestJson } from './http';

type InventoryItemDto = {
  id: string;
  name: string;
  category: 'rawWaste' | 'recycledProduct';
  quantityKg: number;
  unit: 'kg' | 'units';
  standardPriceInr: number;
};

type SaleRecordDto = {
  id: string;
  inventoryItemId: string;
  quantitySold: number;
  revenueInr: number;
  soldAtUtc: string;
  approvalStatus: 'draft' | 'pendingApproval' | 'approved' | 'rejected';
  requestedByUserId: string;
  approvedByUserId?: string;
  approvedAtUtc?: string;
  rejectionReason?: string;
};

function toInventoryItem(dto: InventoryItemDto): InventoryItem {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category === 'rawWaste' ? 'raw-waste' : 'recycled-product',
    quantityKg: dto.quantityKg,
    unit: dto.unit,
    standardPriceINR: dto.standardPriceInr,
  };
}

function toSaleRecord(dto: SaleRecordDto): SaleRecord {
  const statusMap: Record<SaleRecordDto['approvalStatus'], SaleApprovalStatus> = {
    draft: 'draft',
    pendingApproval: 'pending_approval',
    approved: 'approved',
    rejected: 'rejected',
  };

  return {
    id: dto.id,
    inventoryItemId: dto.inventoryItemId,
    quantitySold: dto.quantitySold,
    revenueINR: dto.revenueInr,
    soldAt: dto.soldAtUtc,
    approvalStatus: statusMap[dto.approvalStatus],
    requestedByUserId: dto.requestedByUserId,
    approvedByUserId: dto.approvedByUserId,
    approvedAt: dto.approvedAtUtc,
    rejectionReason: dto.rejectionReason,
  };
}

export const inventoryApi = {
  async getItems() {
    return (await requestJson<InventoryItemDto[]>('/api/inventory/items')).map(toInventoryItem);
  },
  async getSales() {
    return (await requestJson<SaleRecordDto[]>('/api/inventory/sales')).map(toSaleRecord);
  },
  async getSalesByStatus(status: SaleApprovalStatus) {
    const path = status === 'pending_approval' ? '/api/inventory/sales/pending' : '/api/inventory/sales';
    return (await requestJson<SaleRecordDto[]>(path)).map(toSaleRecord).filter((sale) => sale.approvalStatus === status);
  },
  async updateItem(id: string, payload: Partial<Omit<InventoryItem, 'id' | 'standardPriceINR'>>) {
    const dto = await requestJson<InventoryItemDto>(`/api/inventory/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.name,
        category: payload.category === 'raw-waste' ? 'rawWaste' : 'recycledProduct',
        quantityKg: payload.quantityKg,
        unit: payload.unit,
      }),
    });

    return toInventoryItem(dto);
  },
  async updateItemPrice(id: string, standardPriceINR: number) {
    const dto = await requestJson<InventoryItemDto>(`/api/inventory/items/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ standardPriceInr: standardPriceINR }),
    });

    return toInventoryItem(dto);
  },
  async deleteItem(id: string) {
    await requestJson<void>(`/api/inventory/items/${id}`, { method: 'DELETE' });
    return { id };
  },
  async createSaleDraft(input: { inventoryItemId: string; quantitySold: number; soldAt: string }) {
    const dto = await requestJson<SaleRecordDto>('/api/inventory/sales', {
      method: 'POST',
      body: JSON.stringify({
        inventoryItemId: input.inventoryItemId,
        quantitySold: input.quantitySold,
        soldAtUtc: input.soldAt,
      }),
    });

    return toSaleRecord(dto);
  },
  async updateSale(id: string, payload: Partial<Omit<SaleRecord, 'id' | 'approvalStatus' | 'requestedByUserId' | 'approvedByUserId' | 'approvedAt' | 'rejectionReason'>>) {
    const dto = await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        inventoryItemId: payload.inventoryItemId,
        quantitySold: payload.quantitySold,
        soldAtUtc: payload.soldAt,
      }),
    });

    return toSaleRecord(dto);
  },
  async deleteSale(id: string) {
    await requestJson<void>(`/api/inventory/sales/${id}`, { method: 'DELETE' });
    return { id };
  },
  async submitSaleForApproval(id: string) {
    return toSaleRecord(await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}/submit`, { method: 'POST' }));
  },
  async approveSale(id: string) {
    return toSaleRecord(await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}/approve`, { method: 'POST' }));
  },
};
```

```ts
// src/shared/api/legacyMockModules.ts
import type {
  DashboardSummary,
  PickupStatus,
  PickupTask,
  ProductConversion,
  RecyclingBatch,
  RecyclingStage,
  SegregationBatch,
  SegregationDispatch,
  WasteCategory,
} from './contracts';
import {
  dashboardSummary,
  pickupTasks,
  productConversions,
  recyclingBatches,
  segregationBatches,
  segregationDispatches,
} from './mockData';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const totalWeight = (weights: Record<WasteCategory, number>) =>
  Object.values(weights).reduce((sum, value) => sum + value, 0);

export const collectionApi = {
  async getSchedule(): Promise<PickupTask[]> {
    await delay();
    return [...pickupTasks];
  },
  async updateStatus(id: string, status: PickupStatus): Promise<PickupTask> {
    await delay();
    const task = pickupTasks.find((entry) => entry.id === id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.status = status;
    if (status === 'collected') task.lockedAfterCollection = true;
    return { ...task };
  },
  async getDispatches(): Promise<SegregationDispatch[]> {
    await delay();
    return [...segregationDispatches];
  },
};

export const segregationApi = {
  async getBatches(): Promise<SegregationBatch[]> {
    await delay();
    return [...segregationBatches];
  },
  async createBatch(dispatchId: string, weights: Record<WasteCategory, number>): Promise<SegregationBatch> {
    await delay();
    const dispatch = segregationDispatches.find((entry) => entry.id === dispatchId);
    if (!dispatch) throw new Error(`Dispatch ${dispatchId} not found`);

    const sum = totalWeight(weights);
    if (sum <= 0 || sum > dispatch.pendingSegregationWeightKg) {
      throw new Error(`Segregation total must be <= pending weight (${dispatch.pendingSegregationWeightKg} kg)`);
    }

    dispatch.segregatedWeightKg += sum;
    dispatch.pendingSegregationWeightKg -= sum;
    dispatch.status = dispatch.pendingSegregationWeightKg === 0 ? 'complete' : 'partial';

    const batch: SegregationBatch = {
      id: `SB-${Date.now()}`,
      pickupTaskId: dispatch.pickupTaskId,
      dispatchId,
      weights,
      inputWeightKg: sum,
      status: 'complete',
      createdAt: new Date().toISOString(),
    };

    segregationBatches.unshift(batch);
    return { ...batch };
  },
};

export const recyclingApi = {
  async getBatches(): Promise<RecyclingBatch[]> {
    await delay();
    return [...recyclingBatches];
  },
  async advanceStage(id: string, stage: RecyclingStage): Promise<RecyclingBatch> {
    await delay();
    const batch = recyclingBatches.find((entry) => entry.id === id);
    if (!batch) throw new Error(`Recycling batch ${id} not found`);
    batch.stage = stage;
    batch.stageHistory.push({ stage, at: new Date().toISOString() });
    return { ...batch };
  },
  async createProductConversion(input: {
    recyclingBatchId: string;
    productName: string;
    quantity: number;
    unit: 'kg' | 'units';
  }): Promise<ProductConversion> {
    await delay();
    const batch = recyclingBatches.find((entry) => entry.id === input.recyclingBatchId);
    if (!batch) throw new Error(`Recycling batch ${input.recyclingBatchId} not found`);
    if (batch.stage !== 'converted') throw new Error('Products can be created only after recycling is converted');

    const conversion: ProductConversion = {
      id: `PC-${Date.now()}`,
      recyclingBatchId: input.recyclingBatchId,
      productName: input.productName.trim(),
      quantity: input.quantity,
      unit: input.unit,
      createdAt: new Date().toISOString(),
    };

    productConversions.unshift(conversion);
    return { ...conversion };
  },
};

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    await delay();
    return { ...dashboardSummary };
  },
};
```

```ts
// src/shared/api/client.ts
import { authApi } from './authApi';
import { inventoryApi } from './inventoryApi';
import { collectionApi, dashboardApi, recyclingApi, segregationApi } from './legacyMockModules';

export const api = {
  auth: authApi,
  inventory: inventoryApi,
  collection: collectionApi,
  segregation: segregationApi,
  recycling: recyclingApi,
  dashboard: dashboardApi,
};
```

```ts
// src/shared/errors/mapApiError.ts
import { ApiHttpError } from '../api/http';

export type MappedError = {
  title: string;
  message: string;
  retryable: boolean;
};

export function mapApiError(error: unknown): MappedError {
  const statusCode = error instanceof ApiHttpError ? error.statusCode : 0;
  if (statusCode === 401) return { title: 'Access denied', message: 'Your session has expired. Please log in again.', retryable: false };
  if (statusCode === 403) return { title: 'Access denied', message: 'You do not have permission to perform this action.', retryable: false };
  if (statusCode === 404) return { title: 'Record not found', message: 'The requested record could not be found.', retryable: false };
  if (statusCode === 409) return { title: 'Conflict detected', message: 'This record was modified by another user. Please refresh and try again.', retryable: true };
  if (statusCode >= 500) return { title: 'Unexpected server error', message: 'Something went wrong on the server. Please try again.', retryable: true };
  return { title: 'Request failed', message: 'An unexpected error occurred.', retryable: true };
}
```

- [ ] **Step 4: Update the old mock-only unit test so it covers only modules that still use dummy data, then rerun both unit suites**

```ts
// tests/unit/mock-api.test.ts
import { describe, expect, it } from 'vitest';
import { api } from '../../src/shared/api/client';

describe('legacy mock api modules', () => {
  it('returns pickup schedule list', async () => {
    const result = await api.collection.getSchedule();
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns segregation batches', async () => {
    const result = await api.segregation.getBatches();
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns dashboard summary with co2 reduction', async () => {
    const result = await api.dashboard.getSummary();
    expect(result.co2ReductionKg).toBeGreaterThan(0);
  });
});
```

Run: `npm test -- --run tests/unit/inventory-api.test.ts tests/unit/mock-api.test.ts`
Expected: PASS with `auth` and `inventory` now using the real transport layer while remaining modules still use legacy mocks.

- [ ] **Step 5: Commit the real inventory adapter split**

```bash
git add src/shared/api/inventoryApi.ts src/shared/api/legacyMockModules.ts src/shared/api/client.ts src/shared/errors/mapApiError.ts tests/unit/inventory-api.test.ts tests/unit/mock-api.test.ts
git commit -m "feat: bind inventory frontend adapter to real backend api"
```

### Task 4: Update Inventory and Dashboard Screens for JWT-Derived Actor Identity

**Files:**
- Modify: `src/features/inventory/InventoryPage.tsx`
- Modify: `src/features/inventory/useInventoryApproval.ts`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `tests/component/inventory-approval.test.tsx`

- [ ] **Step 1: Write the failing inventory page component test using fetch-backed API responses**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from '../../src/app/providers';
import { InventoryPage } from '../../src/features/inventory/InventoryPage';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

function renderInventory() {
  return render(
    <Providers>
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    </Providers>
  );
}

describe('inventory approval workflow', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('shows collector sales draft controls from backend data and hides price update action', async () => {
    setSession({
      token: 'collector-token',
      user: {
        id: 'U-002',
        name: 'Field Collector',
        role: 'collector',
        email: 'collector@ecotrack.local',
      },
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/inventory/items')) {
        return new Response(JSON.stringify([
          { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 40, unit: 'kg', standardPriceInr: 60 },
        ]), { status: 200 });
      }
      if (url.endsWith('/api/inventory/sales')) {
        return new Response(JSON.stringify([
          { id: 'SALE-002', inventoryItemId: 'INV-001', quantitySold: 2, revenueInr: 120, soldAtUtc: '2026-05-20T00:00:00Z', approvalStatus: 'pendingApproval', requestedByUserId: 'U-002' },
        ]), { status: 200 });
      }
      return new Response(JSON.stringify({ id: 'U-002', name: 'Field Collector', role: 'collector', email: 'collector@ecotrack.local' }), { status: 200 });
    });

    renderInventory();

    expect(await screen.findByRole('button', { name: /create sale draft/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update price/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the inventory approval component test to confirm the old mutation signatures are incompatible**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx`
Expected: FAIL because `InventoryPage`, `useInventoryApproval`, and `DashboardPage` still pass actor objects into the mock inventory API methods.

- [ ] **Step 3: Remove actor arguments from UI code and use backend-derived identity**

```tsx
// src/features/inventory/InventoryPage.tsx
const user = useMemo(() => getSession()?.user ?? null, []);
const isAdmin = user?.role === 'admin';

const { mutate: updateItemPrice, isPending: updatingPrice } = useMutation({
  mutationFn: ({ id, standardPriceINR }: { id: string; standardPriceINR: number }) =>
    api.inventory.updateItemPrice(id, standardPriceINR),
  onSuccess: invalidateInventory,
});

const { mutate: updateSale, isPending: updatingSale } = useMutation({
  mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<SaleRecord, 'id'>> }) =>
    api.inventory.updateSale(id, payload),
  onSuccess: invalidateInventory,
});

const { mutate: deleteSale } = useMutation({
  mutationFn: (id: string) => api.inventory.deleteSale(id),
  onSuccess: invalidateInventory,
});

const { mutate: createSaleDraft, isPending: creatingSaleDraft } = useMutation({
  mutationFn: (input: { inventoryItemId: string; quantitySold: number; soldAt: string }) =>
    api.inventory.createSaleDraft(input),
  onSuccess: invalidateInventory,
});

const { mutate: submitSaleForApproval, isPending: submittingSale } = useMutation({
  mutationFn: ({ id }: { id: string }) => api.inventory.submitSaleForApproval(id),
  onSuccess: invalidateInventory,
});

function handleCreateSaleDraft() {
  createSaleDraft(createSaleForm);
}
```

```ts
// src/features/inventory/useInventoryApproval.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export function usePendingSalesForApproval() {
  return useQuery({
    queryKey: ['inventory', 'sales', 'pending'],
    queryFn: () => api.inventory.getSalesByStatus('pending_approval'),
  });
}

export function useApproveSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.inventory.approveSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sales', 'pending'] });
    },
  });
}
```

```tsx
// src/features/dashboard/DashboardPage.tsx
const user = getSession()?.user ?? null;

<button
  type="button"
  disabled={approvingSale || !user}
  onClick={() => approveSale({ id: sale.id })}
  className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
>
  Approve Sale
</button>
```

- [ ] **Step 4: Rerun the component test and a focused auth guard test**

Run: `npm test -- --run tests/component/inventory-approval.test.tsx tests/component/auth-guard.test.tsx`
Expected: PASS with the inventory screen using backend-style APIs and route access still driven by the stored user role.

- [ ] **Step 5: Commit the UI integration**

```bash
git add src/features/inventory/InventoryPage.tsx src/features/inventory/useInventoryApproval.ts src/features/dashboard/DashboardPage.tsx tests/component/inventory-approval.test.tsx
git commit -m "feat: switch inventory ui to jwt-backed api signatures"
```

### Task 5: Finalize Local Dev Wiring, Documentation, and Verification

**Files:**
- Modify: `README.md`
- Create: `.env.example`
- Modify: `src/shared/api/client.ts`
- Modify: `tests/unit/inventory-api.test.ts`

- [ ] **Step 1: Add the failing smoke assertion that auth and inventory modules exist on the composed API client**

```ts
import { describe, expect, it } from 'vitest';
import { api } from '../../src/shared/api/client';

describe('api client composition', () => {
  it('exposes real auth and inventory modules', () => {
    expect(api.auth.login).toBeTypeOf('function');
    expect(api.inventory.getItems).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run the targeted unit and component suites plus a production build**

Run: `npm test -- --run tests/unit/auth-session.test.ts tests/unit/http-api.test.ts tests/unit/inventory-api.test.ts tests/component/login-page.test.tsx tests/component/inventory-approval.test.tsx tests/component/auth-guard.test.tsx`
Expected: PASS.

Run: `npm run build`
Expected: PASS with the frontend compiling against the new auth session shape and real API adapters.

- [ ] **Step 3: Document the local integration setup and environment variables**

```env
# .env.example
VITE_API_BASE_URL=http://localhost:5000
```

```md
<!-- README.md -->
## Frontend to Backend Integration

1. Start the backend from the sibling `EcoTrack-Backend` repository.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_API_BASE_URL` to the backend URL, for example `http://localhost:5000`.
4. Start the frontend with `npm run dev`.

Auth and inventory now use the real backend API. Collection, segregation, recycling, and dashboard summary still use the legacy mock adapter until their migration plans are implemented.
```

```ts
// src/shared/api/client.ts
// Keep the composed API object flat and explicit. Do not re-export transport internals from this file.
```

- [ ] **Step 4: Run one end-to-end manual verification flow against the real backend**

Run: `npm run dev`
Expected: Frontend loads with the backend running.

Manual verification:
- Log in as `admin@ecotrack.local` / `admin123` and confirm the app lands on `/dashboard`.
- Open `/inventory` and confirm seeded backend items render.
- Update a standard price and refresh the page to confirm the new value persists.
- Log in as `collector@ecotrack.local` / `collector123`, create a sale draft, submit it, then log back in as admin and approve it from the dashboard queue.

- [ ] **Step 5: Commit the integration handoff**

```bash
git add .env.example README.md src/shared/api/client.ts
git commit -m "chore: document frontend auth and inventory api integration"
```

## Self-Review

Spec coverage:
- Real auth integration is covered by Task 2.
- Inventory item and sales adapter migration is covered by Tasks 3 and 4.
- Removal of auth and inventory dummy-data dependence is covered by Tasks 3 through 5.
- Local developer setup and verification are covered by Task 5.

Placeholder scan:
- No `TBD`, `TODO`, or implicit “handle this later” placeholders remain in the tasks.
- Each task includes concrete file paths, commands, and code snippets for the step being performed.

Type consistency:
- Frontend UI-facing models remain `AuthUser`, `AuthSession`, `InventoryItem`, and `SaleRecord`.
- Backend DTO casing differences (`standardPriceInr`, `soldAtUtc`, `pendingApproval`) are normalized only inside adapter mapping code.
- UI code no longer passes actor identifiers for auth-protected inventory actions because the backend derives identity from JWT.