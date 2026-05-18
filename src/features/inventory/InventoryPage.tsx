import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export function InventoryPage() {
  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: () => api.inventory.getItems(),
  });
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ['inventory', 'sales'],
    queryFn: () => api.inventory.getSales(),
  });

  const totalRevenue = sales?.reduce((sum, s) => sum + s.revenueINR, 0) ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Inventory</h1>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Total Items</p>
          <p className="mt-1 text-2xl font-bold">{items?.length ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Total Sales</p>
          <p className="mt-1 text-2xl font-bold">{sales?.length ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Revenue (INR)</p>
          <p className="mt-1 text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Inventory table */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Stock Ledger</h2>
        {loadingItems ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm text-slate-100">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Quantity</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-slate-400">{item.id}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.category === 'recycled-product' ? 'bg-green-700 text-green-100' : 'bg-slate-700 text-slate-300'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.quantityKg}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales records */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Sales Records</h2>
        {loadingSales ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm text-slate-100">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Sale ID</th>
                  <th className="px-4 py-3 text-left">Item ID</th>
                  <th className="px-4 py-3 text-left">Qty Sold</th>
                  <th className="px-4 py-3 text-left">Revenue (INR)</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {sales?.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-slate-400">{sale.id}</td>
                    <td className="px-4 py-3">{sale.inventoryItemId}</td>
                    <td className="px-4 py-3">{sale.quantitySold}</td>
                    <td className="px-4 py-3">₹{sale.revenueINR.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{new Date(sale.soldAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
