# EcoTrack Backend Phase 1 Design

Date: 2026-05-22
Project: EcoTrack Backend Phase 1
Status: Approved design draft

## 1. Scope and Goals

This spec defines Phase 1 of the EcoTrack backend as a separate solution named `EcoTrack-Backend` that will serve the existing EcoTrack frontend.

Primary goal:
- Replace the frontend mock adapter for authentication and inventory workflows with a production-shaped .NET backend.

Phase 1 feature boundaries:
- Authentication with `admin` and `collector` roles
- JWT-based login and protected API access
- Inventory item CRUD
- Standard pricing with admin-only price updates
- Sales draft creation and approval workflow
- Approved-sale lock enforcement
- Swagger, logging, centralized exception handling, PostgreSQL persistence, and focused tests

Out of scope for Phase 1:
- Collection module
- Segregation module
- Recycling module
- Dashboard aggregation APIs
- Refresh tokens
- Audit trail tables
- File or image upload
- Background jobs
- Caching
- Deployment automation beyond local development readiness

Primary success metric for Phase 1:
- The frontend can replace mock auth and inventory flows with real API calls without changing its domain behavior.

## 2. Design Constraints and Context

The existing frontend already defines the initial backend contract surface through:
- `src/shared/api/contracts.ts`
- `src/shared/api/client.ts`
- `README.md` workflow rules

The backend must preserve these rules instead of trusting the frontend to enforce them. The backend is the source of truth for authentication, authorization, validation, workflow transitions, and persistence.

Phase 1 must be structured to support later modules without forcing a redesign when Collection, Segregation, Recycling, and Dashboard are added.

## 3. Chosen Architecture

Chosen approach:
- Layered modular monolith in a separate solution folder

Solution structure:
- `EcoTrack-Backend/EcoTrack.Api`
- `EcoTrack-Backend/EcoTrack.Application`
- `EcoTrack-Backend/EcoTrack.Domain`
- `EcoTrack-Backend/EcoTrack.Infrastructure`
- `EcoTrack-Backend/tests/EcoTrack.UnitTests`
- `EcoTrack-Backend/tests/EcoTrack.IntegrationTests`

Architecture responsibilities:

### 3.1 EcoTrack.Api

Responsibilities:
- Controllers and HTTP endpoints
- Authentication and authorization configuration
- Dependency injection composition root
- Swagger/OpenAPI configuration
- Global exception handling middleware
- Request and response DTO exposure

### 3.2 EcoTrack.Application

Responsibilities:
- Use cases for Auth and Inventory
- Request validation
- DTOs and mapping boundaries
- Service interfaces for tokens, password hashing, current user access, and persistence operations
- Business orchestration that coordinates domain rules and persistence

### 3.3 EcoTrack.Domain

Responsibilities:
- Core entities and enums
- Business invariants that do not depend on EF Core or ASP.NET Core
- Explicit workflow rules for inventory pricing and sale approval lifecycle

### 3.4 EcoTrack.Infrastructure

Responsibilities:
- EF Core `AppDbContext`
- PostgreSQL integration via Npgsql
- Entity configurations and migrations
- JWT token generation implementation
- Password hashing implementation
- Persistence implementations used by the application layer

### 3.5 Feature Organization

Within `Api` and `Application`, code should be organized by feature first:
- `Auth`
- `Inventory`

This keeps enterprise layering while avoiding generic, catch-all folders that become hard to maintain as the codebase grows.

## 4. Module Design and Data Model

Phase 1 domain model should stay intentionally small and aligned with the frontend contracts.

### 4.1 User

Fields:
- `Id`
- `Name`
- `Email`
- `PasswordHash`
- `Role`
- `IsActive`
- `CreatedAtUtc`

Rules:
- Email must be unique
- Only active users can authenticate
- Roles are limited to `Admin` and `Collector` in Phase 1

### 4.2 InventoryItem

Fields:
- `Id`
- `Name`
- `Category`
- `QuantityKg`
- `Unit`
- `StandardPriceInr`
- `CreatedAtUtc`
- `UpdatedAtUtc`

Rules:
- `Name` is required
- `QuantityKg` cannot be negative
- `StandardPriceInr` cannot be negative
- Only admins can update `StandardPriceInr`

### 4.3 SaleRecord

Fields:
- `Id`
- `InventoryItemId`
- `QuantitySold`
- `RevenueInr`
- `SoldAtUtc`
- `ApprovalStatus`
- `RequestedByUserId`
- `ApprovedByUserId`
- `ApprovedAtUtc`
- `RejectionReason`
- `CreatedAtUtc`
- `UpdatedAtUtc`

Rules:
- `QuantitySold` must be greater than zero
- `RevenueInr` is derived by backend logic from `InventoryItem.StandardPriceInr * QuantitySold`
- Only draft sales can be submitted for approval
- Only admins can approve sales
- Approved sales cannot be edited or deleted
- Collectors can create and submit only their own sales

### 4.4 Enums

Phase 1 enums:
- `UserRole`: `Admin`, `Collector`
- `InventoryCategory`: `RawWaste`, `RecycledProduct`
- `SaleApprovalStatus`: `Draft`, `PendingApproval`, `Approved`, `Rejected`

## 5. API Design and Request Flow

The API should stay contract-oriented so the frontend can replace the current mock adapter with minimal churn.

### 5.1 Auth Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`

Behavior:
- `login` validates credentials, returns JWT, and returns current user summary with role information
- `me` returns the authenticated user's profile and role derived from the token context

### 5.2 Inventory Endpoints

- `GET /api/inventory/items`
- `GET /api/inventory/items/{id}`
- `POST /api/inventory/items`
- `PUT /api/inventory/items/{id}`
- `PATCH /api/inventory/items/{id}/price`
- `DELETE /api/inventory/items/{id}`

### 5.3 Sales Endpoints

- `GET /api/inventory/sales`
- `GET /api/inventory/sales/pending`
- `POST /api/inventory/sales`
- `PUT /api/inventory/sales/{id}`
- `POST /api/inventory/sales/{id}/submit`
- `POST /api/inventory/sales/{id}/approve`
- `DELETE /api/inventory/sales/{id}`

### 5.4 Request Flow

Standard request flow:
1. Controller receives request DTO.
2. Application validation checks shape and workflow preconditions.
3. Application use case loads required entities.
4. Domain rules are enforced.
5. Infrastructure persists the change through EF Core.
6. API returns response DTOs shaped for the frontend contract.

Response model rule:
- API responses use explicit DTOs and must not expose EF Core entities directly.

Time handling rule:
- All persisted and returned server timestamps use UTC.

## 6. Security, Authorization, and Cross-Cutting Behavior

Authentication and authorization:
- JWT bearer authentication
- Role claims for `admin` and `collector`
- Protected endpoints require authentication unless explicitly public
- Price update and sale approval endpoints require admin authorization

Cross-cutting standards:
- Centralized exception handling middleware
- Structured logging for requests, auth failures, validation failures, and state transitions
- Swagger configured with bearer token support for local testing
- Configuration through `appsettings.json` with environment overrides for connection strings and JWT secrets
- Password hashing handled through a dedicated application interface implemented in infrastructure

## 7. Error Handling Contract

Error responses should be consistent and explicit.

Status code expectations:
- `400 Bad Request` for validation failures
- `401 Unauthorized` for missing or invalid token
- `403 Forbidden` for insufficient role permissions
- `404 Not Found` for missing resources
- `409 Conflict` for workflow or state conflicts such as approving a non-pending sale or editing an approved sale
- `500 Internal Server Error` only for unexpected faults

Response behavior:
- Validation errors should return structured field-level detail when applicable
- Known business exceptions should be translated into stable API error responses
- Unexpected exceptions should be logged with request context and masked from clients

## 8. Persistence and Infrastructure

Database choice:
- PostgreSQL as the primary relational database

Persistence tooling:
- EF Core with Npgsql provider
- Code-first migrations checked into source control

Phase 1 persistence requirements:
- Initial migration creates `Users`, `InventoryItems`, and `SaleRecords` tables
- Local seeded users are provided for development
- Foreign key from `SaleRecords.InventoryItemId` to `InventoryItems.Id`
- Foreign key from `SaleRecords.RequestedByUserId` to `Users.Id`
- Nullable foreign key from `SaleRecords.ApprovedByUserId` to `Users.Id`

Implementation expectations:
- EF Core configurations stay in infrastructure, not in domain classes
- Connection strings are environment-configurable
- Migrations are applied through standard development workflow, not hidden runtime magic

## 9. Testing Strategy

Testing should be layered and focused.

### 9.1 Unit Tests

Cover:
- Price update permission rules
- Revenue calculation
- Sale status transition rules
- Approved-sale lock behavior
- Auth input validation and credential failure paths

### 9.2 Integration Tests

Cover:
- Login and JWT issuance
- Access control for admin versus collector
- Inventory CRUD against PostgreSQL-backed persistence
- Sale draft creation, submit, and approve workflows
- Error responses for invalid role or invalid lifecycle transitions

### 9.3 Startup and Developer Experience Checks

Cover:
- API starts successfully in development mode
- Swagger is reachable
- Database migrations apply cleanly

The goal is not exhaustive enterprise ceremony in Phase 1. The goal is enough verification to make the backend dependable and safe to integrate.

## 10. Delivery Boundary for Phase 1

Phase 1 includes:
- Separate `EcoTrack-Backend` solution
- ASP.NET Core Web API on .NET 8
- PostgreSQL and EF Core migrations
- JWT authentication and role-based authorization
- Seeded development users for `admin` and `collector`
- Inventory item CRUD
- Admin-only standard price updates
- Sale draft creation
- Sale submission for approval
- Admin approval flow
- Approved-sale lock behavior
- Swagger, logging, and centralized exception handling
- Focused unit and integration tests

Phase 1 explicitly defers:
- Collection
- Segregation
- Recycling
- Dashboard aggregation APIs
- Refresh tokens
- Audit trail history tables
- Image upload or file storage
- Background processing
- Caching
- Production deployment automation

## 11. Implementation Sequence (High-Level)

Recommended implementation order:

1. Solution bootstrap
- Create the solution and layered projects
- Add PostgreSQL, EF Core, Swagger, logging, and base middleware

2. Persistence foundation
- Add `AppDbContext`
- Create entities and EF Core mappings
- Create and apply initial migration
- Seed development users and initial inventory data

3. Auth slice
- Add login endpoint
- Add JWT generation and authorization configuration
- Add `me` endpoint

4. Inventory slice
- Add inventory CRUD endpoints
- Enforce admin-only price updates

5. Sales approval slice
- Add draft creation, submit, approve, update, and delete behavior
- Enforce approval-state locking rules

6. Hardening
- Add integration tests
- Finalize Swagger auth support
- Finalize exception mapping and logging behavior

## 12. Risks and Mitigations

Risk: Backend DTOs drift from frontend expectations.
Mitigation: Use the frontend contracts as the initial source of truth and keep API DTOs explicitly mapped to them.

Risk: Over-engineering slows delivery in Phase 1.
Mitigation: Keep a modular monolith and avoid introducing CQRS-heavy or microservice patterns before later phases justify them.

Risk: Role and workflow rules are implemented inconsistently.
Mitigation: Centralize lifecycle validation in application and domain logic, and cover it with focused unit and integration tests.

Risk: Frontend mock behavior and backend persistence semantics diverge.
Mitigation: Replace mock calls incrementally by module, starting with auth and inventory only.

## 13. Done Criteria

Phase 1 is done when:
- A developer can run the API locally, connect to PostgreSQL, apply migrations, and authenticate through Swagger.
- The frontend can authenticate against the backend using real `admin` and `collector` roles.
- Inventory CRUD works against PostgreSQL.
- Sales approval workflow behaves the same as the approved frontend rules.
- Focused unit and integration tests pass for the Phase 1 slice.
- The design remains extensible for later Collection, Segregation, Recycling, and Dashboard phases without structural rework.