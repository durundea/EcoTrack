import type { PickupAssignmentEventDto } from '../../shared/api/contracts';

function formatTimestamp(utcValue: string): string {
  const date = new Date(utcValue);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString();
}

export function formatAssignmentHistorySummary(events: PickupAssignmentEventDto[]): string[] {
  return (events ?? []).map((event) => {
    const changedBy = event.changedByDisplayName?.trim() || event.changedByUserId?.trim() || 'Unknown user';
    const note = event.note?.trim() || 'No note provided';
    const when = formatTimestamp(event.changedAtUtc);
    return `Changed by ${changedBy} at ${when} - ${note}`;
  });
}