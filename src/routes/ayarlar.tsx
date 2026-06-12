import { createFileRoute } from "@tanstack/react-router";
import { SettingsScreen } from "@/components/SettingsScreen";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/ayarlar")({
  head: () => ({
    meta: [
      { title: "Ayarlar — DengeOS" },
      { name: "description", content: "Verilerin, sorumluluk notu ve uygulama bilgileri." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <SettingsScreen />
      <BottomNav />
    </div>
  );
}