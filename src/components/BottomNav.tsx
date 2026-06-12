import { Calendar as CalendarIcon, Compass, Home, LineChart, Wand2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Item = {
  icon: typeof Home;
  label: string;
  to: "/" | "/kesfet" | "/takvim" | "/icgoruler" | "/araclar";
};

export function BottomNav() {
  const items: Item[] = [
    { icon: Home, label: "Bugün", to: "/" },
    { icon: Compass, label: "Keşfet", to: "/kesfet" },
    { icon: CalendarIcon, label: "Takvim", to: "/takvim" },
    { icon: LineChart, label: "Rapor", to: "/icgoruler" },
    { icon: Wand2, label: "Araçlar", to: "/araclar" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 py-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              to={it.to}
              activeOptions={{ exact: it.to === "/" }}
              className="flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1.5 text-[10px] text-muted-foreground transition active:scale-[0.98]"
              activeProps={{ className: "bg-sage-soft text-primary" }}
            >
              <Icon size={20} strokeWidth={2} />
              <span className="w-full truncate text-center font-medium">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
