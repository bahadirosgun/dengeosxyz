import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BookHeart,
  CalendarClock,
  ChevronRight,
  Moon,
  Settings as SettingsIcon,
  Sparkles,
  UtensilsCrossed,
  Wind,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { computeCycle, loadCycleForGender, PHASE_META } from "@/lib/cycle";
import { useGender } from "@/lib/useAppData";

export const Route = createFileRoute("/kesfet")({
  head: () => ({
    meta: [
      { title: "Keşfet — DengeOS" },
      {
        name: "description",
        content: "Bugünkü ritmine uygun yemek, hareket, nefes ve günlük önerilerini keşfet.",
      },
      { property: "og:title", content: "Keşfet — DengeOS" },
      {
        property: "og:description",
        content: "Kısıtlama değil; küçük, uygulanabilir öneriler.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const gender = useGender();
  const cycle = loadCycleForGender();
  const cycleInfo = cycle ? computeCycle(cycle) : null;
  const phaseMeta = cycleInfo ? PHASE_META[cycleInfo.phase] : null;

  const suggestions = [
    {
      to: "/araclar/yemek" as const,
      icon: UtensilsCrossed,
      title: "Bugüne uygun yemek fikri",
      desc: phaseMeta
        ? `${phaseMeta.label} fazına göre dengeli bir tarif al.`
        : "Öğününe ve tercihine göre sürdürülebilir bir tarif al.",
      color: "bg-accent",
    },
    {
      to: "/araclar/program" as const,
      icon: CalendarClock,
      title: "Gününü yumuşakça planla",
      desc: "Alışkanlıklarını, dinlenmeyi ve hareketi gerçekçi saatlere yerleştir.",
      color: "bg-sky-soft",
    },
    {
      to: "/araclar/nefes" as const,
      icon: Wind,
      title: "5 dakikalık nefes molası",
      desc: "Yoğunluğu azaltmak için kısa, yönlendirmeli bir seans başlat.",
      color: "bg-sage-soft",
    },
    {
      to: "/araclar/hareket" as const,
      icon: Activity,
      title: "Bugün nasıl hareket etsem?",
      desc: phaseMeta
        ? `${phaseMeta.label} enerjine uygun, zorlamayan hareket fikirleri.`
        : "Kısa yürüyüş veya aktif dakika kaydıyla günü hafiflet.",
      color: "bg-sage-soft",
    },
    {
      to: "/araclar/gunluk" as const,
      icon: BookHeart,
      title: "Bir cümlelik iç dökme",
      desc: "Bugün ne hissettiğini adlandır; uzun yazmak zorunda değilsin.",
      color: "bg-earth-soft",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-primary">Keşfet</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              Bugün ne iyi gelir?
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Kısa öneriler, derin menüler yok. İhtiyacın olanı seç ve devam et.
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

        {gender === "female" && phaseMeta && cycleInfo && (
          <Link to="/dongu" className={`mb-4 block rounded-3xl ${phaseMeta.color} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                  <Moon size={13} /> Döngü ritmi
                </p>
                <h2 className="mt-1 text-base font-semibold text-foreground">
                  {phaseMeta.label} fazı, {cycleInfo.dayOfCycle}. gün
                </h2>
                <p className="mt-0.5 text-xs text-foreground/75">{phaseMeta.tagline}</p>
              </div>
              <ChevronRight size={18} className="text-foreground/60" />
            </div>
          </Link>
        )}

        <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles size={15} className="text-primary" /> Nazik öneriler
          </p>
          <div className="mt-3 space-y-2">
            {suggestions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-border transition hover:bg-muted active:scale-[0.99]"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <Icon size={18} className="text-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{item.title}</span>
                    <span className="block text-[11px] leading-relaxed text-muted-foreground">
                      {item.desc}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-3xl bg-sage-soft p-5">
          <h2 className="text-sm font-semibold text-foreground">Küçük seçim kuralı</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            Bugün yalnızca bir şey seçmen yeterli: bir nefes, bir yürüyüş, bir tabak ya da bir
            cümle. Denge böyle kuruluyor.
          </p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
