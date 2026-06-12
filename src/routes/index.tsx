import { createFileRoute } from "@tanstack/react-router";
import { TodayScreen } from "@/components/TodayScreen";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DengeOS — Sakin, Dengeli Sağlık" },
      { name: "description", content: "Sürdürülebilir alışkanlıklar, hareket, beslenme ve dinginlik için sakin bir dijital alan." },
      { property: "og:title", content: "DengeOS — Sakin, Dengeli Sağlık" },
      { property: "og:description", content: "Küçük adımlar, kısıtlama yok. Kaçırdığın bir gün ilerlemeni silmez." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <TodayScreen />
      <BottomNav />
    </div>
  );
}
