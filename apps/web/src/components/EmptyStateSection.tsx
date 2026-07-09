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
      {description && (
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">{description}</p>
      )}
      <div className="mt-4 rounded-lg border border-dashed border-black/15 p-6 text-sm text-black/50 dark:border-white/20 dark:text-white/50">
        {emptyMessage}
      </div>
    </section>
  );
}
