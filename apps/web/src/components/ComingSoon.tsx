export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-4 text-black/70 dark:text-white/70">{description}</p>
      <p className="mt-2 text-sm text-black/50 dark:text-white/50">Coming soon.</p>
    </div>
  );
}
