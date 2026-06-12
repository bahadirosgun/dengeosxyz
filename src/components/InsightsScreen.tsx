import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, TrendingUp, Heart, Flame, Settings as SettingsIcon } from "lucide-react";
import { type AppState, loadState } from "@/lib/habits";
import { loadCycle, type CycleSettings } from "@/lib/cycle";
import {
  activeDayStreak,
  habitRates,
  moodByPhase,
  phaseInsightMessage,
  weeklyCompletion,
} from "@/lib/insights";
import { PHASE_META } from "@/lib/cycle";
import { useGender } from "@/lib/useAppData";

export function InsightsScreen() {
  const [state, setState] = useState<AppState | null>(null);
  const [cycle, setCycle] = useState<CycleSettings | null>(null);
  const gender = useGender();

  useEffect(() => {
    setState(loadState());
    setCycle(loadCycle());
  }, []);

  if (!state) return null;

  const weekly = weeklyCompletion(state, 7);
  const rates = habitRates(state, 14).filter((r) => r.days > 0);
  const sorted = [...rates].sort((a, b) => b.rate - a.rate);
  const strongest = sorted[0];
  const weakest = sorted.length > 1 ? sorted[sorted.length - 1] : undefined;
  const activeStreak = activeDayStreak(state);

  const phaseData = gender === "female" && cycle ? moodByPhase(state, cycle) : null;
  const phaseMsg = phaseData ? phaseInsightMessage(phaseData) : null;

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">İçgörüler</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Bu sayılar bir karne değil. Kendini tanımak ve nazikçe yön bulmak için.
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

      {/* Weekly completion */}
      <section className="rounded-3xl bg-card p-5 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <TrendingUp size={13} /> Son 7 gün
            </p>
            <h2 className="mt-1 text-4xl font-semibold text-foreground">%{weekly}</h2>
            <p className="mt-1 text-xs text-muted-foreground">tutarlılık oranın</p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <Flame size={13} className="text-flame" /> Aktif gün serisi
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{activeStreak}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${weekly}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {weekly >= 70
            ? "Harikasın — istikrar burada. Kilodan değil, davranıştan gelen güç bu."
            : weekly >= 40
              ? "Güzel gidiyor. Mükemmel olmana gerek yok, sürmek yeterli."
              : "Yumuşak bir hafta. Yarın tekrar başlayabilirsin — hiçbir şey kaybolmadı."}
        </p>
      </section>

      {/* Strongest / weakest */}
      <section className="mt-4 grid gap-3">
        {strongest && (
          <article className="rounded-3xl bg-sage-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/70">
              ✨ En güçlü alışkanlığın
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{strongest.habit.name}</h3>
            <p className="mt-1 text-xs text-foreground/70">
              Son 2 haftanın %{strongest.rate}'inde tamamlandı. Bu sende doğal akıyor.
            </p>
          </article>
        )}
        {weakest && weakest.habit.id !== strongest?.habit.id && (
          <article className="rounded-3xl bg-earth-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/70">
              🌱 Biraz daha şefkat isteyen
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{weakest.habit.name}</h3>
            <p className="mt-1 text-xs text-foreground/70">
              Son 2 haftada %{weakest.rate}. Belki çok büyük? Bir basamak küçültmeyi dene.
            </p>
          </article>
        )}
      </section>

      {/* All habits bar list */}
      {rates.length > 0 && (
        <section className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-border">
          <h2 className="text-sm font-semibold text-foreground">Tüm alışkanlıkların</h2>
          <ul className="mt-3 space-y-3">
            {rates.map((r) => (
              <li key={r.habit.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-foreground">{r.habit.name}</span>
                  <span className="text-muted-foreground">%{r.rate}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${r.rate}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {gender === "female" && (
        <section className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-border">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Heart size={15} className="text-primary" /> Döngü & duygular
          </h2>
          {!cycle ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Döngü bilgilerini eklersen, ruh hali ve stres kayıtların hangi fazda nasıl seyrediyor
              burada gösteririz.{" "}
              <Link to="/dongu" className="underline">
                Döngüyü ayarla
              </Link>
              .
            </p>
          ) : !phaseData || phaseData.every((p) => p.samples === 0) ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Henüz yeterli kayıt yok. Bugün ekranında ruh hali ve stres işaretlemeye devam edersen
              birkaç hafta içinde desenler ortaya çıkacak.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {phaseMsg && (
                <p className="rounded-2xl bg-sage-soft p-3 text-sm leading-relaxed text-foreground">
                  {phaseMsg}
                </p>
              )}
              <PhaseBars title="Stres ortalaması" data={phaseData} kind="stress" />
              <PhaseBars title="Ruh hali ortalaması" data={phaseData} kind="mood" />
              <p className="text-[11px] text-muted-foreground">
                5 üzerinden ortalamalar. Az kayıtla yorum yapmak zor — zaman içinde daha anlamlı
                olacak.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Behaviour-first manifesto */}
      <section className="mt-4 rounded-3xl bg-sage-soft p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles size={15} /> Sayıdan değil, davranıştan
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          Burada tartı yok. Çünkü gerçek değişim küçük, tekrar eden davranışlardan doğar. Bir adımı
          bugün attığında zaten kazanıyorsun.
        </p>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Tutarlılık zarafettir. Mükemmellik değil. 🌿
      </p>
    </div>
  );
}

function PhaseBars({
  title,
  data,
  kind,
}: {
  title: string;
  data: {
    phase: keyof typeof PHASE_META;
    moodAvg: number | null;
    stressAvg: number | null;
    samples: number;
  }[];
  kind: "mood" | "stress";
}) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <div className="mt-2 space-y-1.5">
        {data.map((d) => {
          const val = kind === "mood" ? d.moodAvg : d.stressAvg;
          const meta = PHASE_META[d.phase];
          const pct = val ? (val / 5) * 100 : 0;
          return (
            <div key={d.phase} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
                {meta.emoji} {meta.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                {val !== null && (
                  <div
                    className={`h-full rounded-full ${kind === "stress" ? "bg-flame" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {val !== null ? val.toFixed(1) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
