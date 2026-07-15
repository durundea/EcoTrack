import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { KpiCard } from '../../shared/ui/KpiCard';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Modal } from '../../shared/ui/Modal';
import { Button, DataTable, Input, Select } from '../../shared/ui/primitives';
import type { InventoryItem, SaleRecord } from '../../shared/api/contracts';
import { getSession } from '../auth/sessionStore';
import { buildSalesRows, filterSalesRows } from './salesRecords';
import { upsertById } from '../../shared/services/queryListCache';

type EditTarget =
  | { type: 'sale'; value: SaleRecord }
  | { type: 'price'; value: InventoryItem }
  | null;

function formatSoldAtDateTime(soldAt: string): string {
  const timestamp = new Date(soldAt);
  if (Number.isNaN(timestamp.getTime())) {
    return soldAt;
  }

  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(timestamp);
}

export function InventoryPage() {
  const queryClient = useQueryClient();
  const user = useMemo(() => getSession()?.user ?? null, []);
  const isAdmin = user?.role === 'admin';

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: () => api.inventory.getItems(),
  });

  const {
    data: sales,
    isLoading: loadingSales,
    isError: hasSalesError,
  } = useQuery({
    queryKey: ['inventory', 'sales'],
    queryFn: () => api.sales.list(),
  });

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [saleForm, setSaleForm] = useState<Partial<SaleRecord>>({});
  const [priceForm, setPriceForm] = useState<number>(0);
  const [latestDraft, setLatestDraft] = useState<SaleRecord | null>(null);
  const [salesSearch, setSalesSearch] = useState('');
  const [createSaleForm, setCreateSaleForm] = useState({
    inventoryItemId: '',
    quantitySold: 1,
    soldAt: new Date().toISOString(),
  });

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
  };

  const invalidateSales = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'sales'] });
  };

  const { mutate: updateItemPrice, isPending: updatingPrice } = useMutation({
    mutationFn: ({ id, standardPriceINR }: { id: string; standardPriceINR: number }) =>
      api.inventory.updateItemPrice(id, standardPriceINR),
    onSuccess: invalidateInventory,
  });

  const { mutate: updateSale, isPending: updatingSale } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { inventoryItemId: string; quantitySold: number; soldAt: string } }) =>
      api.sales.updateDraft(id, payload),
    onSuccess: (updated) => {
      setLatestDraft(updated);
      invalidateSales();
    },
  });

  const { mutate: createSaleDraft, isPending: creatingSaleDraft } = useMutation({
    mutationFn: (input: { inventoryItemId: string; quantitySold: number; soldAt: string }) => api.sales.createDraft(input),
    onSuccess: (created) => {
      setLatestDraft(created);
      queryClient.setQueryData<SaleRecord[]>(['inventory', 'sales'], (current) => upsertById(current, created));
      invalidateSales();
    },
  });

  const { mutate: submitSaleForApproval, isPending: submittingSale } = useMutation({
    mutationFn: ({ id }: { id: string }) => api.sales.submitDraft(id),
    onSuccess: (submitted) => {
      setLatestDraft(submitted);
      invalidateSales();
    },
  });

  const isSubmitting = updatingSale || updatingPrice;

  function openSaleEditor(sale: SaleRecord) {
    setSaleForm(sale);
    setEditTarget({ type: 'sale', value: sale });
  }

  function openPriceEditor(item: InventoryItem) {
    setPriceForm(item.standardPriceINR);
    setEditTarget({ type: 'price', value: item });
  }

  function closeModal() {
    setEditTarget(null);
  }

  function handleSaveEdit() {
    if (!editTarget) return;

    if (editTarget.type === 'sale') {
      updateSale(
        {
          id: editTarget.value.id,
          payload: {
            inventoryItemId: saleForm.inventoryItemId ?? editTarget.value.inventoryItemId,
            quantitySold: saleForm.quantitySold ?? editTarget.value.quantitySold,
            soldAt: saleForm.soldAt ?? editTarget.value.soldAt,
          },
        },
        { onSuccess: closeModal }
      );
      return;
    }

    updateItemPrice(
      {
        id: editTarget.value.id,
        standardPriceINR: priceForm,
      },
      { onSuccess: closeModal }
    );
  }

  function handleCreateSaleDraft() {
    if (!user) return false;
    createSaleDraft(createSaleForm);
  }

  const modalTitle = useMemo(() => {
    if (!editTarget) return '';
    if (editTarget.type === 'sale') return `Edit Sale ${editTarget.value.id}`;
    return `Update Standard Price ${editTarget.value.id}`;
  }, [editTarget]);

  const totalRevenue = useMemo(
    () => (sales ?? []).reduce((sum, sale) => sum + sale.revenueINR, 0),
    [sales]
  );
  const recycledProducts = (items ?? []).filter((item) => item.category === 'recycled-product');
  const rawWasteItems = (items ?? []).filter((item) => item.category === 'raw-waste');
  const reflectedSales = useMemo(
    () => (latestDraft ? upsertById(sales, latestDraft) : sales ?? []),
    [latestDraft, sales]
  );
  const salesRows = useMemo(() => buildSalesRows(reflectedSales, items ?? []), [reflectedSales, items]);
  const filteredSalesRows = useMemo(() => filterSalesRows(salesRows, salesSearch), [salesRows, salesSearch]);
  const createSaleItemOptions = useMemo(
    () => [
      { label: 'Select item', value: '' },
      ...(items ?? []).map((item) => ({
        label: item.name,
        value: item.id,
      })),
    ],
    [items]
  );
  const stockLedgerColumns = useMemo(
    () => [
      {
        key: 'id',
        header: 'ID',
        className: 'font-mono text-[var(--text-muted)]',
        render: (item: InventoryItem) => item.id,
      },
      {
        key: 'name',
        header: 'Item',
        render: (item: InventoryItem) => item.name,
      },
      {
        key: 'category',
        header: 'Category',
        render: (item: InventoryItem) => (
          <StatusBadge variant={item.category === 'recycled-product' ? 'success' : 'neutral'}>{item.category}</StatusBadge>
        ),
      },
      {
        key: 'quantity',
        header: 'Quantity',
        render: (item: InventoryItem) => item.quantityKg,
      },
      {
        key: 'unit',
        header: 'Unit',
        render: (item: InventoryItem) => item.unit,
      },
      {
        key: 'standard-price',
        header: 'Standard Price (INR)',
        render: (item: InventoryItem) => `₹${item.standardPriceINR.toLocaleString('en-IN')}`,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (item: InventoryItem) => (
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button type="button" size="sm" onClick={() => openPriceEditor(item)}>
                Update Price
              </Button>
            )}
            {isAdmin ? (
              <span className="text-xs text-[var(--text-muted)]">Price update only</span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">View only</span>
            )}
          </div>
        ),
      },
    ],
    [isAdmin]
  );
  const salesRecordColumns = useMemo(
    () => [
      {
        key: 'sold-at',
        header: 'Sold Date/Time (Local)',
        className: 'font-mono text-[var(--text-muted)]',
        render: (row: (typeof filteredSalesRows)[number]) => formatSoldAtDateTime(row.soldAt),
      },
      {
        key: 'item-name',
        header: 'Item',
        render: (row: (typeof filteredSalesRows)[number]) => row.itemName,
      },
      {
        key: 'quantity-sold',
        header: 'Quantity',
        render: (row: (typeof filteredSalesRows)[number]) => row.quantitySold,
      },
      {
        key: 'revenue',
        header: 'Revenue (INR)',
        render: (row: (typeof filteredSalesRows)[number]) => `₹${row.revenueINR.toLocaleString('en-IN')}`,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: (typeof filteredSalesRows)[number]) => (
          <StatusBadge variant={row.approvalStatus === 'pending_approval' ? 'warning' : row.approvalStatus === 'approved' ? 'success' : 'info'}>
            {row.approvalStatus}
          </StatusBadge>
        ),
      },
    ],
    [filteredSalesRows]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory"
        subtitle="Track stock, standard prices, and sales approvals in one operational view."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Recycled Products" value={`${recycledProducts.length}`} />
        <KpiCard label="Raw Waste Entries" value={`${rawWasteItems.length}`} />
        <KpiCard label="Pending Approvals" value={latestDraft?.approvalStatus === 'pending_approval' ? '1' : '0'} />
        <KpiCard label="Revenue (INR)" value={`₹${totalRevenue.toLocaleString('en-IN')}`} />
      </div>

      <div className="radius-xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-5 shadow-lg">
        <h2 className="mb-3 text-lg font-medium">Create Sale Draft</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {isAdmin
            ? 'Admin override: use draft creation only for corrections or manual operational entries.'
            : 'Collector workflow: create a draft, then send it for approval.'}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Select
            label="Item"
            value={createSaleForm.inventoryItemId}
            options={createSaleItemOptions}
            onChange={(next) =>
              setCreateSaleForm((prev) => ({
                ...prev,
                inventoryItemId: next,
              }))
            }
          />
          <Input
            label="Quantity Sold"
            type="number"
            min={1}
            value={createSaleForm.quantitySold}
            onChange={(next) =>
              setCreateSaleForm((prev) => ({
                ...prev,
                quantitySold: Number(next),
              }))
            }
          />
          <Input
            label="Sold Date"
            type="date"
            value={createSaleForm.soldAt.slice(0, 10)}
            onChange={(next) =>
              setCreateSaleForm((prev) => ({
                ...prev,
                soldAt: next ? new Date(next).toISOString() : prev.soldAt,
              }))
            }
          />
          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleCreateSaleDraft}
              disabled={!createSaleForm.inventoryItemId || creatingSaleDraft || !user}
              className="w-full"
            >
              Create Sale Draft
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Stock Ledger</h2>
        <DataTable
          columns={stockLedgerColumns}
          rows={items ?? []}
          state={loadingItems ? 'loading' : (items ?? []).length === 0 ? 'empty' : 'ready'}
          emptyTitle="No inventory items available."
          getRowKey={(item) => item.id}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Sales Records</h2>
        <div className="radius-xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4 shadow-lg">
          <div className="mb-4">
            <Input
              id="sales-search"
              label="Search Sales"
              type="text"
              value={salesSearch}
              onChange={setSalesSearch}
              placeholder="Search by sale ID or item name"
            />
          </div>

          {loadingSales ? (
            <p className="text-sm text-[var(--text-muted)]">Loading sales records...</p>
          ) : hasSalesError ? (
            <p className="text-sm text-[var(--status-danger)]">Unable to load sales records.</p>
          ) : salesRows.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No sales records available.</p>
          ) : filteredSalesRows.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No sales records match your search.</p>
          ) : (
            <DataTable
              columns={salesRecordColumns}
              rows={filteredSalesRows}
              state="ready"
              getRowKey={(row) => row.id}
            />
          )}
        </div>
        {latestDraft && (
          <div className="radius-xl mt-4 border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4 text-sm text-[var(--text-primary)] shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">Latest Draft: {latestDraft.id}</p>
                <p>Item {latestDraft.inventoryItemId} | Qty {latestDraft.quantitySold} | ₹{latestDraft.revenueINR}</p>
                <StatusBadge variant={latestDraft.approvalStatus === 'pending_approval' ? 'warning' : latestDraft.approvalStatus === 'approved' ? 'success' : 'info'}>
                  {latestDraft.approvalStatus}
                </StatusBadge>
              </div>
              {latestDraft.approvalStatus === 'draft' ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => openSaleEditor(latestDraft)}
                    variant="secondary"
                    size="sm"
                  >
                    Edit Draft
                  </Button>
                  <Button
                    type="button"
                    disabled={submittingSale}
                    onClick={() => submitSaleForApproval({ id: latestDraft.id })}
                    size="sm"
                  >
                    Send for Approval
                  </Button>
                </div>
              ) : latestDraft.approvalStatus === 'approved' ? (
                <span className="text-xs text-[var(--text-muted)]">Locked after approval</span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(editTarget)}
        title={modalTitle}
        onClose={closeModal}
        footer={
          <>
            <Button
              type="button"
              onClick={closeModal}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {editTarget?.type === 'sale' ? (
          <div className="space-y-3">
            <Input
              label="Item ID"
              type="text"
              value={saleForm.inventoryItemId ?? ''}
              onChange={(next) => setSaleForm((prev) => ({ ...prev, inventoryItemId: next }))}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Quantity Sold"
                type="number"
                min={0}
                value={saleForm.quantitySold ?? 0}
                onChange={(next) => setSaleForm((prev) => ({ ...prev, quantitySold: Number(next) }))}
              />
              <Input
                label="Revenue (INR)"
                type="number"
                min={0}
                value={editTarget.value.revenueINR}
                readOnly
              />
            </div>
            <Input
              label="Sold Date"
              type="date"
              value={(saleForm.soldAt ?? '').slice(0, 10)}
              onChange={(next) => setSaleForm((prev) => ({ ...prev, soldAt: next ? new Date(next).toISOString() : prev.soldAt }))}
            />
          </div>
        ) : editTarget?.type === 'price' ? (
          <Input
            label="Standard Price (INR)"
            type="number"
            min={0}
            value={priceForm}
            onChange={(next) => setPriceForm(Number(next))}
          />
        ) : null}
      </Modal>
    </div>
  );
}
