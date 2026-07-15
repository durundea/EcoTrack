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
        className="radius-full inline-flex h-6 w-6 items-center justify-center border border-[var(--border-subtle)] bg-[var(--surface-panel-hover)] text-[11px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-panel)]"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        i
      </button>
      {isOpen ? (
        <div className="radius-lg absolute left-1/2 top-8 z-20 w-80 -translate-x-1/2 border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4 text-xs text-[var(--text-primary)] shadow-xl before:absolute before:-top-1 before:left-1/2 before:h-2 before:w-2 before:-translate-x-1/2 before:rotate-45 before:border-l before:border-t before:border-[var(--border-subtle)] before:bg-[var(--surface-panel)]">
          <p className="mb-2 font-semibold text-[var(--text-primary)]">Assignment History</p>
          {isLoading ? (
            <p className="text-[var(--text-muted)]">Loading history...</p>
          ) : summaryLines.length === 0 ? (
            <p className="text-[var(--text-muted)]">No assignment history yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {summaryLines.map((line, index) => (
                <li key={`${pickupId}-${index}`} className="leading-relaxed text-[var(--text-muted)]">
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