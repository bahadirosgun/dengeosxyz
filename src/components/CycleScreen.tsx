import { useEffect, useState } from "react";
import { Pencil, Heart, Settings as SettingsIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  type CycleSettings,
  PHASE_META,
  clearCycle,
  computeCycle,
  formatTrDate,
  loadCycle,
  saveCycle,
} from "@/lib/cycle";
import { useGender } from "@/lib/useAppData";

const todayInputValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function CycleScreen() {
  const [settings, setSettings] = useState<CycleSettings | null>(null);
  const [editing, setEditing] = useState(false);
  const gender = useGender();

  useEffect(() => {
    const s = loadCycle();
    setSettings(s);
    if (!s) setEditing(true);
  }, []);

  if (gender === "male") {
    return (
      <div className="mx-auto max-w-md px-5 pt-8">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Döngü</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Bu alan kadın profillerde adet döngüsü takibi için gösterilir. DengeOS'un alışkanlık,
              yemek, hareket ve program akışı senin için genel sağlık ilkeleriyle devam eder.
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
        <Link
          to="/"
          className="block rounded-3xl bg-card p-5 text-sm font-medium text-foreground ring-1 ring-border"
        >
          Bugün ekranına dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Döngü</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Bu bir reçete değil — bedenini biraz daha iyi tanımak için nazik bir farkındalık aracı.
            Her döngü ve her kadın farklıdır.
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

      {editing || !settings ? (
        <CycleEditor
          initial={settings ?? { lastPeriodStart: todayInputValue(), cycleLength: 28 }}
          onCancel={settings ? () => setEditing(false) : undefined}
          onSave={(s) => {
            saveCycle(s);
            setSettings(s);
            setEditing(false);
          }}
          onReset={
            settings
              ? () => {
                  clearCycle();
                  setSettings(null);
                  setEditing(true);
                }
              : undefined
          }
        />
      ) : (
        <CycleView settings={settings} onEdit={() => setEditing(true)} />
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Tıbbi tavsiye değildir. Endişen varsa lütfen bir sağlık profesyoneline danış.
      </p>
    </div>
  );
}

function CycleView({ settings, onEdit }: { settings: CycleSettings; onEdit: () => void }) {
  const info = computeCycle(settings);
  const meta = PHASE_META[info.phase];

  return (
    <>
      <section className={`rounded-3xl ${meta.color} p-5`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/70">
              {meta.emoji} {meta.label} fazı
            </p>
            <h2 className="mt-1 text-3xl font-semibold text-foreground">
              Gün {info.dayOfCycle}
              <span className="text-base font-normal text-foreground/70">
                {" "}
                / {info.cycleLength}
              </span>
            </h2>
            <p className="mt-1 text-sm text-foreground/80">{meta.tagline}</p>
          </div>
          <button
            onClick={onEdit}
            aria-label="Düzenle"
            className="rounded-full bg-card p-2 text-foreground shadow-sm hover:bg-background"
          >
            <Pencil size={14} />
          </button>
        </div>
        <div className="mt-4 rounded-2xl bg-card/70 p-3 text-sm text-foreground">
          Sıradaki adet tahmini:{" "}
          <span className="font-medium">{formatTrDate(info.nextPeriodDate)}</span> (
          {info.daysUntilNextPeriod === 0 ? "bugün" : `${info.daysUntilNextPeriod} gün sonra`})
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Heart size={15} className="text-primary" /> Bugün için nazik öneriler
        </h3>
        <ul className="mt-3 space-y-2.5">
          {meta.tips.map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-3 rounded-2xl bg-background p-3 text-sm leading-relaxed text-foreground ring-1 ring-border"
            >
              <span className="mt-0.5 text-base">🌿</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <PhaseLegend />
    </>
  );
}

function PhaseLegend() {
  return (
    <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border">
      <h3 className="text-sm font-semibold text-foreground">Dört faz, dört enerji</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(Object.keys(PHASE_META) as (keyof typeof PHASE_META)[]).map((p) => {
          const m = PHASE_META[p];
          return (
            <div key={p} className={`rounded-2xl ${m.color} p-3`}>
              <p className="text-sm font-medium text-foreground">
                {m.emoji} {m.label}
              </p>
              <p className="mt-0.5 text-[11px] text-foreground/70">{m.tagline}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CycleEditor({
  initial,
  onSave,
  onCancel,
  onReset,
}: {
  initial: CycleSettings;
  onSave: (s: CycleSettings) => void;
  onCancel?: () => void;
  onReset?: () => void;
}) {
  const [lastPeriodStart, setLastPeriodStart] = useState(initial.lastPeriodStart);
  const [cycleLength, setCycleLength] = useState<number>(initial.cycleLength || 28);

  const valid = !!lastPeriodStart && cycleLength >= 20 && cycleLength <= 45;

  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-border">
      <h2 className="text-lg font-semibold text-foreground">Döngü bilgilerin</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Bilgilerin yalnızca senin tarayıcında saklanır.
      </p>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-muted-foreground">
          Son adetinin başlangıç tarihi
        </span>
        <input
          type="date"
          value={lastPeriodStart}
          max={todayInputValue()}
          onChange={(e) => setLastPeriodStart(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
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
          value={cycleLength}
          onChange={(e) => setCycleLength(Number(e.target.value))}
          className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
        />
        <span className="mt-1 block text-[11px] text-muted-foreground">
          Bilmiyorsan 28 ile başlayabilirsin. Çoğu döngü 21-35 gün arasıdır ve bu çok normaldir.
        </span>
      </label>

      <div className="mt-6 flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-muted px-4 py-3 text-sm font-medium text-foreground"
          >
            Vazgeç
          </button>
        )}
        <button
          disabled={!valid}
          onClick={() => onSave({ lastPeriodStart, cycleLength })}
          className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Kaydet
        </button>
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-3 w-full rounded-2xl px-4 py-2 text-xs text-muted-foreground hover:text-destructive"
        >
          Bilgileri temizle
        </button>
      )}
    </section>
  );
}
