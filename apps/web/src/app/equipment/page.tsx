import { EmptyStateSection } from "@/components/EmptyStateSection";

export default function EquipmentPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Equipment</h1>
      <p className="mt-2 text-black/70 dark:text-white/70">
        Equipment catalogue and technical specifications.
      </p>

      <EmptyStateSection
        title="Equipment Catalogue"
        emptyMessage="No equipment listed yet."
      />
      <EmptyStateSection
        title="Technical Specifications"
        emptyMessage="No specifications published yet."
      />

      <section className="mt-10 rounded-lg bg-black/[.03] p-4 text-sm text-black/50 dark:bg-white/[.05] dark:text-white/50">
        Technical guidelines and an RFP module are planned for a later
        phase — see the roadmap.
      </section>
    </div>
  );
}
