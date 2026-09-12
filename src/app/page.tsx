import { ContagionView } from "@/components/contagion/ContagionView";
import { loadReport } from "@/lib/loadReport";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; report?: string }>;
}) {
  const params = await searchParams;
  // Default to the fixture so the UI always renders, even before agents exist.
  const report = await loadReport({ fixture: params.fixture !== "0", reportId: params.report });
  return <ContagionView report={report} />;
}
