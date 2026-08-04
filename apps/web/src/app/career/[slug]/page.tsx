import { VacancyDetail } from "@/components/careers/VacancyDetail";

/**
 * One vacancy, with the form to apply to it.
 *
 * A page of its own rather than a panel on the careers page: a job advert is
 * the thing people are sent a link to, and it has to survive being shared.
 */
export default async function VacancyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <VacancyDetail slug={slug} />;
}
