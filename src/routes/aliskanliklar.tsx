import { createFileRoute } from "@tanstack/react-router";
import { HabitsScreen } from "@/components/HabitsScreen";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/aliskanliklar")({
  head: () => ({
    meta: [
      { title: "Alışkanlıklar — DengeOS" },
      { name: "description", content: "Alışkanlıklarını düzenle, yenilerini ekle ve 'eğer/o zaman' tetikleyicileri bağla." },
      { property: "og:title", content: "Alışkanlıklar — DengeOS" },
      { property: "og:description", content: "Kendi ritmine göre küçük alışkanlıklar tasarla." },
    ],
  }),
  component: HabitsPage,
});

function HabitsPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <HabitsScreen />
      <BottomNav />
    </div>
  );
}