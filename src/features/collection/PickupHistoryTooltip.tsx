import { useState } from 'react';
import { usePickupAssignmentHistory } from './useCollection';
import { formatAssignmentHistorySummary } from './historySummary';

type PickupHistoryTooltipProps = {
  pickupId: string;
};

export function PickupHistoryTooltip({ pickupId }: PickupHistoryTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = usePickupAssignmentHistory(pickupId, isOpen);
  const summaryLines = formatAssignmentHistorySummary(data ?? []);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`View assignment history for ${pickupId}`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-[11px] font-semibold text-slate-100 hover:bg-slate-600 hover:border-slate-500 transition-colors"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        i
      </button>
      {isOpen ? (
        <div className="absolute left-1/2 -translate-x-1/2 top-8 z-20 w-80 rounded-lg border border-slate-600 bg-slate-900 p-4 text-xs text-slate-100 shadow-xl before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:w-2 before:h-2 before:bg-slate-900 before:border-l before:border-t before:border-slate-600 before:rotate-45">
          <p className="mb-2 font-semibold text-slate-200">Assignment History</p>
          {isLoading ? (
            <p className="text-slate-400">Loading history...</p>
          ) : summaryLines.length === 0 ? (
            <p className="text-slate-400">No assignment history yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {summaryLines.map((line, index) => (
                <li key={`${pickupId}-${index}`} className="leading-relaxed text-slate-300">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </span>
  );
}