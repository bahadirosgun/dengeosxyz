import { useMemo, useState } from "react";
import { ChevronRight, Check, Leaf, Sparkles, Wind } from "lucide-react";
import {
  type AppState,
  type HabitCategory,
  HABIT_SUGGESTIONS,
  markOnboarded,
  replaceHabits,
  saveState,
} from "@/lib/habits";
import { saveCycle } from "@/lib/cycle";
import {
  persistGender,
  persistOnboardingComplete,
  persistPersonalProfile,
  type Gender,
} from "@/lib/appData";
import { habitCategoryLabel } from "@/lib/categoryLabels";

const categoryStyles: Record<HabitCategory, string> = {
  Kilo: "bg-sage-soft",
  Stres: "bg-sky-soft",
  Genel: "bg-earth-soft",
};

const goalOptions: {
  id: string;
  title: string;
  desc: string;
  category: HabitCategory;
}[] = [
  {
    id: "balanced-plate",
    title: "Öğünlerim daha dengeli olsun",
    desc: "Protein, sebze, su ve doygunluk odağı",
    category: "Kilo",
  },
  {
    id: "steady-energy",
    title: "Gün içinde enerjim düşmesin",
    desc: "Daha düzenli yemek ve yürüyüş ritmi",
    category: "Kilo",
  },
  {
    id: "calm-evening",
    title: "Akşamları sakinleşmek istiyorum",
    desc: "Nefes, ekran molası ve yavaşlama",
    category: "Stres",
  },
  {
    id: "stress-reset",
    title: "Stresi daha erken fark edeyim",
    desc: "Kısa check-in ve beden sinyali takibi",
    category: "Stres",
  },
  {
    id: "water-rhythm",
    title: "Su içmeyi kolaylaştırayım",
    desc: "Küçük hatırlatmalar ve sade takip",
    category: "Genel",
  },
  {
    id: "sleep-care",
    title: "Uykuma daha iyi bakayım",
    desc: "Gece rutini ve telefon molası",
    category: "Genel",
  },
  {
    id: "move-gently",
    title: "Hareketi hayatıma yumuşakça katayım",
    desc: "Yürüyüş, esneme ve kısa aktif molalar",
    category: "Genel",
  },
  {
    id: "kind-consistency",
    title: "Kendime daha az yükleneyim",
    desc: "Kaçırınca geri dönmeyi kolaylaştıran ritim",
    category: "Stres",
  },
];

const onboardingStoryCards: {
  title: string;
  label: string;
  copy: string;
  items: string[];
  tone: "sage" | "sky" | "earth";
  icon: "leaf" | "spark" | "wind";
}[] = [
  {
    title: "Kaizen ile başla",
    label: "Küçük adım",
    copy: "Birden değişmek zorunda değilsin. DengeOS sana bugüne sığacak kadar küçük bir başlangıç çıkarır.",
    items: ["hazır alışkanlık", "tetikleyici", "kutlama"],
    tone: "sage",
    icon: "leaf",
  },
  {
    title: "Wabi-Sabi ile dön",
    label: "Şefkatli geri dönüş",
    copy: "Bir gün aksarsa hikaye bitmez. Sistem seni yargılamaz; kaldığın yerden dönmeni kolaylaştırır.",
    items: ["bağışlama jokeri", "yargısız dil", "günlük notu"],
    tone: "earth",
    icon: "spark",
  },
  {
    title: "Wu Wei ile ak",
    label: "Zorlamadan plan",
    copy: "Bugünkü enerjine göre nefes, yürüyüş, yemek ve program önerileri sade bir akışa dönüşür.",
    items: ["program", "hava ritmi", "nefes"],
    tone: "sky",
    icon: "wind",
  },
];

type Step = "welcome" | "story" | "gender" | "profile" | "categories" | "habits" | "cycle" | "done";

export function Onboarding({
  state,
  onComplete,
}: {
  state: AppState;
  onComplete: (next: AppState) => void;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [gender, setGender] = useState<Gender | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [initialWeightKg, setInitialWeightKg] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [goalIds, setGoalIds] = useState<string[]>(["balanced-plate", "calm-evening"]);
  const [picks, setPicks] = useState<{ name: string; category: HabitCategory }[]>([]);
  const [lastPeriod, setLastPeriod] = useState("");
  const [cycleLen, setCycleLen] = useState(28);
  const [skipCycle, setSkipCycle] = useState(false);

  const cats = useMemo(() => {
    const selected = goalOptions
      .filter((goal) => goalIds.includes(goal.id))
      .map((goal) => goal.category);
    return Array.from(new Set(selected));
  }, [goalIds]);

  const toggleGoal = (id: string) => {
    setGoalIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePick = (p: { name: string; category: HabitCategory }) => {
    setPicks((prev) =>
      prev.find((x) => x.name === p.name)
        ? prev.filter((x) => x.name !== p.name)
        : [...prev, p],
    );
  };

  const finish = () => {
    if (gender) persistGender(gender);
    const parsedHeight = parseDecimal(heightCm);
    const parsedWeight = parseDecimal(initialWeightKg);
    persistPersonalProfile({
      heightCm: parsedHeight && parsedHeight >= 100 && parsedHeight <= 240 ? parsedHeight : null,
      initialWeightKg:
        parsedWeight && parsedWeight >= 30 && parsedWeight <= 250 ? parsedWeight : null,
      birthDate: birthDate || null,
    });
    // For legacy users that already have habits, do NOT wipe them just
    // because they were sent back through onboarding for a gender choice.
    let next = state;
    if (state.habits.length === 0) {
      let effectivePicks = picks;
      if (effectivePicks.length === 0 && cats.length > 0) {
        effectivePicks = cats.flatMap((c) =>
          HABIT_SUGGESTIONS[c].slice(0, 2).map((name) => ({ name, category: c })),
        );
      }
      next = replaceHabits(state, effectivePicks);
      saveState(next);
    }
    if (gender === "female" && !skipCycle && lastPeriod && cycleLen >= 20 && cycleLen <= 45) {
      saveCycle({ lastPeriodStart: lastPeriod, cycleLength: cycleLen });
    }
    markOnboarded();
    persistOnboardingComplete(true);
    onComplete(next);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <Progress step={step} />

        <div className="flex-1 pt-6">
          {step === "welcome" && (
            <div>
              <div className="relative grid h-14 w-14 place-items-center rounded-[22px] bg-white shadow-[0_14px_34px_rgba(46,74,56,0.12)] ring-1 ring-white/80">
                <span className="absolute left-[25px] top-[13px] h-7 w-3.5 rotate-[18deg] rounded-[100%_0_100%_0] bg-primary" />
                <span className="absolute left-[16px] top-[25px] h-6 w-3.5 -rotate-[62deg] rounded-[100%_0_100%_0] bg-[var(--primary-dark)]" />
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-foreground">
                Bugün kendine biraz daha iyi davranarak başlayalım.
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                DengeOS, hayatını bir anda değiştirmeye zorlamaz. Sana iyi gelen
                küçük seçimleri fark etmene, sürdürmene ve kaçırdığın günlerde
                yeniden başlamana eşlik eder.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Kendini yorgun, dağınık ya da geç kalmış hissetsen de başlayacak bir yer var.",
                  "Burada hedef kusursuzluk değil; sana iyi gelen ritmi sakince bulmak.",
                  "Bir günü kaçırmak emeğini silmez. DengeOS seni suçlamaz, geri dönmeni kolaylaştırır.",
                  "Sayıların değil, kendine verdiğin emek görünür olur. Küçük adımlar da ilerlemedir.",
                ].map((line, index) => (
                  <li
                    key={line}
                    className="grid grid-cols-[34px_1fr] items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-sage-soft text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-foreground">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === "story" && (
            <div>
              <p className="text-xs font-medium text-primary">DengeOS nasıl çalışır?</p>
              <h2 className="mt-1 text-3xl font-semibold leading-[0.98] tracking-[-0.05em] text-foreground">
                Bir uygulamaya değil, kendi ritmine giriyorsun.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                DengeOS sana yapılacaklar listesi vermez. Bugünün enerjisini, beden sinyalini,
                hava durumunu ve seçtiğin felsefe kartlarını küçük eylemlere dönüştürür.
              </p>

              <div className="-mx-5 mt-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {onboardingStoryCards.map((card) => (
                  <StoryCard key={card.title} card={card} />
                ))}
              </div>

              <div className="mt-4 rounded-[28px] bg-card p-4 ring-1 ring-border">
                <p className="text-sm font-semibold text-foreground">
                  Akış böyle ilerler:
                </p>
                <div className="mt-3 grid gap-2">
                  {[
                    "Önce sana iyi gelen hedefleri seçersin.",
                    "DengeOS bunları alışkanlık, program, nefes ve günlük ritmine çevirir.",
                    "Kaçırdığın günlerde sistem seni suçlamaz; geri dönmeni kolaylaştırır.",
                  ].map((line, index) => (
                    <div key={line} className="grid grid-cols-[28px_1fr] gap-2 rounded-2xl bg-background p-3 ring-1 ring-border">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-sage-soft text-[11px] font-semibold text-primary">
                        {index + 1}
                      </span>
                      <p className="text-xs leading-relaxed text-foreground/80">{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "gender" && (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Kendini nasıl tanımlıyorsun?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                DengeOS deneyimini daha alakalı yapabilmemiz için bunu soruyoruz.
                İstediğin zaman ayarlardan değiştirebilirsin.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {([
                  { v: "female", label: "Kadın", desc: "Döngü ve faz önerileri açık" },
                  { v: "male", label: "Erkek", desc: "Genel sağlık ritmi" },
                ] as { v: Gender; label: string; desc: string }[]).map((o) => {
                  const selected = gender === o.v;
                  return (
                    <button
                      key={o.v}
                      onClick={() => setGender(o.v)}
                      className={`min-h-[136px] rounded-3xl p-5 text-left ring-1 transition ${
                        selected
                          ? "bg-sage-soft ring-primary"
                          : "bg-card ring-border"
                      }`}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-primary ring-1 ring-border">
                        {selected && <Check size={16} />}
                      </span>
                      <span className="mt-4 block text-base font-semibold text-foreground">
                        {o.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {o.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                Kadın seçilirse döngü takibi ve faza göre öneriler etkinleşir.
              </p>
            </div>
          )}

          {step === "profile" && (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Seni biraz tanıyalım.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Bunlar yargılamak için değil; hedefleri, önerileri ve kutlamaları sana
                daha uygun hissettirmek için. İstersen boş bırakabilirsin.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <label className="block rounded-3xl bg-card p-4 ring-1 ring-border">
                  <span className="text-xs font-medium text-muted-foreground">Boy</span>
                  <div className="mt-2 flex items-end gap-2">
                    <input
                      inputMode="decimal"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="165"
                      className="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/35"
                    />
                    <span className="pb-1 text-sm text-muted-foreground">cm</span>
                  </div>
                </label>
                <label className="block rounded-3xl bg-card p-4 ring-1 ring-border">
                  <span className="text-xs font-medium text-muted-foreground">
                    Başlangıç
                  </span>
                  <div className="mt-2 flex items-end gap-2">
                    <input
                      inputMode="decimal"
                      value={initialWeightKg}
                      onChange={(e) => setInitialWeightKg(e.target.value)}
                      placeholder="68"
                      className="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/35"
                    />
                    <span className="pb-1 text-sm text-muted-foreground">kg</span>
                  </div>
                </label>
              </div>
              <label className="mt-3 block rounded-3xl bg-card p-4 ring-1 ring-border">
                <span className="text-xs font-medium text-muted-foreground">
                  Doğum günü
                </span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-2 w-full bg-transparent text-base font-medium text-foreground outline-none"
                />
              </label>
              <div className="mt-4 rounded-3xl bg-sage-soft p-4 text-sm leading-relaxed text-foreground ring-1 ring-border">
                Başardığın hedeflerde seni nazikçe kutlarız. Doğum gününde de
                DengeOS senden küçük bir iyi dileği esirgemez.
              </div>
            </div>
          )}

          {step === "categories" && (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Şu sıralar neye alan açmak istersin?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Birden fazla hedef seçebilirsin. Bunlar sana uygun ilk alışkanlıkları önerecek.
              </p>
              <div className="mt-5 grid gap-2.5">
                {goalOptions.map((goal) => {
                  const selected = goalIds.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className={`flex w-full items-center justify-between rounded-2xl p-4 text-left ring-1 transition ${
                        selected
                          ? `${categoryStyles[goal.category]} ring-primary`
                          : "bg-card ring-border"
                      }`}
                    >
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          {goal.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {goal.desc}
                        </p>
                        <p className="mt-2 text-[11px] font-medium text-primary">
                          {habitCategoryLabel(goal.category)}
                        </p>
                      </div>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {selected && <Check size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "habits" && (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Hangi küçük adımlarla başlayalım?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                2-4 tane öneririz. Az ama sürdürülebilir, çoktan iyidir.
              </p>
              <div className="mt-5 space-y-4">
                {cats.map((c) => (
                  <div key={c}>
                    <p className="mb-2 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${categoryStyles[c]}`}>
                        {habitCategoryLabel(c)}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {HABIT_SUGGESTIONS[c].map((s) => {
                        const selected = !!picks.find((p) => p.name === s);
                        return (
                          <button
                            key={s}
                            onClick={() => togglePick({ name: s, category: c })}
                            className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${
                              selected
                                ? "bg-primary text-primary-foreground ring-primary"
                                : "bg-card text-foreground ring-border hover:bg-sage-soft"
                            }`}
                          >
                            {selected ? "✓ " : "+ "}{s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {picks.length === 0 && (
                <p className="mt-4 rounded-2xl bg-card p-3 text-xs text-muted-foreground ring-1 ring-border">
                  Şimdilik seçmek istemiyorsan da sorun değil, sonra "Alışkanlıklar"
                  sekmesinden ekleyebilirsin.
                </p>
              )}
            </div>
          )}

          {step === "cycle" && (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Döngünü takip etmek ister misin?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Tamamen isteğe bağlı. Eklersen, fazına göre nazik ipuçları gösterebiliriz.
                Atlamak istersen de sonra ayarlayabilirsin.
              </p>
              <label className="mt-5 block">
                <span className="text-xs font-medium text-muted-foreground">
                  Son adetinin başlangıç tarihi
                </span>
                <input
                  type="date"
                  value={lastPeriod}
                  onChange={(e) => setLastPeriod(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-xs font-medium text-muted-foreground">
                  Ortalama döngü uzunluğu (gün)
                </span>
                <input
                  type="number"
                  min={20}
                  max={45}
                  value={cycleLen}
                  onChange={(e) => setCycleLen(Number(e.target.value))}
                  className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-sage-soft text-primary ring-1 ring-border">
                <Check size={26} strokeWidth={3} />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                Hazırsın.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Bugün ekranı seni bekliyor. Acele yok, sadece kendi ritminde ol.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {step !== "welcome" && step !== "done" && (
            <button
              onClick={() => {
                const order: Step[] = ["welcome", "story", "gender", "profile", "categories", "habits", "cycle"];
                const i = order.indexOf(step);
                setStep(order[Math.max(0, i - 1)]!);
              }}
              className="rounded-2xl px-4 py-3 text-sm text-muted-foreground"
            >
              Geri
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {step === "cycle" && (
              <button
                onClick={() => {
                  setSkipCycle(true);
                  setStep("done");
                }}
                className="rounded-2xl px-4 py-3 text-sm text-muted-foreground"
              >
                Atla
              </button>
            )}
            {step === "welcome" && (
              <button
                onClick={() => setStep("story")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Akışı gör <ChevronRight size={16} />
              </button>
            )}
            {step === "story" && (
              <button
                onClick={() => setStep("gender")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Akışa gir <ChevronRight size={16} />
              </button>
            )}
            {step === "gender" && (
              <button
                disabled={!gender}
                onClick={() => setStep("profile")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Devam <ChevronRight size={16} />
              </button>
            )}
            {step === "profile" && (
              <button
                onClick={() => setStep("categories")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Devam <ChevronRight size={16} />
              </button>
            )}
            {step === "categories" && (
              <button
                disabled={goalIds.length === 0}
                onClick={() => setStep("habits")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Devam <ChevronRight size={16} />
              </button>
            )}
            {step === "habits" && (
              <button
                onClick={() => setStep(gender === "male" ? "done" : "cycle")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Devam <ChevronRight size={16} />
              </button>
            )}
            {step === "cycle" && (
              <button
                onClick={() => {
                  setSkipCycle(false);
                  setStep("done");
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Kaydet <ChevronRight size={16} />
              </button>
            )}
            {step === "done" && (
              <button
                onClick={finish}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-base font-medium text-primary-foreground"
              >
                Bugün ekranına geç
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const order: Step[] = ["welcome", "story", "gender", "profile", "categories", "habits", "cycle", "done"];
  const i = order.indexOf(step);
  return (
    <div className="flex gap-1.5">
      {order.map((s, idx) => (
        <div
          key={s}
          className={`h-1.5 flex-1 rounded-full transition ${
            idx <= i ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function StoryCard({
  card,
}: {
  card: (typeof onboardingStoryCards)[number];
}) {
  const Icon = card.icon === "leaf" ? Leaf : card.icon === "spark" ? Sparkles : Wind;
  const tone = {
    sage: "bg-sage-soft text-primary",
    sky: "bg-sky-soft text-sky",
    earth: "bg-earth-soft text-earth",
  }[card.tone];
  return (
    <article className="w-[236px] shrink-0 snap-start overflow-hidden rounded-[30px] bg-white/80 shadow-[0_18px_44px_rgba(46,74,56,0.1)] ring-1 ring-border">
      <div className={`relative h-28 ${tone}`}>
        <span className="absolute left-4 top-4 rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55">
          {card.label}
        </span>
        <span className="absolute bottom-4 left-4 grid h-12 w-12 place-items-center rounded-[20px] bg-white/72 text-foreground shadow-sm ring-1 ring-white/80">
          <Icon size={22} />
        </span>
        <span className="absolute bottom-5 right-5 h-14 w-8 rotate-12 rounded-[100%_0_100%_0] bg-white/55" />
        <span className="absolute right-12 top-8 h-10 w-6 -rotate-45 rounded-[100%_0_100%_0] bg-white/45" />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold tracking-[-0.04em] text-foreground">
          {card.title}
        </h3>
        <p className="mt-2 min-h-[66px] text-xs leading-relaxed text-muted-foreground">
          {card.copy}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.items.map((item) => (
            <span
              key={item}
              className="rounded-full bg-sage-soft px-2.5 py-1 text-[10px] font-medium text-foreground/70"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
