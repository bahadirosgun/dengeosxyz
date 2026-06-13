import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wind,
  BookHeart,
  ChevronRight,
  Settings as SettingsIcon,
  UtensilsCrossed,
  CalendarClock,
  Activity,
  Scale,
  Images,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/araclar/")({
  head: () => ({
    meta: [
      { title: "Araçlar — DengeOS" },
      {
        name: "description",
        content: "Rehberli nefes ve 1 dakikalık günlük gibi nazik araçlarla bir an ara ver.",
      },
      { property: "og:title", content: "Araçlar — DengeOS" },
      { property: "og:description", content: "Küçük molalar, büyük fark yaratır." },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  const groups = [
    {
      title: "Günü kur",
      items: [
        {
          to: "/araclar/program" as const,
          icon: CalendarClock,
          title: "Program",
          desc: "Alışkanlıklarını ve molalarını saate yerleştir.",
          color: "bg-sky-soft",
        },
        {
          to: "/araclar/yemek" as const,
          icon: UtensilsCrossed,
          title: "Yemek",
          desc: "Evdeki malzemelerle dengeli tarif bul.",
          color: "bg-accent",
        },
        {
          to: "/gunce" as const,
          icon: Images,
          title: "Günce",
          desc: "Yolculuğunu fotoğraf ve notlarla sakla.",
          color: "bg-sage-soft",
        },
      ],
    },
    {
      title: "Sakinleş",
      items: [
        {
          to: "/araclar/nefes" as const,
          icon: Wind,
          title: "Rehberli nefes",
          desc: "4-7-8 veya kutu nefesiyle ritmini yavaşlat.",
          color: "bg-sky-soft",
        },
        {
          to: "/araclar/gunluk" as const,
          icon: BookHeart,
          title: "1 dakikalık günlük",
          desc: "Bir soru, bir cümle, biraz açıklık.",
          color: "bg-sage-soft",
        },
      ],
    },
    {
      title: "Takip et",
      items: [
        {
          to: "/araclar/hareket" as const,
          icon: Activity,
          title: "Hareket",
          desc: "Adım, yürüyüş ve aktif dakikaları gör.",
          color: "bg-sage-soft",
        },
        {
          to: "/araclar/tarti" as const,
          icon: Scale,
          title: "Ölçüm",
          desc: "Tek sayıya değil, nazik eğilime bak.",
          color: "bg-earth-soft",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Araçlar</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Yoğun bir andayken bir nefes, bir cümle bile çok şey değiştirir.
            </p>
          </div>
          <Link
            to="/ayarlar"
            aria-label="Ayarlar"
            className="mt-1 rounded-full bg-card p-2.5 text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            <SettingsIcon size={18} />
          </Link>
        </header>
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-foreground">{group.title}</h2>
              <div className="space-y-2">
                {group.items.map((t) => {
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.to}
                      to={t.to}
                      className="flex items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-border transition hover:bg-muted active:scale-[0.99]"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${t.color}`}
                      >
                        <Icon size={22} className="text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-foreground">{t.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
