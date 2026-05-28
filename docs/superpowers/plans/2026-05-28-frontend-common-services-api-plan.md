# Frontend Common Services API Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shared frontend services layer that calls the real backend auth, inventory, sales, and health endpoints and removes dummy-data usage for the parts of the UI those endpoints already support.

**Architecture:** Introduce a `src/shared/services` folder as the single place that knows backend URLs, request bodies, tokens, and DTO mapping. Keep the existing UI-facing contracts stable, use a small compatibility facade in `src/shared/api/client.ts`, and explicitly trim or defer frontend behaviors that depend on backend routes that do not exist yet.

**Tech Stack:** React, TypeScript, Vite, TanStack Query, React Router, Vitest, React Testing Library, .NET 8 Web API, PostgreSQL, JWT bearer auth.

---

## Current Backend Endpoint Contract

Auth endpoints:
- `POST /api/auth/login`
- `GET /api/auth/me`

Inventory item endpoints:
- `GET /api/inventory/items`
- `POST /api/inventory/items`
- `PATCH /api/inventory/items/{id}/price`

Sales endpoints:
- `POST /api/inventory/sales`
- `PUT /api/inventory/sales/{id}`
- `POST /api/inventory/sales/{id}/submit`
- `POST /api/inventory/sales/{id}/approve`

Health endpoint:
- `GET /health`

Known backend gaps that the frontend must not paper over with dummy data:
- No `GET /api/inventory/sales`
- No `POST /api/inventory/sales/{id}/reject`
- No `PUT /api/inventory/items/{id}`
- No `GET /api/inventory/sales/pending`

## Scope and Constraints

- This plan creates a common frontend services folder and migrates supported flows onto it.
- It does not add backend endpoints.
- It removes dummy-data usage from `auth`, `inventory items`, and the supported `sales create/update/submit` flow.
- It does not fake unsupported backend reads with local arrays or seed data.
- Where the backend is missing a route, the frontend must either hide the action or show a clear unavailable-state message.
- `collection`, `segregation`, `recycling`, and `dashboard summary` remain on the legacy mock path in this plan.

## File Structure and Responsibilities

New shared services layer:
- Create: `src/shared/services/http.ts`
  - Shared fetch helper, token injection, JSON parsing, and HTTP error type.
- Create: `src/shared/services/authService.ts`
  - `login()` and `me()` wrappers.
- Create: `src/shared/services/inventoryService.ts`
  - `getItems()`, `createItem()`, and `updatePrice()` wrappers.
- Create: `src/shared/services/salesService.ts`
  - `createDraft()`, `updateDraft()`, `submitDraft()`, and `approveSale()` wrappers.
- Create: `src/shared/services/healthService.ts`
  - `getHealth()` wrapper.
- Create: `src/shared/services/index.ts`
  - Aggregated exports for the service layer.

Compatibility and legacy composition:
- Create: `src/shared/api/legacyClient.ts`
  - Move the current mock `collection`, `segregation`, `recycling`, and `dashboard` modules here.
- Modify: `src/shared/api/client.ts`
  - Recompose `api` from the new services layer plus the legacy mock client.

Auth and app integration:
- Modify: `src/features/auth/types.ts`
  - Add `AuthSession` and typed login response.
- Modify: `src/features/auth/sessionStore.ts`
  - Store `{ token, user }` instead of only `user`.
- Modify: `src/features/auth/LoginPage.tsx`
  - Replace hardcoded credentials with `authService.login()`.
- Create: `src/features/auth/useAuthBootstrap.ts`
  - Validate stored JWT via `authService.me()`.
- Modify: `src/app/routes.tsx`
  - Boot protected routes from the new session shape.
- Modify: `src/app/providers.tsx`
  - Clear session on `401` errors.

Inventory and sales UI integration:
- Modify: `src/features/inventory/InventoryPage.tsx`
  - Use real item endpoints and reshape the sales UI to only support available backend flows.
- Modify: `src/features/inventory/useInventoryApproval.ts`
  - Remove pending-sales query because the backend has no pending list route.
- Modify: `src/features/dashboard/DashboardPage.tsx`
  - Replace the pending-approval queue with an explicit backend-gap state.
- Modify: `src/shared/ui/ConnectivityBadge.tsx`
  - Combine browser online status with `/health` checks.

Error handling and config:
- Modify: `src/shared/errors/mapApiError.ts`
  - Accept service-layer transport errors.
- Modify: `src/vite-env.d.ts`
  - Add `VITE_API_BASE_URL` typing.
- Create: `.env.example`
  - Document local API base URL.
- Modify: `README.md`
  - Add local frontend/backend integration steps.

Tests:
- Create: `tests/unit/http-service.test.ts`
- Create: `tests/unit/auth-session.test.ts`
- Create: `tests/unit/inventory-service.test.ts`
- Create: `tests/unit/sales-service.test.ts`
- Create: `tests/unit/health-service.test.ts`
- Create: `tests/component/login-page.test.tsx`
- Modify: `tests/component/inventory-approval.test.tsx`
- Modify: `tests/unit/mock-api.test.ts`

### Task 1: Build the Common Services Folder and HTTP Foundation

**Files:**
- Create: `src/shared/services/http.ts`
- Create: `src/shared/services/index.ts`
- Modify: `src/vite-env.d.ts`
- Create: `tests/unit/http-service.test.ts`

- [ ] **Step 1: Write the failing HTTP service test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestJson, ServiceHttpError } from '../../src/shared/services/http';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

describe('requestJson', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('adds bearer token and base url to outgoing requests', async () => {
    setSession({
      token: 'jwt-token',
      user: {
        id: 'U-001',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@ecotrack.local',
      },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await requestJson('/api/auth/me');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({ headers: expect.any(Headers) })
    );

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('throws ServiceHttpError when the response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    await expect(requestJson('/api/auth/me')).rejects.toBeInstanceOf(ServiceHttpError);
  });
});
```

- [ ] **Step 2: Run the HTTP test to verify the services layer does not exist yet**

Run: `npm test -- --run tests/unit/http-service.test.ts`
Expected: FAIL because `src/shared/services/http.ts` has not been created.

- [ ] **Step 3: Implement the transport layer and service exports**

```ts
// src/shared/services/http.ts
import { getAccessToken } from '../../features/auth/sessionStore';

export class ServiceHttpError extends Error {
  constructor(public statusCode: number, public bodyText: string) {
    super(bodyText || 'Request failed');
    this.name = 'ServiceHttpError';
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
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new ServiceHttpError(response.status, bodyText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

```ts
// src/shared/services/index.ts
export * from './http';
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

- [ ] **Step 4: Run the HTTP service test again**

Run: `npm test -- --run tests/unit/http-service.test.ts`
Expected: PASS with token injection and error mapping verified.

- [ ] **Step 5: Commit the services foundation**

```bash
git add src/shared/services/http.ts src/shared/services/index.ts src/vite-env.d.ts tests/unit/http-service.test.ts
git commit -m "feat: add frontend common services transport layer"
```

### Task 2: Bind Real Auth Endpoints Through the Services Folder

**Files:**
- Create: `src/shared/services/authService.ts`
- Modify: `src/shared/services/index.ts`
- Modify: `src/features/auth/types.ts`
- Modify: `src/features/auth/sessionStore.ts`
- Modify: `src/features/auth/LoginPage.tsx`
- Create: `src/features/auth/useAuthBootstrap.ts`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/providers.tsx`
- Create: `tests/unit/auth-session.test.ts`
- Create: `tests/component/login-page.test.tsx`

- [ ] **Step 1: Write the failing auth session test**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, getAccessToken, getSession, setSession } from '../../src/features/auth/sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearSession();
  });

  it('stores token and user together', () => {
    setSession({
      token: 'jwt-token',
      user: {
        id: 'U-002',
        name: 'Collector',
        role: 'collector',
        email: 'collector@ecotrack.local',
      },
    });

    expect(getAccessToken()).toBe('jwt-token');
    expect(getSession()?.user.email).toBe('collector@ecotrack.local');
  });
});
```

- [ ] **Step 2: Run the auth session test to confirm the old store shape fails**

Run: `npm test -- --run tests/unit/auth-session.test.ts`
Expected: FAIL because the current session store persists only a user object.

- [ ] **Step 3: Implement auth service, session shape, bootstrap, and login page integration**

```ts
// src/shared/services/authService.ts
import type { AuthSession, AuthUser, LoginCredentials } from '../../features/auth/types';
import { requestJson } from './http';

export const authService = {
  login(credentials: LoginCredentials) {
    return requestJson<AuthSession>('/api/auth/login', {
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
// src/features/auth/useAuthBootstrap.ts
import { useQuery } from '@tanstack/react-query';
import { authService } from '../../shared/services';
import { getAccessToken, getSession, setSession } from './sessionStore';

export function useAuthBootstrap() {
  const token = getAccessToken();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authService.me();
      setSession({ token: token!, user });
      return user;
    },
    enabled: Boolean(token),
    retry: false,
    initialData: getSession()?.user,
  });
}
```

```tsx
// src/features/auth/LoginPage.tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../shared/services';
import { mapApiError } from '../../shared/errors/mapApiError';
import { setSession } from './sessionStore';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => authService.login({ email, password }),
    onSuccess: (session) => {
      setSession(session);
      navigate(session.user.role === 'admin' ? '/dashboard' : '/collection');
    },
    onError: (error: unknown) => {
      setError(mapApiError(error).message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-brand-500">EcoTrack</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-400">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-slate-400">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loginMutation.isPending} className="w-full rounded bg-brand-600 py-2 font-semibold text-white">
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

```tsx
// src/app/routes.tsx
function RequireAuth({ children }: { children: JSX.Element }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function ProtectedLayout() {
  const session = getSession();
  const authBootstrap = useAuthBootstrap();

  if (!session) return <Navigate to="/login" replace />;
  if (authBootstrap.isLoading) return <div className="p-6 text-slate-400">Validating session...</div>;
  if (authBootstrap.isError) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
```

```tsx
// src/app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clearSession } from '../features/auth/sessionStore';
import { ServiceHttpError } from '../shared/services';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000 },
    mutations: {
      retry: false,
      onError: (error) => {
        if (error instanceof ServiceHttpError && error.statusCode === 401) {
          clearSession();
        }
      },
    },
  },
});
```

- [ ] **Step 4: Write the failing login page component test and make it pass**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '../../src/app/providers';
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
      new Response(JSON.stringify({
        token: 'jwt-token',
        user: { id: 'U-001', name: 'Admin User', role: 'admin', email: 'admin@ecotrack.local' },
      }), { status: 200 })
    );

    render(
      <Providers>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Providers>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@ecotrack.local' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(getSession()?.token).toBe('jwt-token'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });
});
```

Run: `npm test -- --run tests/unit/auth-session.test.ts tests/component/login-page.test.tsx`
Expected: PASS with login now fully routed through the real auth service.

- [ ] **Step 5: Commit the auth integration**

```bash
git add src/shared/services/authService.ts src/shared/services/index.ts src/features/auth/types.ts src/features/auth/sessionStore.ts src/features/auth/LoginPage.tsx src/features/auth/useAuthBootstrap.ts src/app/routes.tsx src/app/providers.tsx tests/unit/auth-session.test.ts tests/component/login-page.test.tsx
git commit -m "feat: bind frontend auth to shared services layer"
```

### Task 3: Bind Inventory Items and Health to Real Endpoints

**Files:**
- Create: `src/shared/services/inventoryService.ts`
- Create: `src/shared/services/healthService.ts`
- Modify: `src/shared/services/index.ts`
- Modify: `src/shared/ui/ConnectivityBadge.tsx`
- Modify: `src/features/inventory/InventoryPage.tsx`
- Create: `tests/unit/inventory-service.test.ts`
- Create: `tests/unit/health-service.test.ts`

- [ ] **Step 1: Write the failing inventory service unit test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inventoryService } from '../../src/shared/services';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

describe('inventoryService', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'jwt-token',
      user: { id: 'U-001', name: 'Admin User', role: 'admin', email: 'admin@ecotrack.local' },
    });
    vi.restoreAllMocks();
  });

  it('maps backend item dto to frontend inventory item shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([
        { id: 'INV-001', name: 'Compost', category: 'recycledProduct', quantityKg: 30, unit: 'kg', standardPriceInr: 75 },
      ]), { status: 200 })
    );

    const items = await inventoryService.getItems();

    expect(items[0].category).toBe('recycled-product');
    expect(items[0].standardPriceINR).toBe(75);
  });
});
```

- [ ] **Step 2: Run the inventory service test to confirm there is no real item service yet**

Run: `npm test -- --run tests/unit/inventory-service.test.ts`
Expected: FAIL because `src/shared/services/inventoryService.ts` has not been created.

- [ ] **Step 3: Implement inventory and health services, then trim unsupported item edit/delete UI**

```ts
// src/shared/services/inventoryService.ts
import type { InventoryItem } from '../api/contracts';
import { requestJson } from './http';

type InventoryItemDto = {
  id: string;
  name: string;
  category: 'rawWaste' | 'recycledProduct';
  quantityKg: number;
  unit: 'kg' | 'units';
  standardPriceInr: number;
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

export const inventoryService = {
  async getItems() {
    return (await requestJson<InventoryItemDto[]>('/api/inventory/items')).map(toInventoryItem);
  },
  async createItem(input: {
    name: string;
    category: 'raw-waste' | 'recycled-product';
    quantityKg: number;
    unit: 'kg' | 'units';
    standardPriceINR: number;
  }) {
    const dto = await requestJson<InventoryItemDto>('/api/inventory/items', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        category: input.category === 'raw-waste' ? 'rawWaste' : 'recycledProduct',
        quantityKg: input.quantityKg,
        unit: input.unit,
        standardPriceInr: input.standardPriceINR,
      }),
    });

    return toInventoryItem(dto);
  },
  async updatePrice(id: string, standardPriceINR: number) {
    const dto = await requestJson<InventoryItemDto>(`/api/inventory/items/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ standardPriceInr: standardPriceINR }),
    });

    return toInventoryItem(dto);
  },
};
```

```ts
// src/shared/services/healthService.ts
import { requestJson } from './http';

export const healthService = {
  async getHealth() {
    return requestJson<{ status: string }>('/health');
  },
};
```

```tsx
// src/shared/ui/ConnectivityBadge.tsx
import { useEffect, useState } from 'react';
import { healthService } from '../services';

export function ConnectivityBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  const [backendHealthy, setBackendHealthy] = useState(true);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const interval = window.setInterval(async () => {
      try {
        const health = await healthService.getHealth();
        setBackendHealthy(health.status === 'healthy');
      } catch {
        setBackendHealthy(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(interval);
    };
  }, []);

  if (online && backendHealthy) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-red-700 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-red-300" />
      Backend unavailable — changes may not save
    </div>
  );
}
```

```tsx
// src/features/inventory/InventoryPage.tsx
const { data: items, isLoading: loadingItems } = useQuery({
  queryKey: ['inventory', 'items'],
  queryFn: () => inventoryService.getItems(),
});

const { mutate: updateItemPrice, isPending: updatingPrice } = useMutation({
  mutationFn: ({ id, standardPriceINR }: { id: string; standardPriceINR: number }) =>
    inventoryService.updatePrice(id, standardPriceINR),
  onSuccess: invalidateInventory,
});

// Replace admin edit/delete actions because the backend does not expose PUT /api/inventory/items/{id} or DELETE /api/inventory/items/{id}.
{isAdmin ? (
  <span className="text-xs text-slate-500">Price update only</span>
) : (
  <span className="text-xs text-slate-500">View only</span>
)}
```

- [ ] **Step 4: Write the health and inventory tests, then rerun them**

```ts
import { describe, expect, it, vi } from 'vitest';
import { healthService } from '../../src/shared/services';

describe('healthService', () => {
  it('calls the backend health endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
    );

    const result = await healthService.getHealth();

    expect(result.status).toBe('healthy');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.any(Object));
  });
});
```

Run: `npm test -- --run tests/unit/inventory-service.test.ts tests/unit/health-service.test.ts`
Expected: PASS with real item mapping and health-check integration in place.

- [ ] **Step 5: Commit the item and health integration**

```bash
git add src/shared/services/inventoryService.ts src/shared/services/healthService.ts src/shared/services/index.ts src/shared/ui/ConnectivityBadge.tsx src/features/inventory/InventoryPage.tsx tests/unit/inventory-service.test.ts tests/unit/health-service.test.ts
git commit -m "feat: bind inventory items and health checks to shared services"
```

### Task 4: Bind Sales Endpoints and Remove Unsupported Dummy Sales Views

**Files:**
- Create: `src/shared/services/salesService.ts`
- Modify: `src/shared/services/index.ts`
- Modify: `src/features/inventory/InventoryPage.tsx`
- Modify: `src/features/inventory/useInventoryApproval.ts`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Create: `tests/unit/sales-service.test.ts`
- Modify: `tests/component/inventory-approval.test.tsx`

- [ ] **Step 1: Write the failing sales service unit test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { salesService } from '../../src/shared/services';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

describe('salesService', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'collector-token',
      user: { id: 'U-002', name: 'Collector', role: 'collector', email: 'collector@ecotrack.local' },
    });
    vi.restoreAllMocks();
  });

  it('creates and submits a draft sale using backend endpoints', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'SALE-101',
        inventoryItemId: 'INV-001',
        quantitySold: 2,
        revenueInr: 120,
        soldAtUtc: '2026-05-28T00:00:00Z',
        approvalStatus: 'draft',
        requestedByUserId: 'U-002',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'SALE-101',
        inventoryItemId: 'INV-001',
        quantitySold: 2,
        revenueInr: 120,
        soldAtUtc: '2026-05-28T00:00:00Z',
        approvalStatus: 'pendingApproval',
        requestedByUserId: 'U-002',
      }), { status: 200 }));

    const created = await salesService.createDraft({ inventoryItemId: 'INV-001', quantitySold: 2, soldAt: '2026-05-28' });
    const submitted = await salesService.submitDraft(created.id);

    expect(created.approvalStatus).toBe('draft');
    expect(submitted.approvalStatus).toBe('pending_approval');
  });
});
```

- [ ] **Step 2: Run the sales service test to confirm there is no common sales service yet**

Run: `npm test -- --run tests/unit/sales-service.test.ts`
Expected: FAIL because `src/shared/services/salesService.ts` has not been created.

- [ ] **Step 3: Implement the sales service and reshape the inventory and dashboard UI around current backend limits**

```ts
// src/shared/services/salesService.ts
import type { SaleApprovalStatus, SaleRecord } from '../api/contracts';
import { requestJson } from './http';

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

export const salesService = {
  async createDraft(input: { inventoryItemId: string; quantitySold: number; soldAt: string }) {
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
  async updateDraft(id: string, input: { inventoryItemId: string; quantitySold: number; soldAt: string }) {
    const dto = await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        inventoryItemId: input.inventoryItemId,
        quantitySold: input.quantitySold,
        soldAtUtc: input.soldAt,
      }),
    });

    return toSaleRecord(dto);
  },
  async submitDraft(id: string) {
    return toSaleRecord(await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}/submit`, { method: 'POST' }));
  },
  async approveSale(id: string) {
    return toSaleRecord(await requestJson<SaleRecordDto>(`/api/inventory/sales/${id}/approve`, { method: 'POST' }));
  },
};
```

```tsx
// src/features/inventory/InventoryPage.tsx
const [latestDraft, setLatestDraft] = useState<SaleRecord | null>(null);

const createDraftMutation = useMutation({
  mutationFn: (input: { inventoryItemId: string; quantitySold: number; soldAt: string }) =>
    salesService.createDraft(input),
  onSuccess: (created) => {
    setLatestDraft(created);
  },
});

const updateDraftMutation = useMutation({
  mutationFn: (input: { id: string; inventoryItemId: string; quantitySold: number; soldAt: string }) =>
    salesService.updateDraft(input.id, input),
  onSuccess: (updated) => {
    setLatestDraft(updated);
  },
});

const submitDraftMutation = useMutation({
  mutationFn: (id: string) => salesService.submitDraft(id),
  onSuccess: (submitted) => {
    setLatestDraft(submitted);
  },
});

// Replace the old Sales Records table with a route-gap panel.
<div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
  Sales history is not shown yet because the backend does not expose `GET /api/inventory/sales`.
</div>

// Show the latest API-backed draft returned by create/update/submit.
{latestDraft && (
  <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-200">
    <p className="font-medium">Latest Draft: {latestDraft.id}</p>
    <p>Status: {latestDraft.approvalStatus}</p>
    {latestDraft.approvalStatus === 'draft' && (
      <button
        type="button"
        onClick={() => submitDraftMutation.mutate(latestDraft.id)}
        className="mt-3 rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
      >
        Send for Approval
      </button>
    )}
  </div>
)}
```

```ts
// src/features/inventory/useInventoryApproval.ts
export function usePendingSalesForApproval() {
  return {
    data: [],
    isLoading: false,
    isUnavailable: true,
  } as const;
}

export function useApproveSale() {
  return {
    mutate: () => undefined,
    isPending: false,
    isUnavailable: true,
  } as const;
}
```

```tsx
// src/features/dashboard/DashboardPage.tsx
{isAdmin && (
  <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-5 shadow-lg shadow-slate-950/30">
    <h2 className="mb-2 text-sm font-semibold text-amber-200">Pending Sales Approvals</h2>
    <p className="text-sm text-amber-100">
      Approval queue is temporarily unavailable because the backend does not yet expose a sales listing endpoint.
    </p>
  </div>
)}
```

- [ ] **Step 4: Update the inventory component test and rerun both suites**

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

describe('inventory api-backed workflow', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('shows collector draft creation and the sales route gap message', async () => {
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
      return new Response(JSON.stringify({ status: 'healthy' }), { status: 200 });
    });

    renderInventory();

    expect(await screen.findByRole('button', { name: /create sale draft/i })).toBeInTheDocument();
    expect(await screen.findByText(/backend does not expose get \/api\/inventory\/sales/i)).toBeInTheDocument();
  });
});
```

Run: `npm test -- --run tests/unit/sales-service.test.ts tests/component/inventory-approval.test.tsx`
Expected: PASS with sales mutations bound to services and unsupported sales reads removed from the UI.

- [ ] **Step 5: Commit the sales integration and gap handling**

```bash
git add src/shared/services/salesService.ts src/shared/services/index.ts src/features/inventory/InventoryPage.tsx src/features/inventory/useInventoryApproval.ts src/features/dashboard/DashboardPage.tsx tests/unit/sales-service.test.ts tests/component/inventory-approval.test.tsx
git commit -m "feat: bind supported sales endpoints and remove dummy sales views"
```

### Task 5: Compose the Shared Services Layer into the Existing API Facade and Finalize Docs

**Files:**
- Create: `src/shared/api/legacyClient.ts`
- Modify: `src/shared/api/client.ts`
- Modify: `src/shared/errors/mapApiError.ts`
- Modify: `tests/unit/mock-api.test.ts`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Write the failing compatibility-facade smoke test**

```ts
import { describe, expect, it } from 'vitest';
import { api } from '../../src/shared/api/client';

describe('api facade composition', () => {
  it('exposes the new service-backed auth and inventory methods', () => {
    expect(api.auth.login).toBeTypeOf('function');
    expect(api.inventory.getItems).toBeTypeOf('function');
    expect(api.sales.createDraft).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run the compatibility test to verify the old client shape does not match yet**

Run: `npm test -- --run tests/unit/mock-api.test.ts`
Expected: FAIL because `src/shared/api/client.ts` is still the monolithic mock adapter.

- [ ] **Step 3: Move legacy mock modules, compose the new facade, and normalize transport errors**

```ts
// src/shared/api/legacyClient.ts
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

export const collection = {
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

export const segregation = {
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

export const recycling = {
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

export const dashboard = {
  async getSummary(): Promise<DashboardSummary> {
    await delay();
    return { ...dashboardSummary };
  },
};
```

```ts
// src/shared/api/client.ts
import { authService, healthService, inventoryService, salesService } from '../services';
import { collection, dashboard, recycling, segregation } from './legacyClient';

export const api = {
  auth: authService,
  health: healthService,
  inventory: inventoryService,
  sales: salesService,
  collection,
  segregation,
  recycling,
  dashboard,
};
```

```ts
// src/shared/errors/mapApiError.ts
import { ServiceHttpError } from '../services';

export type MappedError = {
  title: string;
  message: string;
  retryable: boolean;
};

export function mapApiError(error: unknown): MappedError {
  const statusCode = error instanceof ServiceHttpError ? error.statusCode : 0;
  if (statusCode === 401) return { title: 'Access denied', message: 'Your session has expired. Please log in again.', retryable: false };
  if (statusCode === 403) return { title: 'Access denied', message: 'You do not have permission to perform this action.', retryable: false };
  if (statusCode === 404) return { title: 'Record not found', message: 'The requested record could not be found.', retryable: false };
  if (statusCode === 409) return { title: 'Conflict detected', message: 'The record changed on the server. Refresh and try again.', retryable: true };
  if (statusCode >= 500) return { title: 'Unexpected server error', message: 'Something went wrong on the server. Please try again.', retryable: true };
  return { title: 'Request failed', message: 'An unexpected error occurred.', retryable: true };
}
```

```ts
// tests/unit/mock-api.test.ts
import { describe, expect, it } from 'vitest';
import { api } from '../../src/shared/api/client';

describe('api facade composition', () => {
  it('exposes the new service-backed auth and inventory methods', () => {
    expect(api.auth.login).toBeTypeOf('function');
    expect(api.inventory.getItems).toBeTypeOf('function');
    expect(api.sales.createDraft).toBeTypeOf('function');
  });

  it('keeps collection on the legacy mock client', async () => {
    const result = await api.collection.getSchedule();
    expect(result.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Document the new services-folder setup and run the full focused verification set**

```env
# .env.example
VITE_API_BASE_URL=http://localhost:5000
```

```md
<!-- README.md -->
## Frontend Service Layer Setup

1. Start the backend API locally.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_API_BASE_URL` to the backend base URL.
4. Run `npm run dev`.

The frontend now uses `src/shared/services` for auth, inventory items, health checks, and supported sales actions. Collection, segregation, recycling, and dashboard summary remain on the legacy mock adapter until matching backend endpoints are available.
```

Run: `npm test -- --run tests/unit/http-service.test.ts tests/unit/auth-session.test.ts tests/unit/inventory-service.test.ts tests/unit/sales-service.test.ts tests/unit/health-service.test.ts tests/component/login-page.test.tsx tests/component/inventory-approval.test.tsx tests/unit/mock-api.test.ts`
Expected: PASS.

Run: `npm run build`
Expected: PASS with the services layer compiled and wired into the existing app.

- [ ] **Step 5: Commit the facade and documentation changes**

```bash
git add src/shared/api/legacyClient.ts src/shared/api/client.ts src/shared/errors/mapApiError.ts tests/unit/mock-api.test.ts .env.example README.md
git commit -m "chore: compose frontend services layer into shared api facade"
```

## Self-Review

Spec coverage:
- Shared services folder creation is covered by Tasks 1 and 5.
- Real auth integration is covered by Task 2.
- Real item listing, create, price update, and health checks are covered by Task 3.
- Sales create, update, and submit support is covered by Task 4.
- Unsupported backend reads are handled explicitly in Task 4 without retaining dummy data.

Placeholder scan:
- No `TBD`, `TODO`, or vague “implement later” markers remain.
- Each task includes exact files, runnable commands, and concrete code snippets.

Type consistency:
- UI-facing types remain in `src/shared/api/contracts.ts` and `src/features/auth/types.ts`.
- Backend DTO casing (`standardPriceInr`, `soldAtUtc`, `pendingApproval`) is normalized only inside the shared services layer.
- The services folder becomes the only place that knows backend endpoint paths and request payload shapes.