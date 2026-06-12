import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Zap, X, Check, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  type AppState,
  type Habit,
  type HabitCategory,
  HABIT_SUGGESTIONS,
  addHabit,
  deleteHabit,
  loadState,
  saveState,
  updateHabit,
} from "@/lib/habits";

const categories: HabitCategory[] = ["Kilo", "Stres", "Genel"];

const categoryStyles: Record<HabitCategory, string> = {
  Kilo: "bg-sage-soft",
  Stres: "bg-sky-soft",
  Genel: "bg-earth-soft",
};

type EditorState =
  | { mode: "create"; preset?: { name: string; category: HabitCategory } }
  | { mode: "edit"; habit: Habit }
  | null;

export function HabitsScreen() {
  const [state, setState] = useState<AppState | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  const update = (next: AppState) => {
    setState(next);
    saveState(next);
  };

  const existingNames = useMemo(
    () => new Set((state?.habits ?? []).map((h) => h.name.toLowerCase())),
    [state],
  );

  if (!state) return null;

  const grouped = categories.map((c) => ({
    category: c,
    items: state.habits.filter((h) => h.category === c),
  }));

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Alışkanlıkların
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Küçük, sevdiğin alışkanlıkları seç. İstediğin zaman değiştirebilirsin.
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

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setEditor({ mode: "create" })}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        >
          <Plus size={18} /> Yeni ekle
        </button>
        <button
          onClick={() => setShowSuggestions((v) => !v)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm font-medium text-foreground ring-1 ring-border"
        >
          <Sparkles size={16} /> Öneriler
        </button>
      </div>

      {showSuggestions && (
        <section className="mb-6 rounded-3xl bg-card p-4 ring-1 ring-border">
          <h2 className="text-sm font-semibold text-foreground">Hazır öneriler</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Bir tanesine dokun, kendi ritmine göre uyarlayıp ekle.
          </p>
          {categories.map((cat) => (
            <div key={cat} className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${categoryStyles[cat]}`}>
                  {cat}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {HABIT_SUGGESTIONS[cat].map((s) => {
                  const already = existingNames.has(s.toLowerCase());
                  return (
                    <button
                      key={s}
                      disabled={already}
                      onClick={() =>
                        setEditor({ mode: "create", preset: { name: s, category: cat } })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${
                        already
                          ? "cursor-not-allowed bg-muted text-muted-foreground ring-border"
                          : "bg-background text-foreground ring-border hover:bg-sage-soft"
                      }`}
                    >
                      {already ? `✓ ${s}` : `+ ${s}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="space-y-6">
        {grouped.map((g) => (
          <section key={g.category}>
            <h2 className="mb-2 flex items-center gap-2 px-1">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${categoryStyles[g.category]}`}>
                {g.category}
              </span>
              <span className="text-xs text-muted-foreground">{g.items.length} alışkanlık</span>
            </h2>
            {g.items.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
                Henüz {g.category.toLowerCase()} kategorisinde alışkanlık yok.
              </p>
            ) : (
              <div className="space-y-2">
                {g.items.map((h) => (
                  <article
                    key={h.id}
                    className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-medium text-foreground">{h.name}</h3>
                      {h.trigger && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                          <Zap size={11} className="mt-[3px] shrink-0 text-primary" />
                          <span><span className="italic">{h.trigger}</span> → bunu yap</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditor({ mode: "edit", habit: h })}
                      aria-label="Düzenle"
                      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${h.name}" silinsin mi?`)) {
                          update(deleteHabit(state, h.id));
                        }
                      }}
                      aria-label="Sil"
                      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {editor && (
        <HabitEditor
          editor={editor}
          onClose={() => setEditor(null)}
          onSave={(data) => {
            if (editor.mode === "create") {
              update(addHabit(state, data));
            } else {
              update(updateHabit(state, editor.habit.id, data));
            }
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function HabitEditor({
  editor,
  onClose,
  onSave,
}: {
  editor: NonNullable<EditorState>;
  onClose: () => void;
  onSave: (data: { name: string; category: HabitCategory; trigger?: string }) => void;
}) {
  const initial =
    editor.mode === "edit"
      ? { name: editor.habit.name, category: editor.habit.category, trigger: editor.habit.trigger ?? "" }
      : { name: editor.preset?.name ?? "", category: editor.preset?.category ?? "Kilo", trigger: "" };

  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState<HabitCategory>(initial.category);
  const [trigger, setTrigger] = useState(initial.trigger);

  const canSave = name.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-5 ring-1 ring-border sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {editor.mode === "edit" ? "Alışkanlığı düzenle" : "Yeni alışkanlık"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Alışkanlık</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: 10 dakika yürüyüş"
            className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
          />
        </label>

        <div className="mt-4">
          <span className="text-xs font-medium text-muted-foreground">Kategori</span>
          <div className="mt-1 flex gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm font-medium transition ring-1 ${
                  category === c
                    ? `${categoryStyles[c]} text-foreground ring-primary`
                    : "bg-background text-muted-foreground ring-border hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Zap size={11} className="text-primary" />
            Tetikleyici (eğer/o zaman) — isteğe bağlı
          </span>
          <input
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="Örn: Akşam yemeğinden sonra"
            className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Mevcut bir alışkanlığa bağlamak hatırlamayı kolaylaştırır.
          </span>
        </label>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-muted px-4 py-3 text-sm font-medium text-foreground"
          >
            Vazgeç
          </button>
          <button
            disabled={!canSave}
            onClick={() => onSave({ name: name.trim(), category, trigger: trigger.trim() || undefined })}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Check size={16} /> Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}