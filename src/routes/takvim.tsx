import { createFileRoute } from "@tanstack/react-router";
import { CalendarScreen } from "@/components/CalendarScreen";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/takvim")({
  head: () => ({
    meta: [
      { title: "Takvim — DengeOS" },
      { name: "description", content: "Aylık zincir görünümü: tamamlanan, duraklatılan ve atlanan günleri tek bakışta gör." },
      { property: "og:title", content: "Takvim — DengeOS" },
      { property: "og:description", content: "Zincirini koparma — kendine nazik kal." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <CalendarScreen />
      <BottomNav />
    </div>
  );
}