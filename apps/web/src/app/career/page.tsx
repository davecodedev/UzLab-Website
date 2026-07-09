import { EmptyStateSection } from "@/components/EmptyStateSection";

export default function CareerPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Career</h1>
      <p className="mt-2 text-black/70 dark:text-white/70">
        Two independent sections — for job seekers browsing openings, and for
        employers posting vacancies.
      </p>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">Job Seekers</h2>
          <EmptyStateSection title="Open Vacancies" emptyMessage="No vacancies posted yet." />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Employers</h2>
          <EmptyStateSection
            title="Post a Vacancy"
            emptyMessage="Vacancy submission will be available here."
          />
          <EmptyStateSection title="Applications" emptyMessage="No applications yet." />
        </div>
      </div>
    </div>
  );
}
