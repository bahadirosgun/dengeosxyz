import { createFileRoute } from "@tanstack/react-router";
import { InsightsScreen } from "@/components/InsightsScreen";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/icgoruler")({
  head: () => ({
    meta: [
      { title: "İçgörüler — DengeOS" },
      { name: "description", content: "Tutarlılığını ve nazik desenleri gör. Sayılar yargılamak için değil, tanımak için." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <InsightsScreen />
      <BottomNav />
    </div>
  );
}