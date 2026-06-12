import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { JournalTool } from "@/components/JournalTool";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/araclar/gunluk")({
  head: () => ({
    meta: [
      { title: "1 Dakikalık Günlük — DengeOS" },
      { name: "description", content: "Günde tek bir nazik soruya kısa bir cevap. Geçmişin her zaman senin." },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-5 pt-6">
        <Link
          to="/araclar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> Araçlar
        </Link>
        <JournalTool />
      </div>
      <BottomNav />
    </div>
  );
}