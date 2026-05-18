type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
};

export function CrudActions({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: Props) {
  if (!onEdit && !onDelete) {
    return <span className="text-xs text-slate-500">No actions</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded border border-sky-700/60 bg-sky-900/20 px-2.5 py-1 text-xs font-medium text-sky-200 hover:bg-sky-900/40"
        >
          {editLabel}
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-rose-700/60 bg-rose-900/20 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-900/40"
        >
          {deleteLabel}
        </button>
      ) : null}
    </div>
  );
}
