import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Plus, Loader2, Footprints, Activity, Trash2, Target, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { loadCycle, loadCycleForGender, computeCycle, PHASE_META } from "@/lib/cycle";
import { toast } from "sonner";

export const Route = createFileRoute("/araclar/hareket")({
  head: () => ({
    meta: [
      { title: "Hareket — DengeOS" },
      { name: "description", content: "Yürüyüş ve spor takibi: günlük halka, haftalık/aylık grafikler." },
    ],
  }),
  component: MovementPage,
});

interface MovementEntry {
  id: string;
  date: string;
  kind: "walking" | "activity";
  steps: number | null;
  duration_minutes: number | null;
  distance_km: number | null;
  activity_type: string | null;
  notes: string | null;
}

type Range = "week" | "month";

const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
};

function daysBack(n: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d);
  }
  return out;
}

function MovementPage() {
  const [entries, setEntries] = useState<MovementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("week");
  const [adding, setAdding] = useState(false);
  const [stepGoal, setStepGoal] = useState(8000);
  const [minutesGoal, setMinutesGoal] = useState(30);
  const [editingGoal, setEditingGoal] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const [movRes, profRes] = await Promise.all([
      supabase
        .from("movement_entries")
        .select("*")
        .gte("date", dateKey(since))
        .order("date", { ascending: true }),
      supabase.from("profiles").select("step_goal, active_minutes_goal").maybeSingle(),
    ]);
    if (movRes.error) toast.error("Yüklenemedi.");
    else setEntries((movRes.data ?? []) as MovementEntry[]);
    if (profRes.data) {
      setStepGoal(profRes.data.step_goal ?? 8000);
      setMinutesGoal(profRes.data.active_minutes_goal ?? 30);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const todayKey = dateKey(new Date());
  const todayEntries = entries.filter((e) => e.date === todayKey);
  const todaySteps = todayEntries.reduce((s, e) => s + (e.steps ?? 0), 0);
  const todayMinutes = todayEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);

  const stepPct = Math.min(100, Math.round((todaySteps / Math.max(1, stepGoal)) * 100));
  const minPct = Math.min(100, Math.round((todayMinutes / Math.max(1, minutesGoal)) * 100));

  const chartData = useMemo(() => {
    const days = daysBack(range === "week" ? 7 : 30);
    return days.map((d) => {
      const k = dateKey(d);
      const dayEntries = entries.filter((e) => e.date === k);
      const steps = dayEntries.reduce((s, e) => s + (e.steps ?? 0), 0);
      const minutes = dayEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
      return {
        date: k,
        label:
          range === "week"
            ? d.toLocaleDateString("tr-TR", { weekday: "short" })
            : String(d.getDate()),
        steps,
        minutes,
      };
    });
  }, [entries, range]);

  const cyc = loadCycleForGender();
  const phase = cyc ? computeCycle(cyc).phase : null;
  const phaseAdvice: Record<string, string> = {
    menstrual: "Bugün menstrüel faz — hafif yürüyüş ve esneme iyi gelir, kendine yumuşak ol.",
    follicular: "Folliküler fazdasın — enerji yükseliyor; daha yoğun antrenmanlar için güzel günler.",
    ovulation: "Ovulasyon — zirve enerji, kardiyo ve sosyal sporlar harika gider.",
    luteal: "Luteal faz — tempoyu düşürmek normal. Yoga, yürüyüş, esneme tatlı bir denge.",
  };

  const deleteEntry = async (id: string) => {
    setEntries((p) => p.filter((e) => e.id !== id));
    const { error } = await supabase.from("movement_entries").delete().eq("id", id);
    if (error) {
      toast.error("Silinemedi.");
      fetchAll();
    }
  };

  const saveGoals = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ step_goal: stepGoal, active_minutes_goal: minutesGoal, updated_at: new Date().toISOString() })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);
    if (error) toast.error("Kaydedilemedi.");
    else {
      toast.success("Hedefler güncellendi.");
      setEditingGoal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 pt-6">
        <header className="mb-4 flex items-center gap-3">
          <Link to="/araclar" className="rounded-full bg-card p-2 ring-1 ring-border" aria-label="Geri">
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hareket</h1>
            <p className="text-xs text-muted-foreground">Yürüyüş ve sporlarını nazikçe takip et.</p>
          </div>
          <button
            onClick={() => setEditingGoal(true)}
            aria-label="Hedef ayarla"
            className="rounded-full bg-card p-2 text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            <Target size={16} />
          </button>
        </header>

        {/* Today rings */}
        <div className="mb-4 rounded-3xl bg-card p-4 ring-1 ring-border">
          <div className="mb-3 text-sm font-medium text-foreground">Bugün</div>
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32 shrink-0">
              <ProgressRing pct={stepPct} color="var(--primary)" innerPct={minPct} innerColor="var(--accent)" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold text-foreground tabular-nums">{todaySteps.toLocaleString("tr-TR")}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">adım</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <Stat icon={<Footprints size={14} />} label="Adım hedefi" value={`${stepPct}%`} sub={`${todaySteps.toLocaleString("tr-TR")} / ${stepGoal.toLocaleString("tr-TR")}`} color="text-primary" />
              <Stat icon={<Activity size={14} />} label="Aktif dakika" value={`${minPct}%`} sub={`${todayMinutes} / ${minutesGoal} dk`} color="text-accent-foreground" />
            </div>
          </div>
          {phase && (
            <p className="mt-3 rounded-2xl bg-sage-soft px-3 py-2 text-[11px] text-foreground/80">
              {PHASE_META[phase].emoji} {phaseAdvice[phase]}
            </p>
          )}
        </div>

        {/* Range tabs */}
        <div className="mb-3 inline-flex rounded-full bg-card p-1 ring-1 ring-border">
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {r === "week" ? "Hafta" : "Ay"}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="mb-4 rounded-3xl bg-card p-3 ring-1 ring-border">
          <div className="mb-2 px-1 text-xs text-muted-foreground">Günlük adım</div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={range === "month" ? 3 : 0} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString("tr-TR")} adım`, ""]}
                  labelFormatter={(l) => l}
                />
                <Bar dataKey="steps" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mb-2 mt-4 px-1 text-xs text-muted-foreground">Aktif dakika</div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={range === "month" ? 3 : 0} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                  formatter={(v: number) => [`${v} dk`, ""]}
                />
                <Bar dataKey="minutes" fill="var(--accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={() => setAdding(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} /> Hareket ekle
        </button>

        {/* Recent list */}
        <div className="rounded-3xl bg-card p-3 ring-1 ring-border">
          <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">Son kayıtlar</div>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="px-1 py-3 text-center text-xs text-muted-foreground">Henüz kayıt yok.</p>
          ) : (
            <ul className="space-y-2">
              {[...entries].reverse().slice(0, 15).map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-soft text-primary">
                    {e.kind === "walking" ? <Footprints size={16} /> : <Activity size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {e.kind === "walking" ? "Yürüyüş" : e.activity_type || "Aktivite"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      {e.steps ? ` · ${e.steps.toLocaleString("tr-TR")} adım` : ""}
                      {e.duration_minutes ? ` · ${e.duration_minutes} dk` : ""}
                      {e.distance_km ? ` · ${e.distance_km} km` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(e.id)}
                    aria-label="Sil"
                    className="rounded-full p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {adding && <MovementEditor onClose={() => setAdding(false)} onSaved={fetchAll} />}
      {editingGoal && (
        <GoalEditor
          stepGoal={stepGoal}
          minutesGoal={minutesGoal}
          setStepGoal={setStepGoal}
          setMinutesGoal={setMinutesGoal}
          onSave={saveGoals}
          onClose={() => setEditingGoal(false)}
        />
      )}
      <BottomNav />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-background p-2.5 ring-1 ring-border">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={color}>{icon}</span> {label}
        </span>
        <span className="font-semibold text-foreground tabular-nums">{value}</span>
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function ProgressRing({
  pct,
  color,
  innerPct,
  innerColor,
}: {
  pct: number;
  color: string;
  innerPct?: number;
  innerColor?: string;
}) {
  const size = 128;
  const stroke = 10;
  const r1 = (size - stroke) / 2;
  const c1 = 2 * Math.PI * r1;
  const r2 = r1 - stroke - 2;
  const c2 = 2 * Math.PI * r2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r1} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r1}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c1}
        strokeDashoffset={c1 - (c1 * Math.min(100, pct)) / 100}
        fill="none"
        style={{ transition: "stroke-dashoffset 600ms" }}
      />
      {innerPct !== undefined && (
        <>
          <circle cx={size / 2} cy={size / 2} r={r2} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r2}
            stroke={innerColor ?? color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c2}
            strokeDashoffset={c2 - (c2 * Math.min(100, innerPct)) / 100}
            fill="none"
            style={{ transition: "stroke-dashoffset 600ms" }}
          />
        </>
      )}
    </svg>
  );
}

function MovementEditor({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<"walking" | "activity">("walking");
  const [date, setDate] = useState(dateKey(new Date()));
  const [steps, setSteps] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [activity, setActivity] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      toast.error("Oturum bulunamadı.");
      return;
    }
    if (kind === "walking" && !steps && !minutes) {
      toast.error("Adım veya süre gir.");
      return;
    }
    if (kind === "activity" && (!activity.trim() || !minutes)) {
      toast.error("Aktivite ve süre gir.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("movement_entries").insert({
      user_id: userId,
      date,
      kind,
      steps: kind === "walking" && steps ? parseInt(steps, 10) : null,
      duration_minutes: minutes ? parseInt(minutes, 10) : null,
      distance_km: kind === "walking" && distance ? parseFloat(distance) : null,
      activity_type: kind === "activity" ? activity.trim() : null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) toast.error("Eklenemedi.");
    else {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-5 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Hareket ekle</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="mb-3 inline-flex rounded-full bg-background p-1 ring-1 ring-border">
          {(["walking", "activity"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {k === "walking" ? <><Footprints size={13} /> Yürüyüş</> : <><Activity size={13} /> Diğer spor</>}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <Field label="Tarih">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          {kind === "walking" ? (
            <>
              <Field label="Adım">
                <input type="number" inputMode="numeric" placeholder="örn. 6500" value={steps} onChange={(e) => setSteps(e.target.value)} className={inputCls} />
              </Field>
              <div className="flex gap-2">
                <Field label="Süre (dk)" className="flex-1">
                  <input type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Mesafe (km)" className="flex-1">
                  <input type="number" inputMode="decimal" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} className={inputCls} />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="Aktivite">
                <input placeholder="örn. yoga, koşu, pilates" value={activity} onChange={(e) => setActivity(e.target.value)} maxLength={40} className={inputCls} />
              </Field>
              <Field label="Süre (dk)">
                <input type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} />
              </Field>
            </>
          )}
          <Field label="Not (opsiyonel)">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={120} className={inputCls} />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-background py-2 text-sm hover:bg-muted">Vazgeç</button>
          <button onClick={submit} disabled={saving} className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalEditor({
  stepGoal,
  minutesGoal,
  setStepGoal,
  setMinutesGoal,
  onSave,
  onClose,
}: {
  stepGoal: number;
  minutesGoal: number;
  setStepGoal: (n: number) => void;
  setMinutesGoal: (n: number) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-5 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Günlük hedef</h2>
        <p className="mb-3 text-xs text-muted-foreground">Hedef kendine bir hatırlatma — baskı değil.</p>
        <div className="space-y-3">
          <Field label="Adım hedefi">
            <input type="number" inputMode="numeric" value={stepGoal} onChange={(e) => setStepGoal(parseInt(e.target.value || "0", 10))} className={inputCls} />
          </Field>
          <Field label="Aktif dakika hedefi">
            <input type="number" inputMode="numeric" value={minutesGoal} onChange={(e) => setMinutesGoal(parseInt(e.target.value || "0", 10))} className={inputCls} />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-background py-2 text-sm hover:bg-muted">Vazgeç</button>
          <button onClick={onSave} className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Kaydet</button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}