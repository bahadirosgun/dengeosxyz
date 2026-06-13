import { useRef, useState } from "react";
import { Plus, X, Footprints, Scale, Heart, Droplets, Images, BookHeart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCache } from "@/lib/appData";
import { addEntry, promptOfTheDay } from "@/lib/journal";
import { uploadJournalMedia } from "@/lib/journalMedia";

type Sheet = null | "steps" | "weight" | "mood" | "water" | "photo" | "journal";

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const actions: {
    sheet: Exclude<Sheet, null>;
    icon: typeof Footprints;
    label: string;
    desc: string;
  }[] = [
    { sheet: "mood", icon: Heart, label: "Ruh hali ve stres", desc: "5 saniyelik check-in" },
    { sheet: "water", icon: Droplets, label: "Su ekle", desc: "Bugünkü bardak sayısı" },
    { sheet: "steps", icon: Footprints, label: "Adım / yürüyüş", desc: "Kısa hareket kaydı" },
    { sheet: "weight", icon: Scale, label: "Ölçüm", desc: "Nazik trend takibi" },
    { sheet: "photo", icon: Images, label: "Günce fotoğrafı", desc: "Yemek, hareket veya an" },
    { sheet: "journal", icon: BookHeart, label: "Günlük satırı", desc: "Bir cümle yeter" },
  ];

  const close = () => {
    setSheet(null);
    setOpen(false);
  };

  return (
    <>
      <button
        aria-label="Hızlı ekle"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-border transition active:scale-95"
      >
        <Plus size={26} />
      </button>

      {open && !sheet && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/30 px-3 pb-3"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl ring-1 ring-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Hızlı ekle</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Günlük kaydı derine inmeden tamamla.
                </p>
              </div>
              <button
                aria-label="Kapat"
                onClick={() => setOpen(false)}
                className="rounded-full bg-background p-2 text-muted-foreground ring-1 ring-border"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {actions.map((action) => (
                <Tile
                  key={action.sheet}
                  icon={action.icon}
                  label={action.label}
                  desc={action.desc}
                  onClick={() => setSheet(action.sheet)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {sheet === "steps" && <StepsSheet onClose={close} />}
      {sheet === "weight" && <WeightSheet onClose={close} />}
      {sheet === "mood" && <MoodSheet onClose={close} />}
      {sheet === "water" && <WaterSheet onClose={close} />}
      {sheet === "photo" && <PhotoSheet onClose={close} />}
      {sheet === "journal" && <JournalSheet onClose={close} />}
    </>
  );
}

function Tile({
  icon: Icon,
  label,
  desc,
  onClick,
}: {
  icon: typeof Footprints;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-background p-3 text-left ring-1 ring-border transition hover:bg-muted active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-primary">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{desc}</span>
      </span>
      <Plus size={14} className="text-muted-foreground" />
    </button>
  );
}

function SheetShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/40 px-3 pb-3"
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5 shadow-2xl ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function StepsSheet({ onClose }: { onClose: () => void }) {
  const [steps, setSteps] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const n = parseInt(steps, 10);
    if (!n || n < 0) return;
    const userId = getCache().userId;
    if (!userId) return;
    setBusy(true);
    await supabase.from("movement_entries").insert({
      user_id: userId,
      date: today(),
      kind: "walking",
      steps: n,
    });
    setBusy(false);
    onClose();
  };
  return (
    <SheetShell title="Adım ekle" onClose={onClose}>
      <input
        type="number"
        inputMode="numeric"
        autoFocus
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        placeholder="örn. 7500"
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg text-foreground outline-none focus:border-primary"
      />
      <button
        onClick={save}
        disabled={busy}
        className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Kaydet
      </button>
    </SheetShell>
  );
}

function WeightSheet({ onClose }: { onClose: () => void }) {
  const [w, setW] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const n = parseFloat(w.replace(",", "."));
    if (!n || n <= 0) return;
    const userId = getCache().userId;
    if (!userId) return;
    setBusy(true);
    await supabase.from("weight_entries").insert({
      user_id: userId,
      date: today(),
      weight_kg: n,
    });
    setBusy(false);
    onClose();
  };
  return (
    <SheetShell title="Ölçüm ekle" onClose={onClose}>
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        value={w}
        onChange={(e) => setW(e.target.value)}
        placeholder="örn. 64.3"
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg text-foreground outline-none focus:border-primary"
      />
      <button
        onClick={save}
        disabled={busy}
        className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Kaydet
      </button>
    </SheetShell>
  );
}

function MoodSheet({ onClose }: { onClose: () => void }) {
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const moods = ["😞", "😕", "😐", "🙂", "😊"];
  const save = async () => {
    const userId = getCache().userId;
    if (!userId || (mood == null && stress == null)) return;
    setBusy(true);
    await supabase.from("day_logs").upsert({
      user_id: userId,
      date: today(),
      mood: mood ?? null,
      stress: stress ?? null,
      completed: getCache().logs[today()]?.completed ?? [],
      frozen: getCache().logs[today()]?.frozen ?? [],
    });
    setBusy(false);
    onClose();
  };
  return (
    <SheetShell title="Ruh hali ve stres" onClose={onClose}>
      <div className="flex justify-between">
        {moods.map((e, i) => (
          <button
            key={e}
            onClick={() => setMood(i + 1)}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
              mood === i + 1 ? "scale-110 bg-sage-soft" : "bg-background"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Stres (1 sakin · 5 yoğun)</p>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => setStress(v)}
            className={`h-10 flex-1 rounded-2xl text-sm font-medium ${
              stress === v ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <button
        onClick={save}
        disabled={busy}
        className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Kaydet
      </button>
    </SheetShell>
  );
}

function WaterSheet({ onClose }: { onClose: () => void }) {
  // Local-only quick counter (water table not in scope) — store in localStorage by day.
  const key = `dengeos-water-${today()}`;
  const initial = typeof window !== "undefined" ? Number(localStorage.getItem(key) ?? "0") : 0;
  const [count, setCount] = useState(initial);
  const update = (n: number) => {
    const next = Math.max(0, count + n);
    setCount(next);
    if (typeof window !== "undefined") localStorage.setItem(key, String(next));
  };
  return (
    <SheetShell title="Su takibi" onClose={onClose}>
      <div className="flex flex-col items-center py-3">
        <p className="text-5xl">💧</p>
        <p className="mt-3 text-3xl font-semibold text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground">bardak (bugün)</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => update(-1)} className="rounded-2xl bg-muted px-5 py-2 text-base">
            −
          </button>
          <button
            onClick={() => update(1)}
            className="rounded-2xl bg-primary px-5 py-2 text-base text-primary-foreground"
          >
            +1 bardak
          </button>
        </div>
      </div>
      <button
        onClick={onClose}
        className="mt-3 w-full rounded-2xl bg-background px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border"
      >
        Bitti
      </button>
    </SheetShell>
  );
}

function PhotoSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadJournalMedia({ file, caption, tag: "general" });
      onClose();
      void navigate({ to: "/gunce" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <SheetShell title="Günce'ye fotoğraf" onClose={onClose}>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        onClick={() => ref.current?.click()}
        className="flex h-32 w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground"
      >
        {file ? file.name : "Fotoğraf seç"}
      </button>
      <textarea
        rows={2}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Kısa not (isteğe bağlı)"
        className="mt-3 w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
      />
      <button
        onClick={submit}
        disabled={!file || busy}
        className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Yükleniyor…" : "Kaydet"}
      </button>
    </SheetShell>
  );
}

function JournalSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const prompt = promptOfTheDay();
  const save = () => {
    if (!text.trim()) return;
    addEntry(prompt, text);
    onClose();
  };
  return (
    <SheetShell title="1 dakikalık günlük" onClose={onClose}>
      <p className="text-xs italic text-muted-foreground">{prompt}</p>
      <textarea
        autoFocus
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
      />
      <button
        onClick={save}
        className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
      >
        Kaydet
      </button>
    </SheetShell>
  );
}
