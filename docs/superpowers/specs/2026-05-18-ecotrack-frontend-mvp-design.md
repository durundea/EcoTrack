# EcoTrack Frontend MVP Design

Date: 2026-05-18
Project: Recycling and Waste Management Platform (Frontend)
Status: Approved design draft

## 1. Scope and Goals

This spec defines the frontend MVP for EcoTrack as a new project.

Primary role for MVP:
- Admin at recycling center

Secondary role included in MVP:
- Collector

MVP feature boundaries:
- Authentication (Admin and Collector)
- Waste collection workflow
- Waste segregation workflow
- Recycling stage workflow
- Inventory management
- Advanced analytics dashboard

Out of scope for MVP:
- QR tracking (deferred)
- AI waste classification (deferred)

Primary success metric for first 6 weeks:
- Operational speed: faster waste entry, status updates, and task completion

## 2. Chosen Architecture

Chosen approach:
- Enterprise shell upfront (user-selected)

Architecture:
- Single React + TypeScript application
- Enterprise app shell for navigation, layout, notifications
- Role-based access and route protection
- Domain modules:
  - Auth
  - Collection
  - Segregation
  - Recycling
  - Inventory
  - Dashboard
- Shared platform layer:
  - API client abstraction
  - Error handling and user feedback system
  - Shared UI primitives and form utilities

State strategy:
- Server state via query layer with caching and retries
- Local UI state per module
- Small global app state for session and common filters only

Routing strategy:
- Public login route
- Protected route tree post-login
- Role-scoped screen access:
  - Admin: full module access
  - Collector: assignment/task execution plus restricted visibility

## 3. Module Design and UX Flows

### 3.1 Authentication

Screens and behavior:
- Login screen with role-aware redirect
- Session handling and token refresh hooks
- Unauthorized and access-denied views

### 3.2 Waste Collection

Screens and behavior:
- Pickup schedule board (list and calendar views)
- Assign collector flow
- Task detail view with status progression
- Waste image upload at collection step
- Quick actions optimized for low-click operation

### 3.3 Waste Segregation

Screens and behavior:
- Batch intake from collected loads
- Category split entry for:
  - Plastic
  - Organic
  - Metal
  - Paper
  - E-waste
- Weight capture and status tracking
- Validation for impossible/invalid entries

### 3.4 Recycling Process

Screens and behavior:
- Stage pipeline:
  - Collected
  - Segregated
  - Processing
  - Converted to product
- Batch conversion records, e.g.:
  - Organic -> Compost
  - Plastic -> Eco-bricks
- Audit timeline for stage transitions

### 3.5 Inventory Management

Screens and behavior:
- Raw waste stock ledger
- Recycled products inventory
- Product sales/outbound records

### 3.6 Dashboard and Reports

Screens and behavior:
- Advanced analytics dashboard (MVP requirement)
- KPI summaries and chart-heavy drill-down views
- Filters:
  - Date range
  - Waste type
  - Collector
  - Site/location
- Exportable tabular views (CSV in MVP)

## 4. Data Flow and Integration Plan

Development integration mode:
- Mock-first frontend development

Contract strategy:
- Define typed frontend API contracts early
- Implement mock adapters against same contracts
- Replace with .NET API adapters later without UI rewrites

Flow model:
- Command flow (writes):
  - User action -> validation -> service adapter -> optimistic UI/cache update -> feedback
- Query flow (reads):
  - Query hooks by role and filter keys -> cache -> background refresh
- Cross-module propagation:
  - Collection completion updates segregation intake
  - Segregation updates feed recycling and inventory
  - Inventory updates inform dashboard refresh

Data normalization boundaries:
- Normalize date/time formatting and units at adapter layer
- Keep domain components transport-agnostic

## 5. Error Handling and Resilience

Validation errors:
- Inline field-level messages
- Preserve entered values on validation failure

API/system errors:
- Unified error mapper for 401/403/404/409/5xx
- Retry-friendly UX for transient failures
- Blocking confirmation only when data loss risk exists

Network quality handling:
- Shell-level connectivity indicator
- Safe retry for status updates
- Explicit feedback on timeout and conflict scenarios

## 6. Testing Strategy

Unit tests:
- Validation utilities
- Role guards
- KPI and formatter functions

Component tests:
- Collection, segregation, recycling form interactions
- Role-based rendering assertions
- Dashboard filter behavior

Integration tests:
- End-to-end flow:
  - Assign pickup -> Collected -> Segregated -> Processing -> Converted -> Inventory update
- Access restrictions for Collector role
- Session expiry and API error pathways

Non-functional checks:
- Responsive behavior (desktop and mobile)
- Accessibility baseline (keyboard, labels, contrast)
- Performance checks for high-volume lists and dashboard screens

## 7. MVP Done Criteria

The frontend MVP is done when:
- Admin and Collector complete end-to-end operational flow without manual correction
- Advanced dashboard supports filtered analytics and exportable tables
- Mock adapters can be swapped with backend adapters without touching feature UI
- Core flow tests pass in CI

## 8. Implementation Sequence (High-Level)

1. Foundation:
- App shell, routing, role guards, shared UI primitives

2. Core workflow modules:
- Auth -> Collection -> Segregation -> Recycling

3. Inventory and analytics:
- Inventory module -> advanced dashboard and report exports

4. Hardening:
- Error standardization, accessibility/performance passes, test completion

## 9. Risks and Mitigations

Risk: Enterprise shell adds upfront complexity.
Mitigation: Keep module boundaries strict and avoid unnecessary global state.

Risk: Mock contracts drift from backend expectations.
Mitigation: Maintain contract definitions in one place and version DTO schemas.

Risk: Advanced dashboard can delay MVP.
Mitigation: Load summary metrics first, then progressive drill-down panels.
