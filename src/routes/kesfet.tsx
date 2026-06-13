import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BookHeart,
  CalendarClock,
  ChevronRight,
  Compass,
  HeartHandshake,
  Leaf,
  Moon,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  UtensilsCrossed,
  Wind,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { computeCycle, loadCycleForGender, PHASE_META } from "@/lib/cycle";
import { addHabit, loadState, saveState, type HabitCategory } from "@/lib/habits";
import { addEntry } from "@/lib/journal";
import { recordPhilosophyRitual } from "@/lib/philosophyRituals";
import { useGender } from "@/lib/useAppData";
import { toast } from "sonner";

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

        <IkigaiCompass />

        <PhilosophyDeck />

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

type PhilosophyCard = {
  id: string;
  origin: "Japon" | "Çin";
  title: string;
  subtitle: string;
  copy: string;
  story: string;
  includes: string[];
  steps: string[];
  habits: { name: string; category: HabitCategory; trigger?: string }[];
  journalPrompt: string;
  journalSeed: string;
  to: "/aliskanliklar" | "/araclar/hareket" | "/araclar/nefes" | "/araclar/program";
  cta: string;
  palette: "sage" | "sky" | "earth" | "blush" | "mint" | "ink";
  art: "steps" | "tea" | "forest" | "balance" | "water" | "breath";
};

const philosophyCards: PhilosophyCard[] = [
  {
    id: "kaizen",
    origin: "Japon",
    title: "Kaizen",
    subtitle: "Küçük adım, gerçek değişim",
    copy: "Bugün devrim değil, tekrar edilebilir minicik bir hareket yeter.",
    story:
      "Kaizen, bir dağın zirvesine bakıp yorulmak yerine önündeki ilk taşı seçer. DengeOS bunu günlük hayata çevirir: küçük, görünür, tekrar edilebilir.",
    includes: ["2 nazik alışkanlık", "1 eğer/o zaman tetikleyici", "Küçük başarı kutlaması"],
    steps: ["1 küçük hedef seç", "2 dakika başla", "Yarın aynı yerden dön"],
    habits: [
      { name: "2 dakikalık küçük adım", category: "Genel", trigger: "Sabah ilk içeceğimden sonra" },
      { name: "Bugün tek iyi seçim yap", category: "Genel", trigger: "Gün ortasında kısa mola verince" },
    ],
    journalPrompt: "Bugün hangi küçük adım yeterli olabilir?",
    journalSeed: "Bugün kendime küçük ama gerçekçi bir adım seçiyorum:",
    to: "/aliskanliklar",
    cta: "Alışkanlığa çevir",
    palette: "sage",
    art: "steps",
  },
  {
    id: "wabi-sabi",
    origin: "Japon",
    title: "Wabi-Sabi",
    subtitle: "Kusursuz olmak zorunda değilsin",
    copy: "Eksik kalan günler hikayeni bozmaz; ritim biraz yamuk da güzel olabilir.",
    story:
      "Wabi-Sabi, çatlağı saklamaz; orada hayatın izini görür. Bu kart, kaçırılan günleri başarısızlık değil geri dönüş alanı yapar.",
    includes: ["Şefkatli geri dönüş", "1 günlük sorusu", "Yargısız takip dili"],
    steps: ["Bugünü olduğu gibi gör", "Bir şeyi sadeleştir", "Kendine yumuşak dön"],
    habits: [
      { name: "Kendime yumuşak dönüş notu", category: "Stres", trigger: "Bir planım aksadığında" },
      { name: "Bugün bir şeyi sadeleştir", category: "Genel", trigger: "Akşam kapanışında" },
    ],
    journalPrompt: "Bugün kusursuz olmasa da değerli olan neydi?",
    journalSeed: "Bugün eksik kalan şeylere rağmen şunu fark ettim:",
    to: "/araclar/gunluk",
    cta: "Bir cümle yaz",
    palette: "earth",
    art: "tea",
  },
  {
    id: "shinrin-yoku",
    origin: "Japon",
    title: "Shinrin-Yoku",
    subtitle: "Doğayı içeri al",
    copy: "Dışarı çıkamasan bile gün ışığı, pencere ve yavaş nefes bedene sinyal verir.",
    story:
      "Shinrin-Yoku, ormanda hızlı yürümek değil; doğanın sesini, ışığını ve kokusunu fark etmektir. Şehirde bile küçük bir doğa teması bedenin ritmini yumuşatır.",
    includes: ["Dışarı/dışarı bakma ritmi", "Duyusal farkındalık", "Kısa yürüyüş niyeti"],
    steps: ["5 dakika dışarı bak", "Bir sesi fark et", "Yavaş yürüyüş ekle"],
    habits: [
      { name: "5 dk gün ışığı al", category: "Genel", trigger: "Öğleye yakın pencere gördüğümde" },
      { name: "10 dk yavaş yürüyüş", category: "Genel", trigger: "Hava uygunsa iş/ev çıkışında" },
    ],
    journalPrompt: "Bugün doğadan hangi küçük sinyali fark ettin?",
    journalSeed: "Bugün doğadan bana iyi gelen küçük şey:",
    to: "/araclar/hareket",
    cta: "Hareket seç",
    palette: "mint",
    art: "forest",
  },
  {
    id: "yin-yang",
    origin: "Çin",
    title: "Yin-Yang",
    subtitle: "Dinlenme ve hareket birlikte",
    copy: "Enerji bazen yükselir, bazen yavaşlar. Denge ikisini de hesaba katar.",
    story:
      "Yin-Yang, iki zıt kutbun kavgası değil; birbirini tamamlamasıdır. Bu kart güne hem hareket hem dinlenme koyarak tükenmeden ilerlemeyi hatırlatır.",
    includes: ["Aktif + sakin blok", "Enerji dengesi", "Akşam kapanışı"],
    steps: ["Bir aktif blok", "Bir sakin blok", "Akşam yavaş kapanış"],
    habits: [
      { name: "Bir aktif mola ver", category: "Genel", trigger: "Uzun süre oturduğumu fark edince" },
      { name: "Akşam yavaş kapanış yap", category: "Stres", trigger: "Uyumadan 30 dk önce" },
    ],
    journalPrompt: "Bugün hareket ve dinlenme dengen nasıldı?",
    journalSeed: "Bugün dengeye en çok ihtiyaç duyduğum alan:",
    to: "/araclar/program",
    cta: "Güne yerleştir",
    palette: "ink",
    art: "balance",
  },
  {
    id: "wu-wei",
    origin: "Çin",
    title: "Wu Wei",
    subtitle: "Zorlamadan akış",
    copy: "Bugün kendini itmek yerine, en az dirençli iyi seçimi bul.",
    story:
      "Wu Wei, hiçbir şey yapmamak değil; su gibi en doğal yolu bulmaktır. Bu kart hedefi küçültür, sürtünmeyi azaltır, başlamayı kolaylaştırır.",
    includes: ["En kolay ilk adım", "Süre küçültme", "Akışı bozmayan plan"],
    steps: ["En kolay adımı seç", "Süreyi küçült", "Akışı bozma"],
    habits: [
      { name: "En kolay iyi seçimi yap", category: "Genel", trigger: "Zorlandığımı fark ettiğimde" },
      { name: "5 dk sakin plan yap", category: "Stres", trigger: "Güne başlamadan önce" },
    ],
    journalPrompt: "Bugün hangi iyi seçim daha az zorlayıcı olurdu?",
    journalSeed: "Bugün kendimi itmeden yapabileceğim en küçük iyi seçim:",
    to: "/araclar/program",
    cta: "Yumuşak plan yap",
    palette: "sky",
    art: "water",
  },
  {
    id: "qi",
    origin: "Çin",
    title: "Qi",
    subtitle: "Nefesle ritim bul",
    copy: "Bazen en iyi başlangıç hareket değil; üç sakin nefesle bedene dönmektir.",
    story:
      "Qi, bedendeki canlılık ve nefes fikrinden ilham alır. DengeOS bunu tıbbi iddia gibi değil, bedene dönmek için sade bir nefes ritmi olarak kullanır.",
    includes: ["Kısa nefes ritmi", "Beden farkındalığı", "Stres sinyali yumuşatma"],
    steps: ["Omuzları bırak", "4 sayıda nefes al", "Yavaşça ver"],
    habits: [
      { name: "3 sakin nefes al", category: "Stres", trigger: "Telefonu elime aldığımda" },
      { name: "Bedenimde ne var diye sor", category: "Stres", trigger: "Gerginlik fark ettiğimde" },
    ],
    journalPrompt: "Şu an bedeninde ne hissediyorsun?",
    journalSeed: "Şu an bedenimde fark ettiğim şey:",
    to: "/araclar/nefes",
    cta: "Nefese geç",
    palette: "blush",
    art: "breath",
  },
];

function PhilosophyDeck() {
  return (
    <section className="mb-4">
      <div className="mb-3 px-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Leaf size={13} /> Felsefe kartları
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">
          Bugünün duygusunu seç
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Japon ve Çin düşüncesinden ilham alan küçük rehberler; bilgi değil, uygulanabilir ritim.
        </p>
      </div>
      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {philosophyCards.map((card) => (
          <PhilosophyPoster key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

function PhilosophyPoster({ card }: { card: PhilosophyCard }) {
  const palette = philosophyPalette[card.palette];
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setApplied(window.localStorage.getItem(`dengeos.philosophy.${card.id}`) === "applied");
  }, [card.id]);

  const applyCard = () => {
    const recorded = recordPhilosophyRitual({ id: card.id, title: card.title, origin: card.origin });
    if (!recorded.ok) {
      toast.info(`Bugün ${recorded.existing.title} günü seçildi. Yarın yeni bir kart seçebilirsin.`);
      return;
    }
    const current = loadState();
    const existing = new Set(current.habits.map((h) => h.name));
    const next = card.habits.reduce(
      (state, habit) => (existing.has(habit.name) ? state : addHabit(state, habit)),
      current,
    );
    saveState(next);
    addEntry(card.journalPrompt, card.journalSeed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`dengeos.philosophy.${card.id}`, "applied");
    }
    setApplied(true);
    toast.success(`${card.title} ritmi eklendi. Bugün ekranında seni bekliyor.`);
  };

  return (
    <article
      className={`w-[286px] shrink-0 snap-start overflow-hidden rounded-[32px] ${palette.bg} shadow-[0_18px_48px_rgba(46,74,56,0.12)] ring-1 ring-border`}
    >
      <div className="relative min-h-[360px] p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-foreground/70 ring-1 ring-white/80">
            {card.origin} felsefesi
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${palette.badge}`}>
            DengeOS
          </span>
        </div>
        <div className="mt-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/50">
            Günlük ritim kartı
          </p>
          <h3 className="mt-1 font-serif text-[38px] font-semibold leading-none tracking-[-0.04em] text-foreground">
            {card.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-foreground/75">{card.subtitle}</p>
        </div>

        <PhilosophyArt kind={card.art} tone={palette.tone} />

        <div className="mt-3 rounded-3xl bg-white/68 p-3 ring-1 ring-white/75">
          <p className="text-center text-xs font-semibold text-foreground">{card.copy}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-foreground/70">{card.story}</p>
        </div>

        <div className="mt-3 rounded-3xl bg-white/50 p-3 ring-1 ring-white/75">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">
            İçinde neler var?
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.includes.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/72 px-2.5 py-1 text-[10px] font-medium text-foreground/70 ring-1 ring-white/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {card.steps.map((step, index) => (
            <div key={step} className="min-h-[72px] rounded-2xl bg-white/60 p-2 ring-1 ring-white/75">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${palette.badge}`}>
                {index + 1}
              </span>
              <p className="mt-1.5 text-[10px] leading-snug text-foreground/70">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <button
            onClick={applyCard}
            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background"
          >
            {applied ? "Ritim eklendi" : "Bugüne uygula"}
          </button>
          <Link
            to={card.to}
            aria-label={card.cta}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-foreground ring-1 ring-white/80"
          >
            <ChevronRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}

const philosophyPalette = {
  sage: {
    bg: "bg-[#eef7ef]",
    badge: "bg-primary text-white",
    tone: "#7BA889",
  },
  sky: {
    bg: "bg-[#eef8fb]",
    badge: "bg-sky text-white",
    tone: "#7fb5c9",
  },
  earth: {
    bg: "bg-[#f7f1e9]",
    badge: "bg-earth text-white",
    tone: "#b99a74",
  },
  blush: {
    bg: "bg-[#fbf0ef]",
    badge: "bg-[#c9827e] text-white",
    tone: "#c9827e",
  },
  mint: {
    bg: "bg-[#edf8f3]",
    badge: "bg-[#6f9f83] text-white",
    tone: "#6f9f83",
  },
  ink: {
    bg: "bg-[#eef2f0]",
    badge: "bg-[#2E4A38] text-white",
    tone: "#2E4A38",
  },
};

function PhilosophyArt({ kind, tone }: { kind: PhilosophyCard["art"]; tone: string }) {
  if (kind === "steps") {
    return (
      <div className="relative mx-auto mt-4 h-[112px] w-[210px]" aria-hidden>
        <span className="absolute bottom-2 left-4 h-3 w-10 rounded-full bg-foreground/10" />
        <span className="absolute bottom-7 left-16 h-3 w-10 rounded-full bg-foreground/10" />
        <span className="absolute bottom-12 left-28 h-3 w-10 rounded-full bg-foreground/10" />
        <span className="absolute left-12 top-11 h-12 w-7 rounded-full bg-white shadow-[0_10px_18px_rgba(46,74,56,0.12)]" />
        <span className="absolute left-[58px] top-6 h-8 w-8 rounded-full" style={{ backgroundColor: tone }} />
        <span className="absolute left-[90px] top-20 h-9 w-16 rounded-[50%] border-[7px] border-white" style={{ borderTopColor: tone }} />
        <span className="absolute right-4 top-2 h-20 w-10 rounded-[100%_0_100%_0] bg-white/70" />
        <span className="absolute right-8 top-8 h-16 w-8 rounded-[100%_0_100%_0]" style={{ backgroundColor: tone }} />
      </div>
    );
  }
  if (kind === "tea") {
    return (
      <div className="relative mx-auto mt-4 h-[112px] w-[210px]" aria-hidden>
        <span className="absolute left-12 top-36 hidden" />
        <span className="absolute bottom-2 left-10 h-5 w-32 rounded-full bg-foreground/10" />
        <span className="absolute bottom-8 left-16 h-12 w-20 rounded-b-[36px] rounded-t-lg bg-white shadow-[0_14px_24px_rgba(46,74,56,0.12)] ring-1 ring-white/90" />
        <span className="absolute bottom-12 left-[130px] h-7 w-8 rounded-r-full border-[6px] border-white" />
        <span className="absolute left-[76px] top-1 h-8 w-1 rounded-full bg-foreground/15" />
        <span className="absolute left-[102px] top-0 h-9 w-1 rounded-full bg-foreground/15" />
        <span className="absolute right-8 top-12 h-14 w-7 rounded-[100%_0_100%_0]" style={{ backgroundColor: tone }} />
      </div>
    );
  }
  if (kind === "forest") {
    return (
      <div className="relative mx-auto mt-4 h-[112px] w-[210px]" aria-hidden>
        {[24, 70, 122, 166].map((left, i) => (
          <span key={left}>
            <span className="absolute bottom-2 h-20 w-2 rounded-full bg-foreground/20" style={{ left }} />
            <span
              className="absolute bottom-14 h-14 w-12 rounded-[60%_60%_45%_45%]"
              style={{ left: left - 20, backgroundColor: i % 2 ? "rgba(255,255,255,.72)" : tone }}
            />
          </span>
        ))}
        <span className="absolute bottom-0 left-8 h-4 w-36 rounded-full bg-foreground/10" />
        <span className="absolute bottom-7 left-[92px] h-8 w-8 rounded-full bg-white shadow-sm" />
      </div>
    );
  }
  if (kind === "balance") {
    return (
      <div className="relative mx-auto mt-4 grid h-[112px] w-[210px] place-items-center" aria-hidden>
        <span className="h-[94px] w-[94px] rounded-full bg-white shadow-[0_16px_32px_rgba(46,74,56,0.13)]" />
        <span className="absolute h-[94px] w-[47px] translate-x-[23.5px] rounded-r-full" style={{ backgroundColor: tone }} />
        <span className="absolute top-[23px] h-10 w-10 rounded-full bg-white" />
        <span className="absolute bottom-[23px] h-10 w-10 rounded-full" style={{ backgroundColor: tone }} />
        <span className="absolute left-6 top-2 h-20 w-8 rounded-[100%_0_100%_0] bg-white/65" />
        <span className="absolute right-8 bottom-3 h-16 w-7 rounded-[0_100%_0_100%]" style={{ backgroundColor: tone, opacity: 0.35 }} />
      </div>
    );
  }
  if (kind === "water") {
    return (
      <div className="relative mx-auto mt-4 h-[112px] w-[210px]" aria-hidden>
        <span className="absolute left-6 top-8 h-12 w-36 rounded-full border-[10px] border-white/80" style={{ borderTopColor: tone }} />
        <span className="absolute left-20 top-28 hidden" />
        <span className="absolute left-14 top-52 hidden" />
        <span className="absolute bottom-4 left-8 h-3 w-40 rounded-full bg-white/80" />
        <span className="absolute bottom-10 left-4 h-3 w-32 rounded-full" style={{ backgroundColor: tone, opacity: 0.35 }} />
        <span className="absolute right-12 top-3 h-20 w-9 rotate-12 rounded-[100%_0_100%_0] bg-white/65" />
      </div>
    );
  }
  return (
    <div className="relative mx-auto mt-4 grid h-[112px] w-[210px] place-items-center" aria-hidden>
      <span className="absolute h-24 w-24 animate-[breathe_4.8s_ease-in-out_infinite] rounded-full border-[14px] border-white/75" style={{ borderTopColor: tone }} />
      <span className="absolute h-14 w-14 rounded-full" style={{ backgroundColor: tone, opacity: 0.22 }} />
      <span className="absolute left-8 top-8 h-16 w-7 rounded-[100%_0_100%_0] bg-white/65" />
      <span className="absolute right-8 bottom-3 h-14 w-7 rounded-[0_100%_0_100%]" style={{ backgroundColor: tone, opacity: 0.42 }} />
    </div>
  );
}

type IkigaiAnswers = {
  joy: string;
  care: string;
  strength: string;
  rhythm: string;
};

const IKIGAI_STORAGE_KEY = "dengeos.ikigai.v1";

const ikigaiFields: {
  key: keyof IkigaiAnswers;
  label: string;
  prompt: string;
  hint: string;
}[] = [
  {
    key: "joy",
    label: "Bana canlılık veren",
    prompt: "Hangi küçük şeyleri yapınca içinden 'iyi ki' geçiyor?",
    hint: "Örn. yürüyüş, üretmek, kahve molası, sakin sabah",
  },
  {
    key: "care",
    label: "Dünyaya kattığım",
    prompt: "Kime, neye ya da hangi değere iyi gelmek istiyorsun?",
    hint: "Örn. ailem, öğrencilerim, ekibim, doğa, evim",
  },
  {
    key: "strength",
    label: "Bende doğal olan",
    prompt: "Zorlanmadan yaptığın, sende iyi çalışan taraf ne?",
    hint: "Örn. dinlemek, düzen kurmak, araştırmak, üretmek",
  },
  {
    key: "rhythm",
    label: "Sürdürebileceğim ritim",
    prompt: "Gerçek hayatında hangi küçük alışkanlık sana uyabilir?",
    hint: "Örn. 10 dk yürüyüş, akşam nefesi, haftalık hazırlık",
  },
];

function IkigaiCompass() {
  const [answers, setAnswers] = useState<IkigaiAnswers>({
    joy: "",
    care: "",
    strength: "",
    rhythm: "",
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(IKIGAI_STORAGE_KEY);
      if (raw) setAnswers({ ...answers, ...JSON.parse(raw) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(IKIGAI_STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const completed = ikigaiFields.filter((field) => answers[field.key].trim()).length;
  const pct = Math.round((completed / ikigaiFields.length) * 100);
  const insight = useMemo(() => makeIkigaiInsight(answers, completed), [answers, completed]);

  return (
    <section className="mb-4 overflow-hidden rounded-[32px] bg-white/80 shadow-[0_18px_44px_rgba(46,74,56,0.08)] ring-1 ring-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-[24px] bg-sage-soft">
          <svg className="absolute inset-2 -rotate-90" viewBox="0 0 44 44" aria-hidden>
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(46,74,56,0.12)" strokeWidth="5" />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${pct * 1.13} 113`}
            />
          </svg>
          <Compass size={22} className="text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-primary">Ikigai'den ilhamla</span>
          <span className="mt-0.5 block text-lg font-semibold tracking-tight text-foreground">
            Denge Pusulası
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Seni neyin canlı tuttuğunu bul; alışkanlıkların sadece görev değil, anlam taşısın.
          </span>
        </span>
        <ChevronRight
          size={18}
          className={`shrink-0 text-muted-foreground transition ${open ? "rotate-90" : ""}`}
        />
      </button>

      <div className="grid grid-cols-4 gap-1.5 px-4 pb-4">
        {ikigaiFields.map((field) => {
          const filled = answers[field.key].trim().length > 0;
          return (
            <span
              key={field.key}
              className={`h-2 rounded-full ${filled ? "bg-primary" : "bg-muted"}`}
              aria-label={field.label}
            />
          );
        })}
      </div>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            {ikigaiFields.map((field, index) => (
              <label
                key={field.key}
                className={`min-h-[186px] rounded-[26px] p-3 ring-1 ring-border ${
                  index % 2 === 0 ? "bg-sage-soft" : "bg-background"
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  {index === 0 || index === 2 ? <HeartHandshake size={13} /> : <Target size={13} />}
                  {field.label}
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                  {field.prompt}
                </span>
                <textarea
                  value={answers[field.key]}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.hint}
                  rows={4}
                  className="mt-2 min-h-[88px] w-full resize-none rounded-2xl border border-border bg-white/80 px-3 py-2 text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/45 focus:border-primary"
                />
              </label>
            ))}
          </div>

          <div className="mt-3 rounded-[26px] bg-card p-4 ring-1 ring-border">
            <p className="text-sm font-semibold text-foreground">{insight.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.copy}</p>
            {completed === 4 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  to="/aliskanliklar"
                  className="rounded-2xl bg-primary px-3 py-2.5 text-center text-xs font-medium text-primary-foreground"
                >
                  Ritme çevir
                </Link>
                <Link
                  to="/araclar/program"
                  className="rounded-2xl bg-sage-soft px-3 py-2.5 text-center text-xs font-medium text-foreground ring-1 ring-border"
                >
                  Güne yerleştir
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function makeIkigaiInsight(answers: IkigaiAnswers, completed: number) {
  if (completed === 0) {
    return {
      title: "Kendini çözmek için acele yok.",
      copy:
        "Bir kutuya tek kelime bile yazman yeter. Bu pusula performans değil; yönünü hatırlama alanı.",
    };
  }
  if (completed < 4) {
    return {
      title: `${completed}/4 alan doldu.`,
      copy:
        "Biraz daha netleştikçe DengeOS alışkanlıklarını görev gibi değil, sana ait bir ritim gibi kurmana yardım eder.",
    };
  }
  const rhythm = answers.rhythm.trim();
  const joy = answers.joy.trim();
  return {
    title: "Pusulan hazır.",
    copy: `${rhythm || "Seçtiğin küçük ritim"}, ${joy || "sana canlılık veren şeylerle"} bağ kurunca sürdürülebilir hale gelir. Şimdi bunu küçük bir alışkanlığa veya günlük programa çevirebilirsin.`,
  };
}
