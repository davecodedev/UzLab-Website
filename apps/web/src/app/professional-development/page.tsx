import { EmptyStateSection } from "@/components/EmptyStateSection";

export default function ProfessionalDevelopmentPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Professional Development</h1>
      <p className="mt-2 text-black/70 dark:text-white/70">
        Courses and workshops offered to members and the wider industry.
      </p>

      <EmptyStateSection
        title="Courses"
        emptyMessage="No courses listed yet."
      />
      <EmptyStateSection
        title="Workshops & Seminars"
        emptyMessage="No workshops or seminars listed yet."
      />

      <section className="mt-10 rounded-lg bg-black/[.03] p-4 text-sm text-black/50 dark:bg-white/[.05] dark:text-white/50">
        Certifications, exams, and a full event calendar are planned for a
        later phase — see the roadmap.
      </section>
    </div>
  );
}
