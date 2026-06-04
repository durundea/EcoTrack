# EcoTrack Sales Records Search Design

Date: 2026-06-03
Project: EcoTrack Frontend Inventory Sales Records
Status: Approved design draft

## 1. Scope and Goals

This spec defines the frontend change for the Inventory page sales records section.

Primary user goal:
- Show every sales record returned by GET /api/inventory/sales
- Let users search sales records by item name
- Keep direct lookup by sale ID available through the existing GET /api/inventory/sales/{id} contract

Primary screen in scope:
- Inventory page sales records section

In scope:
- Sales records list rendering
- Item-name search across sales records
- Sale-ID search/lookup support
- Empty, loading, and error states for the sales records section
- Joining sale records with inventory item names for display and search

Out of scope:
- Changing backend response shapes
- Editing or approving sales from the list view
- Pagination or server-side search for the first pass
- Replacing the existing sales draft workflow

Success criteria:
- Every sale returned by the listing endpoint can be shown in the Sales Records section
- Users can search by item name using partial, case-insensitive matching
- Users can still locate a record by sale ID
- The list remains usable even when an item name cannot be resolved locally

## 2. Chosen Architecture

Chosen approach:
- Client-side list, join, and filter on the Inventory page

Architecture:
- Keep the Inventory page as the owning screen for sales records
- Add a sales listing query to the existing frontend service layer
- Reuse the existing inventory items query to resolve item names
- Build a derived view model in the page or a small helper hook so UI code stays thin
- Keep search state local to the Inventory page

Why this approach:
- It matches the current frontend pattern of server data plus local UI state
- It avoids introducing a separate sales browser screen for a single workflow
- It keeps search fast and simple for the initial backend listing endpoint

Data shaping boundary:
- Sales records are normalized at the service layer into the existing SaleRecord type
- Display labels are derived by joining sale.inventoryItemId against inventory items
- If the join fails, the UI falls back to showing the inventory item ID

## 3. Module Design and UX Flows

### 3.1 Sales Records Section

Behavior:
- Replace the placeholder message with a live sales list
- Show records returned by GET /api/inventory/sales
- Include the existing sale metadata already available in the contract, such as:
  - Sale ID
  - Item ID
  - Item name when resolved
  - Quantity sold
  - Revenue
  - Sold date
  - Approval status
  - Requested/approved user metadata when available

Layout:
- Keep the section inside the Inventory page
- Add a search input above the list
- Keep the presentation consistent with the current dark operational UI

### 3.2 Search Behavior

Search input behavior:
- Search applies locally to the loaded sales list
- Item-name search uses partial, case-insensitive matching
- Sale-ID search uses an exact match against the sale identifier
- If the user types an exact sale ID, that record remains visible
- If the user types part of an item name, matching records remain visible

Matching precedence:
- If the search text exactly matches a sale ID, show that record first
- Otherwise, filter by item-name partial match
- Never hide a sale record only because its item name could not be resolved

### 3.3 Empty and Fallback States

Loading state:
- Show a section-level loading indicator while sales data is being fetched

Empty state:
- Show a helpful empty message when no sales records are returned

No-match state:
- Show a no-results message when the search term filters out all visible rows

Fallback display:
- Show inventory item ID when the item name cannot be resolved
- This prevents the row from becoming blank if the inventory list is stale or incomplete

## 4. Data Flow and Integration Plan

Read flow:
- Inventory page loads inventory items and sales records
- The sales service fetches the list from GET /api/inventory/sales
- The page builds a joined view model by matching sale.inventoryItemId to inventory item names
- The search term filters that derived list before rendering

Direct lookup flow:
- GET /api/inventory/sales/{id} stays exposed in the service contract
- The first implementation does not need a separate lookup control
- The endpoint remains available for future drill-in or record-detail behavior

Service layer changes:
- Add a sales listing method to the sales service
- Preserve the existing create/update/submit/approve calls
- Keep DTO normalization in the service layer so the UI receives the existing SaleRecord shape

State strategy:
- Server state for sales records via the existing query layer
- Local state for search input and derived filtering
- No global app state is needed for this feature

## 5. Error Handling and Resilience

API errors:
- Show a section-level error message if the sales list fails to load
- Keep the rest of the Inventory page usable even if sales records are unavailable

Join failures:
- If a sale references an inventory item that is not present in the inventory list, still render the sale
- Use the item ID as the fallback label

Search resilience:
- Ignore case differences in the search term
- Trim leading and trailing whitespace before filtering
- Treat empty search input as no filter

Operational resilience:
- Do not block draft creation, price updates, or approval actions when the sales list query fails
- Preserve the existing sales draft workflow exactly as it is

## 6. Testing Strategy

Unit tests:
- Sales service listing adapter returns normalized SaleRecord objects
- Search helper matches sale IDs correctly
- Search helper matches item names with partial, case-insensitive logic
- Search helper returns all rows when the search input is empty

Component tests:
- Sales Records section renders all loaded sales rows
- Search input filters by item name
- Search input filters by sale ID
- Fallback label appears when item name resolution fails
- Empty and no-results states render correctly

Integration coverage:
- Inventory page can load inventory items and sales records together
- The sales section remains visible when search is active
- Existing draft and approval actions continue to work after the sales list is added

## 7. Done Criteria

This feature is done when:
- The placeholder message is replaced with a real sales records list
- The list shows every record returned by GET /api/inventory/sales
- Search works by item name and sale ID
- Item-name search supports partial matching
- The UI falls back gracefully when inventory lookup data is incomplete
- Tests cover the list, filtering, and fallback behavior

## 8. Implementation Sequence

1. Service layer:
- Add the sales listing method and DTO normalization

2. Inventory page wiring:
- Fetch sales records and join them with inventory items
- Add search state and derived filtering

3. UI rendering:
- Replace the placeholder with the list and search controls
- Add loading, empty, and no-results states

4. Test coverage:
- Add service and component tests for the search and fallback logic

## 9. Risks and Mitigations

Risk: The sales list only carries inventoryItemId, so item-name search depends on another query.
Mitigation: Join against the existing inventory items list and fall back to item ID when needed.

Risk: Client-side filtering may become slow if the sales list grows large.
Mitigation: Start with client-side filtering for simplicity; move to server-side search only if volume makes it necessary.

Risk: Search behavior could become ambiguous if users expect exact item-name matching.
Mitigation: Define partial, case-insensitive item-name matching as the default and keep sale-ID lookup direct.
