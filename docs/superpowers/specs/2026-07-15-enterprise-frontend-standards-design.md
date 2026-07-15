# EcoTrack Enterprise Frontend Standards Design

Date: 2026-07-15
Status: Approved for specification, pending implementation plan
Scope: Full frontend UI standardization (big-bang rollout)

## 1. Objective

Establish a strict, enterprise-grade frontend design system across the EcoTrack application with:

- A unified dark/light theming model with user override.
- A global, reusable delete confirmation modal pattern.
- Standardized table and dropdown primitives.
- Reusable shared components and patterns for all current and future features.

The implementation strategy is a big-bang rollout: define standards first, then migrate all feature pages in a coordinated pass.

## 2. Decisions Captured From Brainstorming

1. Rollout strategy: Big-bang refactor across all pages.
2. Theme behavior: System preference default with manual user override persisted per user.
3. Delete confirmation standard: Simple global modal with title, message, Delete and Cancel buttons.
4. Design governance level: Strict token-only standards; no local page-level visual overrides.
5. Approach selected: Design System Core First, then full refactor.

## 3. Architecture

### 3.1 Layers

1. Design Tokens Layer
- Single source of truth for color, spacing, typography, radius, borders, shadows, focus, and motion.
- Two token sets: light and dark.
- Components consume semantic tokens only.

2. Theme Runtime Layer
- Central provider/hook resolves active theme from system preference and user override.
- Semantic CSS variable mapping drives UI rendering.

3. Primitives Layer (shared)
- Button, Input, Select, Table, Modal, Badge, Card, PageHeader, FormField.
- One global confirmation modal primitive for destructive actions.
- Standardized radius and border behavior across controls and table containers.

4. Composite Patterns Layer
- DataTable pattern with standardized loading, empty, error, and ready states.
- ConfirmDelete helper flow for destructive actions.
- FilterBar pattern for search/filter/action controls.

5. Feature Pages Layer
- Dashboard, Collection, Segregation, Recycling, and Inventory consume shared primitives/composites.
- Feature pages do not define independent visual styling patterns.

### 3.2 Enforcement Rule

Strict token-only policy applies to all migrated/new UI. Any new visual need must be added as a shared design-system extension before use.

## 4. Data Flow and State Contracts

### 4.1 Theme Contract

Inputs:
- systemTheme: light | dark
- userOverride: light | dark | system

Resolution:
- activeTheme = userOverride !== system ? userOverride : systemTheme

Behavior:
- Persist userOverride under a stable key.
- Resolve theme before first meaningful paint to reduce flash.
- Expose activeTheme, userOverride, setThemePreference(), and isSystemMode via theme context.

### 4.2 Delete Confirmation Contract

Entry:
- Any destructive action uses shared confirmation API; no window.confirm usage.

Payload:
- title (required)
- message (required)
- confirmLabel (default: Delete)
- cancelLabel (default: Cancel)
- severity (danger)

Lifecycle:
- idle -> opened -> confirming -> success | error -> closed
- Confirm button must lock during in-flight requests.
- On failure, modal remains open with inline error.

Result:
- Returns confirmed or cancelled status plus optional error metadata.

### 4.3 Table Contract

Supported states:
- loading
- ready with data
- empty
- error

Structure:
- Shared column model (label, accessor, alignment, width policy).
- Shared row-action cell pattern.
- Consistent table radius and border treatment.

### 4.4 Select/Dropdown Contract

Supported states:
- default
- focus
- disabled
- error
- loading options

Data model:
- options[] with label and value; optional metadata.
- standardized placeholder and clearability behavior.

Interaction:
- keyboard navigation and ARIA-compliant semantics are mandatory.

### 4.5 Migration Governance Contract

- No hardcoded colors/radius values in feature pages after migration.
- Custom visual variants must be upstreamed to shared layer.
- Feature pages are consumers of the system, not style owners.

## 5. Error Handling and Edge Cases

### 5.1 Error Presentation Standards

- Blocking errors: inline where action occurs.
- Non-blocking errors: toast plus local context.
- Background errors: lightweight status indicator with retry affordance.

Error copy format:
- concise title
- user-readable message
- optional retry/cancel action
- no raw stack traces in UI

### 5.2 Delete Modal Failure Handling

- Keep modal open on failure.
- Show inline error.
- Keep Cancel active; re-enable Delete after request settles.
- Prevent duplicate submit requests while confirming.

### 5.3 Theme Fallback Handling

- Invalid stored value falls back to system mode and self-heals stored preference.
- OS theme changes apply only when userOverride is system.

### 5.4 Table and Select Edge Cases

Table:
- Standardized empty-state component.
- Standardized error-state with retry callback.
- Long cell values truncate predictably with tooltip policy.

Select:
- No-options state is explicit.
- Loading-options state is explicit.
- Invalid selected value resolves by clear-or-fallback policy per control configuration.

### 5.5 Accessibility and Interaction

Modal:
- focus trap required
- deterministic initial focus (Cancel for destructive dialogs)
- Escape behavior must be safe during in-flight confirmation

Keyboard behavior:
- deterministic tab order
- explicit Enter-key behavior in destructive contexts

### 5.6 Observability

Track:
- UI error categories by domain (theme, modal, table, select)
- destructive action attempt/success/failure metrics
- non-sensitive correlation metadata only

## 6. Testing and Governance

### 6.1 Test Strategy

Unit tests:
- theme resolver precedence and fallback
- modal lifecycle and duplicate-submit prevention
- table state rendering
- select state behavior

Component tests:
- all feature delete triggers invoke shared modal
- consistent confirm/cancel/keyboard behavior
- table structural contracts and visual wrappers
- select interaction and accessibility behavior

Integration tests:
- Collection, Inventory, Segregation flows remain functional after migration
- theme preference persistence across reload/session
- consistent delete-error behavior

E2E smoke:
- cross-page primitive consistency checks
- at least one major workflow validated in dark and light theme

### 6.2 Quality Gates

Definition of done for UI changes:
- shared tokens/primitives used
- no local hardcoded visual literals in feature pages
- required tests included
- accessibility baseline met

PR review checks:
- token compliance
- no new one-off modal/table/select implementations
- loading/empty/error states covered
- destructive actions use global confirmation flow

### 6.3 Enforcement Mechanisms

- lint/style checks for banned local visual literals in feature UI files
- migration checklist for remaining legacy patterns
- doc-first rule for new shared primitive variants

## 7. Rollout Plan Constraints (for implementation planning)

- Apply a temporary UI-change freeze window during migration.
- Execute migration in a single branch with frequent verification checkpoints.
- Cut over only after all features pass regression and consistency checks.

## 8. Out of Scope

- Backend API contract changes.
- Feature-level business logic redesign unrelated to UI standards.
- New functional modules beyond styling/system standardization.

## 9. Acceptance Criteria

1. All existing pages use shared primitives and semantic tokens.
2. Theme toggle (light/dark/system behavior) is globally available and persisted.
3. Delete actions across modules use one consistent confirmation modal.
4. Table and dropdown visuals/interactions are standardized app-wide.
5. Regression suite demonstrates no functional breakage in key workflows.
