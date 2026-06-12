import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

type Mode = "478" | "box";

const MODES: Record<
  Mode,
  { label: string; description: string; pattern: { label: string; key: "in" | "hold" | "out" | "hold2"; seconds: number }[] }
> = {
  "478": {
    label: "4-7-8 nefesi",
    description: "Sakinleşmek ve uykuya hazırlanmak için. 4 al, 7 tut, 8 ver.",
    pattern: [
      { label: "Burnundan al", key: "in", seconds: 4 },
      { label: "Nefesini tut", key: "hold", seconds: 7 },
      { label: "Ağzından ver", key: "out", seconds: 8 },
    ],
  },
  box: {
    label: "Kutu nefesi",
    description: "Odağı toplamak için. 4 al, 4 tut, 4 ver, 4 tut.",
    pattern: [
      { label: "Al", key: "in", seconds: 4 },
      { label: "Tut", key: "hold", seconds: 4 },
      { label: "Ver", key: "out", seconds: 4 },
      { label: "Tut", key: "hold2", seconds: 4 },
    ],
  },
};

const DURATION_OPTIONS = [3, 5, 7, 10]; // minutes

export function BreathingTool() {
  const [mode, setMode] = useState<Mode>("478");
  const [durationMin, setDurationMin] = useState(5);
  const [running, setRunning] = useState(false);
  const pattern = MODES[mode].pattern;
  const cycleSeconds = pattern.reduce((a, p) => a + p.seconds, 0);
  // Round session duration up to a whole number of cycles so we end on a phase boundary.
  const totalSeconds = Math.ceil((durationMin * 60) / cycleSeconds) * cycleSeconds;
  const [elapsed, setElapsed] = useState(0);

  // Reset whenever mode or duration changes
  useEffect(() => {
    setRunning(false);
    setElapsed(0);
  }, [mode, durationMin]);

  // Tick — single source of truth: a monotonic `elapsed` counter.
  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= totalSeconds) {
          setRunning(false);
          return totalSeconds;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running, totalSeconds]);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const intoCycle = elapsed % cycleSeconds;
  let acc = 0;
  let phaseIndex = 0;
  for (let i = 0; i < pattern.length; i++) {
    acc += pattern[i]!.seconds;
    if (intoCycle < acc) {
      phaseIndex = i;
      break;
    }
  }
  const phase = pattern[phaseIndex]!;
  const phaseStart = pattern.slice(0, phaseIndex).reduce((a, p) => a + p.seconds, 0);
  const phaseSecondsLeft = phase.seconds - (intoCycle - phaseStart);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  const minLabel = Math.floor(remaining / 60)
    .toString()
    .padStart(1, "0");
  const secLabel = (remaining % 60).toString().padStart(2, "0");

  // Visual scale: expand on inhale, contract on exhale, steady on holds
  const scale = useMemo(() => {
    if (!running) return 0.7;
    if (phase.key === "in") return 1;
    if (phase.key === "out") return 0.5;
    if (phase.key === "hold") return 1; // hold after inhale -> stays expanded
    return 0.5; // hold after exhale (box) -> stays contracted
  }, [phase, running]);

  const done = remaining === 0;
  const transitionMs = running && !done ? phase.seconds * 1000 : 600;

  return (
    <div className="mt-4">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Rehberli nefes</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Daireyi izle, ona uy. Doğru yapmaya çalışmana gerek yok — sadece nefesinle birlikte ol.
      </p>

      {/* Mode picker */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-2xl px-3 py-3 text-sm font-medium ring-1 transition ${
              mode === m
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-foreground ring-border"
            }`}
          >
            {MODES[m].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{MODES[mode].description}</p>

      {/* Duration */}
      <div className="mt-5">
        <span className="text-xs font-medium text-muted-foreground">Süre</span>
        <div className="mt-1 flex gap-2">
          {DURATION_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setDurationMin(m)}
              className={`flex-1 rounded-2xl px-2 py-2 text-sm font-medium ring-1 transition ${
                durationMin === m
                  ? "bg-sage-soft text-foreground ring-primary"
                  : "bg-card text-muted-foreground ring-border"
              }`}
            >
              {m} dk
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          En az 5 dakika öneriyoruz — kısa seanslar daha az etkili olabilir. Yine de bugün ne kadar
          mümkünse o yeterli.
        </p>
      </div>

      {/* Circle */}
      <div className="my-8 flex flex-col items-center">
        <div className="relative flex h-72 w-72 items-center justify-center">
          <div className="absolute h-72 w-72 rounded-full bg-sky-soft/40" />
          <div
            className="absolute rounded-full bg-sky-soft shadow-inner"
            style={{
              width: 220,
              height: 220,
              transform: `scale(${scale})`,
              transition: `transform ${transitionMs}ms ease-in-out`,
            }}
          />
          <div className="relative z-10 text-center">
            {done ? (
              <p className="text-lg font-medium text-foreground">Tamamlandı 🌿</p>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wider text-foreground/70">
                  {running ? phase.label : "Başlamaya hazır"}
                </p>
                <p className="mt-1 text-5xl font-semibold text-foreground tabular-nums">
                  {running ? Math.max(1, phaseSecondsLeft) : durationMin}
                </p>
                <p className="mt-1 text-xs text-foreground/70">
                  {running ? "saniye" : "dakika seçili"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Timer */}
        <p className="mt-4 text-sm text-muted-foreground tabular-nums">
          Kalan: {minLabel}:{secLabel}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-border"
          aria-label="Sıfırla"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => {
            if (done) {
              reset();
              setRunning(true);
              return;
            }
            setRunning((r) => !r);
          }}
          className="flex h-16 items-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-primary-foreground"
        >
          {running ? <Pause size={20} /> : <Play size={20} />}
          {running ? "Duraklat" : done ? "Tekrar" : "Başla"}
        </button>
      </div>
    </div>
  );
}