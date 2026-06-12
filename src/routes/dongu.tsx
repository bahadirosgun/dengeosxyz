import { createFileRoute } from "@tanstack/react-router";
import { CycleScreen } from "@/components/CycleScreen";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/dongu")({
  head: () => ({
    meta: [
      { title: "Döngü — DengeOS" },
      { name: "description", content: "Adet döngünü nazikçe takip et: faz, gün ve fazına özel sevecen ipuçları." },
      { property: "og:title", content: "Döngü — DengeOS" },
      { property: "og:description", content: "Bir reçete değil, farkındalık aracı." },
    ],
  }),
  component: CyclePage,
});

function CyclePage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <CycleScreen />
      <BottomNav />
    </div>
  );
}