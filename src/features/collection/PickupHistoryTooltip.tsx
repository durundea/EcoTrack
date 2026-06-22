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
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-700 bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        i
      </button>
      {isOpen ? (
        <div className="absolute left-0 top-7 z-20 w-96 rounded-md border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 shadow-lg">
          <p className="mb-2 font-semibold text-slate-300">Assignment history</p>
          {isLoading ? (
            <p className="text-slate-400">Loading history...</p>
          ) : summaryLines.length === 0 ? (
            <p className="text-slate-400">No assignment history yet.</p>
          ) : (
            <ul className="space-y-1">
              {summaryLines.map((line, index) => (
                <li key={`${pickupId}-${index}`} className="leading-5 text-slate-200">
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