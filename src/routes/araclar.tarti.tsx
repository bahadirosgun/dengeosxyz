import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Plus, Loader2, Trash2, Scale, Target, X, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { loadCycle, loadCycleForGender, computeCycle } from "@/lib/cycle";
import { toast } from "sonner";

export const Route = createFileRoute("/araclar/tarti")({
  head: () => ({
    meta: [
      { title: "Tartı — DengeOS" },
      { name: "description", content: "Kilonu nazikçe izle: trend grafiği, dalgalanmalara takılmadan." },
    ],
  }),
  component: WeightPage,
});

interface WeightEntry {
  id: string;
  date: string;
  weight_kg: number;
  note: string | null;
}

type Range = "week" | "month" | "all";

const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
};

function WeightPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("month");
  const [adding, setAdding] = useState(false);
  const [goal, setGoal] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [wRes, pRes] = await Promise.all([
      supabase.from("weight_entries").select("*").order("date", { ascending: true }),
      supabase.from("profiles").select("weight_goal_kg").maybeSingle(),
    ]);
    if (wRes.error) toast.error("Yüklenemedi.");
    else setEntries((wRes.data ?? []) as WeightEntry[]);
    setGoal(pRes.data?.weight_goal_kg ? Number(pRes.data.weight_goal_kg) : null);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    if (range === "all") return entries;
    const days = range === "week" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const ck = dateKey(cutoff);
    return entries.filter((e) => e.date >= ck);
  }, [entries, range]);

  // 7-day moving average trend
  const trendData = useMemo(() => {
    return filtered.map((e, i) => {
      const windowStart = Math.max(0, i - 6);
      const slice = filtered.slice(windowStart, i + 1);
      const avg = slice.reduce((s, x) => s + Number(x.weight_kg), 0) / slice.length;
      return {
        date: e.date,
        label: new Date(e.date + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        weight: Number(e.weight_kg),
        trend: Number(avg.toFixed(2)),
      };
    });
  }, [filtered]);

  const latest = entries.at(-1);
  const prev30 = useMemo(() => {
    if (!latest) return null;
    const cutoff = new Date(latest.date + "T00:00:00");
    cutoff.setDate(cutoff.getDate() - 30);
    const candidates = entries.filter((e) => new Date(e.date) <= cutoff);
    return candidates.at(-1) ?? entries[0] ?? null;
  }, [entries, latest]);

  const delta = latest && prev30 && prev30.id !== latest.id ? Number(latest.weight_kg) - Number(prev30.weight_kg) : null;

  const cyc = loadCycleForGender();
  const phase = cyc ? computeCycle(cyc).phase : null;
  const lutealHint = phase === "luteal";

  // y-axis domain with padding
  const weights = filtered.map((e) => Number(e.weight_kg));
  const minW = weights.length ? Math.min(...weights) - 0.5 : 0;
  const maxW = weights.length ? Math.max(...weights) + 0.5 : 100;

  const deleteEntry = async (id: string) => {
    setEntries((p) => p.filter((e) => e.id !== id));
    const { error } = await supabase.from("weight_entries").delete().eq("id", id);
    if (error) {
      toast.error("Silinemedi.");
      fetchAll();
    }
  };

  const saveGoal = async (val: number | null) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ weight_goal_kg: val, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) toast.error("Kaydedilemedi.");
    else {
      setGoal(val);
      setEditingGoal(false);
      toast.success("Kaydedildi.");
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
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tartı</h1>
            <p className="text-xs text-muted-foreground">Bir skor değil, bir eğilim. Nazik kal.</p>
          </div>
          <button
            onClick={() => setEditingGoal(true)}
            aria-label="Hedef"
            className="rounded-full bg-card p-2 text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            <Target size={16} />
          </button>
        </header>

        {/* Latest card */}
        <div className="mb-4 rounded-3xl bg-card p-4 ring-1 ring-border">
          {latest ? (
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-muted-foreground">En son</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tabular-nums text-foreground">
                    {Number(latest.weight_kg).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">kg</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(latest.date + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                </div>
              </div>
              {delta !== null && (
                <div
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-border ${
                    Math.abs(delta) < 0.2
                      ? "bg-sage-soft text-foreground/70"
                      : delta < 0
                        ? "bg-sage-soft text-primary"
                        : "bg-earth-soft text-foreground/80"
                  }`}
                >
                  {Math.abs(delta) < 0.2 ? <Minus size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)} kg / 30g
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz kayıt yok — ilk ölçümünü ekle.</p>
          )}
          {goal !== null && (
            <div className="mt-3 rounded-2xl bg-background p-2.5 text-xs text-muted-foreground ring-1 ring-border">
              Hedef: <span className="font-medium text-foreground">{goal.toFixed(1)} kg</span> (opsiyonel)
            </div>
          )}
          {lutealHint && latest && (
            <p className="mt-3 rounded-2xl bg-accent/40 px-3 py-2 text-[11px] text-foreground/80">
              🌘 Luteal fazdasın — su tutmaya bağlı 1-2 kg dalgalanma çok normal. Tartı eğilimi önemli, tek bir gün değil.
            </p>
          )}
        </div>

        {/* Range tabs */}
        <div className="mb-3 inline-flex rounded-full bg-card p-1 ring-1 ring-border">
          {(["week", "month", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {r === "week" ? "Hafta" : r === "month" ? "Ay" : "Tümü"}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="mb-4 rounded-3xl bg-card p-3 ring-1 ring-border">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="animate-spin" />
            </div>
          ) : trendData.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              Bu aralıkta veri yok.
            </p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 10, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.max(0, Math.floor(trendData.length / 6) - 1)}
                  />
                  <YAxis
                    domain={[minW, maxW]}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                    formatter={(v: number, name: string) => [`${Number(v).toFixed(1)} kg`, name === "trend" ? "Trend" : "Ölçüm"]}
                  />
                  {goal !== null && (
                    <ReferenceLine y={goal} stroke="var(--accent)" strokeDasharray="4 4" />
                  )}
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1}
                    strokeOpacity={0.45}
                    dot={{ r: 2.5, fill: "var(--muted-foreground)", fillOpacity: 0.5, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: "var(--primary)" }} /> 7 günlük trend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 opacity-50" style={{ background: "var(--muted-foreground)" }} /> ölçüm
            </span>
          </div>
        </div>

        <button
          onClick={() => setAdding(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} /> Ölçüm ekle
        </button>

        {/* History */}
        <div className="rounded-3xl bg-card p-3 ring-1 ring-border">
          <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">Geçmiş</div>
          {entries.length === 0 ? (
            <p className="px-1 py-3 text-center text-xs text-muted-foreground">Henüz ölçüm yok.</p>
          ) : (
            <ul className="space-y-2">
              {[...entries].reverse().slice(0, 20).map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-soft text-primary">
                    <Scale size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium tabular-nums text-foreground">{Number(e.weight_kg).toFixed(1)} kg</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>
                  <button onClick={() => deleteEntry(e.id)} aria-label="Sil" className="rounded-full p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {adding && <WeightEditor onClose={() => setAdding(false)} onSaved={fetchAll} />}
      {editingGoal && <GoalEditor initial={goal} onClose={() => setEditingGoal(false)} onSave={saveGoal} />}
      <BottomNav />
    </div>
  );
}

function WeightEditor({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(dateKey(new Date()));
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      toast.error("Oturum bulunamadı.");
      return;
    }
    const w = parseFloat(weight.replace(",", "."));
    if (!w || w <= 0 || w >= 500) {
      toast.error("Geçerli bir kilo gir.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("weight_entries")
      .upsert({ user_id: userId, date, weight_kg: w, note: note.trim() || null }, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) toast.error("Kaydedilemedi.");
    else {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-5 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Ölçüm ekle</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground"><X size={18} /></button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">İdeal olarak sabah aç karnına, hep aynı koşullarda ölç.</p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Tarih</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Kilo (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              autoFocus
              placeholder="örn. 62.4"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Not (opsiyonel)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} className={inputCls} />
          </label>
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
  initial,
  onClose,
  onSave,
}: {
  initial: number | null;
  onClose: () => void;
  onSave: (val: number | null) => void;
}) {
  const [val, setVal] = useState(initial !== null ? String(initial) : "");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-5 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Hedef kilo (opsiyonel)</h2>
        <p className="mb-3 text-xs text-muted-foreground">Hedef zorunlu değil. Boş bırakırsan grafik sadece eğilimi gösterir.</p>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Kilo (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="boş bırakabilirsin"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className={inputCls}
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onSave(null)}
            className="flex-1 rounded-xl border border-border bg-background py-2 text-sm hover:bg-muted"
          >
            Kaldır
          </button>
          <button
            onClick={() => {
              const n = parseFloat(val.replace(",", "."));
              if (!val) return onSave(null);
              if (!n || n <= 0 || n >= 500) {
                toast.error("Geçerli bir değer gir.");
                return;
              }
              onSave(n);
            }}
            className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30";