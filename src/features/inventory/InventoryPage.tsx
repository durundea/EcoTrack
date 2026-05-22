import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { KpiCard } from '../../shared/ui/KpiCard';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { PageHeader } from '../../shared/ui/PageHeader';
import { CrudActions } from '../../shared/ui/CrudActions';
import { Modal } from '../../shared/ui/Modal';
import type { InventoryItem, SaleRecord } from '../../shared/api/contracts';
import { getSession } from '../auth/sessionStore';

type EditTarget =
  | { type: 'item'; value: InventoryItem }
  | { type: 'sale'; value: SaleRecord }
  | { type: 'price'; value: InventoryItem }
  | null;

const SALE_STATUS_VARIANT: Record<SaleRecord['approvalStatus'], 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'info',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export function InventoryPage() {
  const queryClient = useQueryClient();
  const user = useMemo(() => getSession(), []);
  const isAdmin = user?.role === 'admin';

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: () => api.inventory.getItems(),
  });
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ['inventory', 'sales'],
    queryFn: () => api.inventory.getSales(),
  });

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({});
  const [saleForm, setSaleForm] = useState<Partial<SaleRecord>>({});
  const [priceForm, setPriceForm] = useState<number>(0);
  const [createSaleForm, setCreateSaleForm] = useState({
    inventoryItemId: '',
    quantitySold: 1,
    soldAt: new Date().toISOString().slice(0, 10),
  });

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    queryClient.invalidateQueries({ queryKey: ['inventory', 'sales'] });
    queryClient.invalidateQueries({ queryKey: ['inventory', 'sales', 'pending'] });
  };

  const { mutate: updateItem, isPending: updatingItem } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<InventoryItem, 'id'>> }) =>
      api.inventory.updateItem(id, payload),
    onSuccess: invalidateInventory,
  });

  const { mutate: updateItemPrice, isPending: updatingPrice } = useMutation({
    mutationFn: ({ id, standardPriceINR }: { id: string; standardPriceINR: number }) =>
      api.inventory.updateItemPrice(id, standardPriceINR, {
        actorRole: isAdmin ? 'admin' : 'collector',
        actorUserId: user?.id ?? 'anonymous',
      }),
    onSuccess: invalidateInventory,
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: (id: string) => api.inventory.deleteItem(id),
    onSuccess: invalidateInventory,
  });

  const { mutate: updateSale, isPending: updatingSale } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<SaleRecord, 'id'>> }) =>
      api.inventory.updateSale(id, payload, {
        actorRole: isAdmin ? 'admin' : 'collector',
        actorUserId: user?.id ?? 'anonymous',
      }),
    onSuccess: invalidateInventory,
  });

  const { mutate: deleteSale } = useMutation({
    mutationFn: (id: string) =>
      api.inventory.deleteSale(id, {
        actorRole: isAdmin ? 'admin' : 'collector',
        actorUserId: user?.id ?? 'anonymous',
      }),
    onSuccess: invalidateInventory,
  });

  const { mutate: createSaleDraft, isPending: creatingSaleDraft } = useMutation({
    mutationFn: (input: { inventoryItemId: string; quantitySold: number; soldAt: string; requestedByUserId: string }) =>
      api.inventory.createSaleDraft(input),
    onSuccess: invalidateInventory,
  });

  const { mutate: submitSaleForApproval, isPending: submittingSale } = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.inventory.submitSaleForApproval(id, {
        actorRole: isAdmin ? 'admin' : 'collector',
        actorUserId: user?.id ?? 'anonymous',
      }),
    onSuccess: invalidateInventory,
  });

  const isSubmitting = updatingItem || updatingSale || updatingPrice;

  function openItemEditor(item: InventoryItem) {
    setItemForm(item);
    setEditTarget({ type: 'item', value: item });
  }

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

    if (editTarget.type === 'item') {
      updateItem(
        {
          id: editTarget.value.id,
          payload: {
            name: itemForm.name,
            category: itemForm.category,
            quantityKg: itemForm.quantityKg,
            unit: itemForm.unit,
          },
        },
        { onSuccess: closeModal }
      );
      return;
    }

    if (editTarget.type === 'sale') {
      updateSale(
        {
          id: editTarget.value.id,
          payload: {
            inventoryItemId: saleForm.inventoryItemId,
            quantitySold: saleForm.quantitySold,
            revenueINR: saleForm.revenueINR,
            soldAt: saleForm.soldAt,
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
    if (!user) return;
    createSaleDraft({
      ...createSaleForm,
      requestedByUserId: user.id,
    });
  }

  function canManageSale(sale: SaleRecord) {
    if (!user) return false;
    if (isAdmin) return sale.approvalStatus !== 'approved';
    return sale.requestedByUserId === user.id && sale.approvalStatus !== 'approved';
  }

  const modalTitle = useMemo(() => {
    if (!editTarget) return '';
    if (editTarget.type === 'item') return `Edit Item ${editTarget.value.id}`;
    if (editTarget.type === 'sale') return `Edit Sale ${editTarget.value.id}`;
    return `Update Standard Price ${editTarget.value.id}`;
  }, [editTarget]);

  const totalRevenue = sales?.reduce((sum, sale) => sum + sale.revenueINR, 0) ?? 0;
  const recycledProducts = (items ?? []).filter((item) => item.category === 'recycled-product');
  const rawWasteItems = (items ?? []).filter((item) => item.category === 'raw-waste');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory"
        subtitle="Track stock, standard prices, and sales approvals in one operational view."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Recycled Products" value={`${recycledProducts.length}`} />
        <KpiCard label="Raw Waste Entries" value={`${rawWasteItems.length}`} />
        <KpiCard label="Pending Approvals" value={`${(sales ?? []).filter((sale) => sale.approvalStatus === 'pending_approval').length}`} />
        <KpiCard label="Revenue (INR)" value={`₹${totalRevenue.toLocaleString('en-IN')}`} />
      </div>

      {!isAdmin && <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg shadow-slate-950/30">
        <h2 className="mb-3 text-lg font-medium">Create Sale Draft</h2>
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
                  {item.id} | {item.name}
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
              value={createSaleForm.soldAt}
              onChange={(event) =>
                setCreateSaleForm((prev) => ({
                  ...prev,
                  soldAt: event.target.value,
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
      </div>}

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
                          <CrudActions
                            onEdit={() => openItemEditor(item)}
                            onDelete={() => {
                              if (!window.confirm(`Delete item ${item.id}?`)) return;
                              deleteItem(item.id);
                            }}
                          />
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
        {loadingSales ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/75 shadow-lg shadow-slate-950/30">
            <table className="w-full text-sm text-slate-100">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Sale ID</th>
                  <th className="px-4 py-3 text-left">Item ID</th>
                  <th className="px-4 py-3 text-left">Qty Sold</th>
                  <th className="px-4 py-3 text-left">Revenue (INR)</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Approval</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(sales ?? []).map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-slate-400">{sale.id}</td>
                    <td className="px-4 py-3">{sale.inventoryItemId}</td>
                    <td className="px-4 py-3">{sale.quantitySold}</td>
                    <td className="px-4 py-3">₹{sale.revenueINR.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{new Date(sale.soldAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={SALE_STATUS_VARIANT[sale.approvalStatus]}>{sale.approvalStatus}</StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {sale.approvalStatus === 'draft' && canManageSale(sale) && (
                          <button
                            type="button"
                            disabled={submittingSale}
                            onClick={() => submitSaleForApproval({ id: sale.id })}
                            className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Send for Approval
                          </button>
                        )}
                        {sale.approvalStatus === 'approved' ? (
                          <span className="text-xs text-slate-500">Locked after approval</span>
                        ) : canManageSale(sale) ? (
                          <CrudActions
                            onEdit={() => openSaleEditor(sale)}
                            onDelete={() => {
                              if (!window.confirm(`Delete sale ${sale.id}?`)) return;
                              deleteSale(sale.id);
                            }}
                          />
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
        {editTarget?.type === 'item' ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Item Name</label>
              <input
                type="text"
                value={itemForm.name ?? ''}
                onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Category</label>
                <select
                  value={itemForm.category ?? 'raw-waste'}
                  onChange={(event) =>
                    setItemForm((prev) => ({ ...prev, category: event.target.value as InventoryItem['category'] }))
                  }
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="raw-waste">raw-waste</option>
                  <option value="recycled-product">recycled-product</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Unit</label>
                <select
                  value={itemForm.unit ?? 'kg'}
                  onChange={(event) =>
                    setItemForm((prev) => ({ ...prev, unit: event.target.value as InventoryItem['unit'] }))
                  }
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="kg">kg</option>
                  <option value="units">units</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Quantity</label>
              <input
                type="number"
                min={0}
                value={itemForm.quantityKg ?? 0}
                onChange={(event) => setItemForm((prev) => ({ ...prev, quantityKg: Number(event.target.value) }))}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
        ) : editTarget?.type === 'sale' ? (
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
                  value={saleForm.revenueINR ?? 0}
                  onChange={(event) => setSaleForm((prev) => ({ ...prev, revenueINR: Number(event.target.value) }))}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Sold Date</label>
              <input
                type="date"
                value={(saleForm.soldAt ?? '').slice(0, 10)}
                onChange={(event) => setSaleForm((prev) => ({ ...prev, soldAt: event.target.value }))}
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
