import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { BreathingTool } from "@/components/BreathingTool";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/araclar/nefes")({
  head: () => ({
    meta: [
      { title: "Rehberli Nefes — DengeOS" },
      { name: "description", content: "4-7-8 ve kutu nefesi ile birkaç dakikalık nazik bir mola." },
    ],
  }),
  component: BreathPage,
});

function BreathPage() {
  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="mx-auto max-w-md px-5 pt-6">
        <Link
          to="/araclar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> Araçlar
        </Link>
        <BreathingTool />
      </div>
      <BottomNav />
    </div>
  );
}