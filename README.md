# EcoTrack Frontend

Recycling and Waste Management Platform — React + TypeScript frontend MVP.

## Getting Started

```bash
npm install
copy .env.example .env
npm run dev
```

App runs at http://localhost:5173

Set `VITE_API_BASE_URL` to your .NET backend base URL. The default local setup expects the API at `http://localhost:5000`.

## Backend Setup

Current real API integration is enabled for auth, inventory items, inventory pricing, sales draft submit/update flows, and health checks.

Expected backend routes:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/inventory/items`
- `POST /api/inventory/items`
- `PATCH /api/inventory/items/{id}/price`
- `POST /api/inventory/sales`
- `PUT /api/inventory/sales/{id}`
- `POST /api/inventory/sales/{id}/submit`
- `POST /api/inventory/sales/{id}/approve`
- `GET /health`

Run the .NET backend first, then start the frontend. If the backend is unavailable, the UI will show a connectivity warning and auth-protected screens will fail closed.

## Demo Credentials

| Role      | Email                        | Password      |
|-----------|------------------------------|---------------|
| Admin     | admin@ecotrack.local         | admin123      |
| Collector | collector@ecotrack.local     | collector123  |

These credentials are valid only if your backend seeds the same users.

## Scripts

| Command              | Description                     |
|----------------------|---------------------------------|
| `npm run dev`        | Start development server        |
| `npm run build`      | Production build                |
| `npm test -- --run`  | Run unit and component tests    |
| `npm run test:e2e`   | Run Playwright E2E tests        |

## Role Access

| Area        | Admin | Collector |
|-------------|-------|-----------|
| Dashboard   | ✓     | ✗         |
| Collection  | ✓     | ✓         |
| Segregation | ✓     | ✓         |
| Recycling   | ✓     | ✓         |
| Inventory   | ✓     | ✓         |

## Operational Workflow Rules

1. Once a pickup task is marked `collected`, it is locked and cannot be edited or deleted.
2. Only `collected` pickup tasks can be dispatched to segregation.
3. Segregation can consume only dispatched quantities and cannot exceed pending dispatched weight.
4. Recycling batches must reach the `converted` stage before product creation is allowed.
5. Converted products are moved into inventory through the dedicated inventory sync action.

## Inventory Pricing and Sales Approval Rules

1. Every stock ledger item has a standard price (`standardPriceINR`).
2. Only admin can update the standard price value.
3. Collector can create sale drafts and send them for approval.
4. Admin can approve supported sale records, but the dashboard approval queue stays unavailable until the backend adds a sales listing endpoint.
5. Approved sales become locked and cannot be edited.

## Architecture

- **Feature modules:** `src/features/{auth,collection,segregation,recycling,inventory,dashboard}`
- **Shared platform:** `src/shared/services` for real backend calls, `src/shared/api` for composed facade + legacy mock modules, `src/shared/errors`, `src/shared/ui`
- **App shell:** `src/app/layouts/AppShell.tsx` with role guards and error boundary
- **Legacy mock data:** `src/shared/api/mockData.ts` still backs collection, segregation, recycling, and dashboard until backend routes exist

## Tech Stack

React · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query · Recharts · Vitest · Playwright
