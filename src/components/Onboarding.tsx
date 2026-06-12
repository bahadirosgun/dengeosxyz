import { useState } from "react";
import { ChevronRight, Check, Sparkles } from "lucide-react";
import {
  type AppState,
  type HabitCategory,
  HABIT_SUGGESTIONS,
  markOnboarded,
  replaceHabits,
  saveState,
} from "@/lib/habits";
import { saveCycle } from "@/lib/cycle";
import { persistGender, persistOnboardingComplete, type Gender } from "@/lib/appData";

const categoryStyles: Record<HabitCategory, string> = {
  Kilo: "bg-sage-soft",
  Stres: "bg-sky-soft",
  Genel: "bg-earth-soft",
};

type Step = "welcome" | "gender" | "categories" | "habits" | "cycle" | "done";

export function Onboarding({
  state,
  onComplete,
}: {
  state: AppState;
  onComplete: (next: AppState) => void;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [gender, setGender] = useState<Gender | null>(null);
  const [cats, setCats] = useState<HabitCategory[]>(["Kilo", "Stres"]);
  const [picks, setPicks] = useState<{ name: string; category: HabitCategory }[]>([]);
  const [lastPeriod, setLastPeriod] = useState("");
  const [cycleLen, setCycleLen] = useState(28);
  const [skipCycle, setSkipCycle] = useState(false);

  const toggleCat = (c: HabitCategory) => {
    setCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
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
              <p className="text-5xl">🌿</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground">
                Hoş geldin.
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                DengeOS, kendine nazik davranarak sağlıklı alışkanlıklar inşa etmen için
                tasarlandı.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Mükemmellik değil, tutarlılık.",
                  "Kaçırdığın bir gün başarısızlık değil.",
                  "Kısıtlama yok — küçük adımlar.",
                  "Tartı yerine davranış değişimi.",
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
                  >
                    <span className="mt-0.5 text-base">💛</span>
                    <span className="text-sm leading-relaxed text-foreground">{line}</span>
                  </li>
                ))}
              </ul>
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
                  { v: "female", label: "Kadın", emoji: "🌸" },
                  { v: "male", label: "Erkek", emoji: "🌿" },
                ] as { v: Gender; label: string; emoji: string }[]).map((o) => {
                  const selected = gender === o.v;
                  return (
                    <button
                      key={o.v}
                      onClick={() => setGender(o.v)}
                      className={`flex flex-col items-center gap-2 rounded-2xl p-5 ring-1 transition ${
                        selected
                          ? "bg-sage-soft ring-primary"
                          : "bg-card ring-border"
                      }`}
                    >
                      <span className="text-3xl">{o.emoji}</span>
                      <span className="text-base font-semibold text-foreground">{o.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                Kadın seçilirse döngü takibi ve faza göre öneriler etkinleşir.
              </p>
            </div>
          )}

          {step === "categories" && (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Şu sıralar neye alan açmak istersin?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Birden fazla seçebilirsin. İstediğin zaman değiştirebilirsin.
              </p>
              <div className="mt-5 space-y-2">
                {(Object.keys(HABIT_SUGGESTIONS) as HabitCategory[]).map((c) => {
                  const selected = cats.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCat(c)}
                      className={`flex w-full items-center justify-between rounded-2xl p-4 text-left ring-1 transition ${
                        selected
                          ? `${categoryStyles[c]} ring-primary`
                          : "bg-card ring-border"
                      }`}
                    >
                      <div>
                        <p className="text-base font-semibold text-foreground">{c}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c === "Kilo" && "Sürdürülebilir, suçluluk içermeyen yaklaşım"}
                          {c === "Stres" && "Sakinleşme, dinginlik, kendine alan"}
                          {c === "Genel" && "Su, uyku, beslenme — temeller"}
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
                        {c}
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
                  Şimdilik seçmek istemiyorsan da sorun değil — sonra "Alışkanlıklar"
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
              <Sparkles size={48} className="text-primary" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                Hazırsın 💛
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Bugün ekranı seni bekliyor. Acele yok — sadece kendi ritminde ol.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {step !== "welcome" && step !== "done" && (
            <button
              onClick={() => {
                const order: Step[] = ["welcome", "gender", "categories", "habits", "cycle"];
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
                onClick={() => setStep("gender")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Başlayalım <ChevronRight size={16} />
              </button>
            )}
            {step === "gender" && (
              <button
                disabled={!gender}
                onClick={() => setStep("categories")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Devam <ChevronRight size={16} />
              </button>
            )}
            {step === "categories" && (
              <button
                disabled={cats.length === 0}
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
  const order: Step[] = ["welcome", "gender", "categories", "habits", "cycle", "done"];
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