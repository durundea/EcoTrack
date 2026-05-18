type Props = {
  label: string;
  value: string;
  sub?: string;
};

export function KpiCard({ label, value, sub }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/30">
      <p className="text-xs uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-100">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}
