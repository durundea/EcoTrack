# EcoTrack Frontend

Recycling and Waste Management Platform — React + TypeScript frontend MVP.

## Getting Started

```bash
npm install
npm run dev
```

App runs at http://localhost:5173

## Demo Credentials

| Role      | Email                        | Password      |
|-----------|------------------------------|---------------|
| Admin     | admin@ecotrack.local         | admin123      |
| Collector | collector@ecotrack.local     | collector123  |

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
| Inventory   | ✓     | ✗         |

## Architecture

- **Feature modules:** `src/features/{auth,collection,segregation,recycling,inventory,dashboard}`
- **Shared platform:** `src/shared/api` (mock-first, swap to real adapters when backend is ready), `src/shared/errors`, `src/shared/ui`
- **App shell:** `src/app/layouts/AppShell.tsx` with role guards and error boundary
- **Mock data:** `src/shared/api/mockData.ts` — replace with real .NET API calls by swapping `src/shared/api/client.ts`

## Tech Stack

React · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query · Recharts · Vitest · Playwright
