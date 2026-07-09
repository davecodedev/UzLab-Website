export function EmptyStateSection({
  title,
  description,
  emptyMessage,
}: {
  title: string;
  description?: string;
  emptyMessage: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-sm text-muted">
        {emptyMessage}
      </div>
    </section>
  );
}
