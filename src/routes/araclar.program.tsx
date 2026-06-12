import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Loader2, Trash2, Pencil, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { loadState } from "@/lib/habits";
import { loadCycle, loadCycleForGender, computeCycle } from "@/lib/cycle";
import { suggestProgram } from "@/lib/api/program.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/araclar/program")({
  head: () => ({
    meta: [
      { title: "Program — DengeOS" },
      { name: "description", content: "Gününü saatlere böl; alışkanlıklarını ve dinlenmeyi dengeli yerleştir." },
    ],
  }),
  component: ProgramPage,
});

interface ScheduleBlock {
  id: string;
  date: string;
  start_minute: number;
  end_minute: number;
  title: string;
  habit_id: string | null;
  notes: string | null;
  completed: boolean;
}

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 24;
const PX_PER_MIN = 1.1; // (24-6)*60 * 1.1 ≈ 1188px tall

const fmtTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
};
const trDate = (d: Date) =>
  d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

function ProgramPage() {
  const [date, setDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ScheduleBlock | null>(null);
  const [adding, setAdding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [rationale, setRationale] = useState<string>("");

  const suggestProgramFn = useServerFn(suggestProgram);
  const dKey = dateKey(date);

  const fetchBlocks = async (key: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("date", key)
      .order("start_minute", { ascending: true });
    if (error) {
      toast.error("Program yüklenemedi.");
    } else {
      setBlocks((data ?? []) as ScheduleBlock[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBlocks(dKey);
    setRationale("");
  }, [dKey]);

  const goDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  const toggleComplete = async (b: ScheduleBlock) => {
    const next = !b.completed;
    setBlocks((prev) => prev.map((x) => (x.id === b.id ? { ...x, completed: next } : x)));
    const { error } = await supabase.from("schedule_blocks").update({ completed: next }).eq("id", b.id);
    if (error) {
      toast.error("Güncellenemedi.");
      setBlocks((prev) => prev.map((x) => (x.id === b.id ? { ...x, completed: !next } : x)));
    }
  };

  const deleteBlock = async (b: ScheduleBlock) => {
    setBlocks((prev) => prev.filter((x) => x.id !== b.id));
    const { error } = await supabase.from("schedule_blocks").delete().eq("id", b.id);
    if (error) {
      toast.error("Silinemedi.");
      fetchBlocks(dKey);
    }
  };

  const saveBlock = async (input: {
    id?: string;
    title: string;
    startMinute: number;
    endMinute: number;
    habitId: string | null;
    notes: string;
  }) => {
    const userRes = await supabase.auth.getUser();
    const userId = userRes.data.user?.id;
    if (!userId) {
      toast.error("Oturum bulunamadı.");
      return;
    }
    if (input.endMinute <= input.startMinute) {
      toast.error("Bitiş, başlangıçtan sonra olmalı.");
      return;
    }
    if (input.id) {
      const { error } = await supabase
        .from("schedule_blocks")
        .update({
          title: input.title,
          start_minute: input.startMinute,
          end_minute: input.endMinute,
          habit_id: input.habitId,
          notes: input.notes || null,
        })
        .eq("id", input.id);
      if (error) {
        toast.error("Güncellenemedi.");
        return;
      }
    } else {
      const { error } = await supabase.from("schedule_blocks").insert({
        user_id: userId,
        date: dKey,
        title: input.title,
        start_minute: input.startMinute,
        end_minute: input.endMinute,
        habit_id: input.habitId,
        notes: input.notes || null,
      });
      if (error) {
        toast.error("Eklenemedi.");
        return;
      }
    }
    setEditing(null);
    setAdding(false);
    fetchBlocks(dKey);
  };

  const runAi = async () => {
    setAiLoading(true);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) throw new Error("Oturum bulunamadı.");
      const state = loadState();
      const cyc = loadCycleForGender();
      const phase = cyc ? computeCycle(cyc, date).phase : null;
      const result = await suggestProgramFn({
        data: {
          habits: state.habits.map((h) => ({ id: h.id, name: h.name, category: h.category })),
          phase,
          wakeHour: 7,
          sleepHour: 23,
        },
      });
      // replace day's blocks
      await supabase.from("schedule_blocks").delete().eq("date", dKey);
      const rows = result.blocks.map((b) => ({
        user_id: userId,
        date: dKey,
        title: b.title,
        start_minute: Math.max(0, Math.min(1439, b.startMinute)),
        end_minute: Math.max(1, Math.min(1440, b.endMinute)),
        habit_id: b.habitId ?? null,
        notes: b.note || null,
      }));
      const { error } = await supabase.from("schedule_blocks").insert(rows);
      if (error) throw error;
      setRationale(result.rationale);
      await fetchBlocks(dKey);
      toast.success("Program oluşturuldu.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Öneri alınamadı.");
    } finally {
      setAiLoading(false);
    }
  };

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR) * 60 * PX_PER_MIN;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 pt-6">
        <header className="mb-4 flex items-center gap-3">
          <Link to="/araclar" className="rounded-full bg-card p-2 ring-1 ring-border" aria-label="Geri">
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Program</h1>
            <p className="text-xs text-muted-foreground">Gününü saatlere böl, dengeli yerleştir.</p>
          </div>
        </header>

        {/* Date selector */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-card p-2 ring-1 ring-border">
          <button
            onClick={() => goDay(-1)}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Önceki gün"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="text-sm font-medium text-foreground first-letter:uppercase">{trDate(date)}</div>
            <button
              onClick={() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                setDate(d);
              }}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Bugüne dön
            </button>
          </div>
          <button
            onClick={() => goDay(1)}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Sonraki gün"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Actions */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setAdding(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} /> Blok ekle
          </button>
          <button
            onClick={runAi}
            disabled={aiLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-3 py-2.5 text-sm font-medium text-foreground ring-1 ring-border hover:opacity-90 disabled:opacity-60"
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} AI öner
          </button>
        </div>

        {rationale && (
          <div className="mb-4 rounded-2xl bg-sage-soft p-3 text-xs text-foreground/80 ring-1 ring-border">
            ✨ {rationale}
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-3xl bg-card p-3 ring-1 ring-border">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <div className="relative" style={{ height: totalHeight }}>
              {/* hour lines */}
              {hours.map((h, idx) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 flex items-start gap-2"
                  style={{ top: idx * 60 * PX_PER_MIN }}
                >
                  <span className="w-10 shrink-0 pt-0 text-[11px] tabular-nums text-muted-foreground">
                    {String(h).padStart(2, "0")}:00
                  </span>
                  <div className="mt-2 h-px flex-1 bg-border/60" />
                </div>
              ))}
              {/* blocks */}
              <div className="absolute left-12 right-0 top-0 bottom-0">
                {blocks.map((b) => {
                  const top = (b.start_minute - DAY_START_HOUR * 60) * PX_PER_MIN;
                  const height = Math.max(28, (b.end_minute - b.start_minute) * PX_PER_MIN - 4);
                  return (
                    <div
                      key={b.id}
                      className={`absolute left-0 right-1 overflow-hidden rounded-xl border p-2 text-xs shadow-sm ${
                        b.completed
                          ? "border-primary/30 bg-primary/15 text-foreground/70 line-through"
                          : "border-border bg-sage-soft text-foreground"
                      }`}
                      style={{ top, height }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{b.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {fmtTime(b.start_minute)} – {fmtTime(b.end_minute)}
                          </div>
                          {b.notes && height > 60 && (
                            <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{b.notes}</div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => toggleComplete(b)}
                            aria-label={b.completed ? "Tamamlandı işaretini kaldır" : "Tamamlandı işaretle"}
                            className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                              b.completed
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditing(b)}
                            aria-label="Düzenle"
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => deleteBlock(b)}
                            aria-label="Sil"
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {blocks.length === 0 && !loading && (
                  <div className="absolute inset-x-0 top-10 text-center text-xs text-muted-foreground">
                    Henüz blok yok — bir tane ekle veya AI'dan öner iste.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {(adding || editing) && (
        <BlockEditor
          initial={editing}
          onCancel={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSave={saveBlock}
        />
      )}
      <BottomNav />
    </div>
  );
}

function BlockEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: ScheduleBlock | null;
  onCancel: () => void;
  onSave: (input: {
    id?: string;
    title: string;
    startMinute: number;
    endMinute: number;
    habitId: string | null;
    notes: string;
  }) => void;
}) {
  const habits = loadState().habits;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [start, setStart] = useState(fmtTime(initial?.start_minute ?? 480));
  const [end, setEnd] = useState(fmtTime(initial?.end_minute ?? 540));
  const [habitId, setHabitId] = useState<string>(initial?.habit_id ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const toMin = (s: string) => {
    const [h, m] = s.split(":").map((x) => parseInt(x, 10) || 0);
    return h * 60 + m;
  };

  const submit = () => {
    if (!title.trim()) {
      toast.error("Başlık gerekli.");
      return;
    }
    onSave({
      id: initial?.id,
      title: title.trim(),
      startMinute: toMin(start),
      endMinute: toMin(end),
      habitId: habitId || null,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-3xl bg-card p-5 ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          {initial ? "Bloğu düzenle" : "Yeni blok"}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Başlık</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="örn. Yürüyüş"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Başlangıç</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Bitiş</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          {habits.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Alışkanlığa bağla (opsiyonel)</label>
              <select
                value={habitId}
                onChange={(e) => setHabitId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— Yok —</option>
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Not (opsiyonel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-background py-2 text-sm text-foreground hover:bg-muted"
          >
            Vazgeç
          </button>
          <button
            onClick={submit}
            className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}