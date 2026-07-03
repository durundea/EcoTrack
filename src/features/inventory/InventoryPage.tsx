import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { KpiCard } from '../../shared/ui/KpiCard';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Modal } from '../../shared/ui/Modal';
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
  const salesRows = useMemo(() => buildSalesRows(sales ?? [], items ?? []), [sales, items]);
  const filteredSalesRows = useMemo(() => filterSalesRows(salesRows, salesSearch), [salesRows, salesSearch]);

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

      <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/30">
        <h2 className="mb-3 text-lg font-medium">Create Sale Draft</h2>
        <p className="mb-3 text-xs text-slate-400">
          {isAdmin
            ? 'Admin override: use draft creation only for corrections or manual operational entries.'
            : 'Collector workflow: create a draft, then send it for approval.'}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Item</label>
            <select
              value={createSaleForm.inventoryItemId}
              onChange={(event) =>
                setCreateSaleForm((prev) => ({
                  ...prev,
                  inventoryItemId: event.target.value,
                }))
              }
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select item</option>
              {(items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Quantity Sold</label>
            <input
              type="number"
              min={1}
              value={createSaleForm.quantitySold}
              onChange={(event) =>
                setCreateSaleForm((prev) => ({
                  ...prev,
                  quantitySold: Number(event.target.value),
                }))
              }
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Sold Date</label>
            <input
              type="date"
              value={createSaleForm.soldAt.slice(0, 10)}
              onChange={(event) =>
                setCreateSaleForm((prev) => ({
                  ...prev,
                  soldAt: new Date(event.target.value).toISOString(),
                }))
              }
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleCreateSaleDraft}
              disabled={!createSaleForm.inventoryItemId || creatingSaleDraft || !user}
              className="w-full rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Create Sale Draft
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Stock Ledger</h2>
        {loadingItems ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/75 shadow-lg shadow-slate-950/30">
            <table className="w-full text-sm text-slate-100">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Quantity</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Standard Price (INR)</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-slate-400">{item.id}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={item.category === 'recycled-product' ? 'success' : 'neutral'}>
                        {item.category}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">{item.quantityKg}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3">₹{item.standardPriceINR.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openPriceEditor(item)}
                            className="rounded bg-brand-600 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                          >
                            Update Price
                          </button>
                        )}
                        {isAdmin ? (
                          <span className="text-xs text-slate-500">Price update only</span>
                        ) : (
                          <span className="text-xs text-slate-500">View only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Sales Records</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-4 shadow-lg shadow-slate-950/30">
          <div className="mb-4">
            <label htmlFor="sales-search" className="mb-1 block text-xs text-slate-400">Search Sales</label>
            <input
              id="sales-search"
              type="text"
              value={salesSearch}
              onChange={(event) => setSalesSearch(event.target.value)}
              placeholder="Search by sale ID or item name"
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          {loadingSales ? (
            <p className="text-sm text-slate-400">Loading sales records...</p>
          ) : hasSalesError ? (
            <p className="text-sm text-rose-300">Unable to load sales records.</p>
          ) : salesRows.length === 0 ? (
            <p className="text-sm text-slate-400">No sales records available.</p>
          ) : filteredSalesRows.length === 0 ? (
            <p className="text-sm text-slate-400">No sales records match your search.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/75">
              <table className="w-full text-sm text-slate-100">
                <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Sold Date/Time (Local)</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Quantity</th>
                    <th className="px-4 py-3 text-left">Revenue (INR)</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalesRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono text-slate-300">{formatSoldAtDateTime(row.soldAt)}</td>
                      <td className="px-4 py-3">{row.itemName}</td>
                      <td className="px-4 py-3">{row.quantitySold}</td>
                      <td className="px-4 py-3">₹{row.revenueINR.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={row.approvalStatus === 'pending_approval' ? 'warning' : row.approvalStatus === 'approved' ? 'success' : 'info'}>
                          {row.approvalStatus}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {latestDraft && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-200 shadow-lg shadow-slate-950/30">
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
                  <button
                    type="button"
                    onClick={() => openSaleEditor(latestDraft)}
                    className="rounded border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                  >
                    Edit Draft
                  </button>
                  <button
                    type="button"
                    disabled={submittingSale}
                    onClick={() => submitSaleForApproval({ id: latestDraft.id })}
                    className="rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Send for Approval
                  </button>
                </div>
              ) : latestDraft.approvalStatus === 'approved' ? (
                <span className="text-xs text-slate-500">Locked after approval</span>
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
            <button
              type="button"
              onClick={closeModal}
              className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSubmitting}
              className="rounded bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        {editTarget?.type === 'sale' ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Item ID</label>
              <input
                type="text"
                value={saleForm.inventoryItemId ?? ''}
                onChange={(event) => setSaleForm((prev) => ({ ...prev, inventoryItemId: event.target.value }))}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Quantity Sold</label>
                <input
                  type="number"
                  min={0}
                  value={saleForm.quantitySold ?? 0}
                  onChange={(event) => setSaleForm((prev) => ({ ...prev, quantitySold: Number(event.target.value) }))}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Revenue (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={editTarget.value.revenueINR}
                  readOnly
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Sold Date</label>
              <input
                type="date"
                value={(saleForm.soldAt ?? '').slice(0, 10)}
                onChange={(event) => setSaleForm((prev) => ({ ...prev, soldAt: new Date(event.target.value).toISOString() }))}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
        ) : editTarget?.type === 'price' ? (
          <div>
            <label className="mb-1 block text-xs text-slate-400">Standard Price (INR)</label>
            <input
              type="number"
              min={0}
              value={priceForm}
              onChange={(event) => setPriceForm(Number(event.target.value))}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
