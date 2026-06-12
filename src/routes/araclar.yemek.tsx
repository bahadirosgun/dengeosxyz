import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Sparkles, Loader2, X, Plus } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BottomNav } from "@/components/BottomNav";
import { RecipeCard } from "@/components/RecipeCard";
import {
  suggestMeal,
  suggestFromFridge,
  type Recipe,
  type FridgeRecipe,
} from "@/lib/api/meal.functions";
import { loadCycle, loadCycleForGender, computeCycle } from "@/lib/cycle";

export const Route = createFileRoute("/araclar/yemek")({
  head: () => ({
    meta: [
      { title: "Yemek — DengeOS" },
      { name: "description", content: "Döngünü ve tercihini dikkate alan, yargısız ve dengeli yemek önerileri." },
    ],
  }),
  component: MealPage,
});

type MealType = "kahvalti" | "ogle" | "aksam" | "ara";

const MEAL_OPTIONS: { value: MealType; label: string; emoji: string }[] = [
  { value: "kahvalti", label: "Kahvaltı", emoji: "🌅" },
  { value: "ogle", label: "Öğle", emoji: "☀️" },
  { value: "aksam", label: "Akşam", emoji: "🌙" },
  { value: "ara", label: "Ara öğün", emoji: "🍎" },
];

const PREF_CHIPS = [
  "Yüksek protein",
  "Hafif",
  "Vejetaryen",
  "Vegan",
  "Glutensiz",
  "Kompleks karbonhidrat",
  "Hızlı (15 dk)",
  "Tek tencere",
];

function MealPage() {
  const [tab, setTab] = useState<"suggest" | "fridge">("suggest");
  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="mx-auto max-w-md px-5 pt-6">
        <Link
          to="/araclar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> Araçlar
        </Link>

        <header className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Yemek</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Dengeli, yargısız öneriler. Döngünü dikkate alır, kalori saymaz.
          </p>
        </header>

        <div className="mt-5 flex gap-2 rounded-2xl bg-muted p-1">
          {([
            { id: "suggest" as const, label: "Öneri" },
            { id: "fridge" as const, label: "Buzdolabım" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "suggest" ? <SuggestView /> : <FridgeView />}
      </div>
      <BottomNav />
    </div>
  );
}

function SuggestView() {
  const [mealType, setMealType] = useState<MealType>("kahvalti");
  const [pref, setPref] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = useServerFn(suggestMeal);

  const toggleChip = (chip: string) => {
    const parts = pref.split(",").map((p) => p.trim()).filter(Boolean);
    const idx = parts.indexOf(chip);
    if (idx >= 0) parts.splice(idx, 1);
    else parts.push(chip);
    setPref(parts.join(", "));
  };

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const cycle = loadCycleForGender();
      const info = cycle ? computeCycle(cycle) : null;
      const { recipe } = await suggest({
        data: {
          mealType,
          preference: pref,
          phase: info?.phase ?? null,
          dayOfCycle: info?.dayOfCycle ?? null,
        },
      });
      setRecipe(recipe);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="mt-5 rounded-3xl bg-card p-4 ring-1 ring-border">
          <h2 className="text-sm font-medium text-foreground">Hangi öğün?</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {MEAL_OPTIONS.map((opt) => {
              const active = mealType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setMealType(opt.value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs ring-1 transition ${
                    active
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-background text-foreground ring-border hover:bg-muted"
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>

          <h2 className="mt-5 text-sm font-medium text-foreground">Tercih (opsiyonel)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PREF_CHIPS.map((chip) => {
              const active = pref.toLowerCase().includes(chip.toLowerCase());
              return (
                <button
                  key={chip}
                  onClick={() => toggleChip(chip)}
                  className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${
                    active
                      ? "bg-accent text-foreground ring-accent"
                      : "bg-background text-muted-foreground ring-border hover:text-foreground"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
          <input
            value={pref}
            onChange={(e) => setPref(e.target.value)}
            placeholder="ya da kendi notunu yaz…"
            className="mt-3 w-full rounded-2xl bg-background px-4 py-2.5 text-sm text-foreground ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
          />

          <button
            onClick={onGenerate}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Öneri hazırlanıyor…" : recipe ? "Yeni öneri al" : "Öneri al"}
          </button>
          {error ? (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          ) : null}
        </section>

      {recipe ? <div className="mt-5"><RecipeCard recipe={recipe} /></div> : null}
    </>
  );
}

function FridgeView() {
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [recipes, setRecipes] = useState<FridgeRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = useServerFn(suggestFromFridge);

  const addItem = (raw: string) => {
    const cleaned = raw.trim().replace(/,$/, "").trim();
    if (!cleaned) return;
    // allow comma-separated paste
    const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
    setItems((prev) => {
      const set = new Set(prev.map((p) => p.toLowerCase()));
      const next = [...prev];
      for (const p of parts) {
        if (!set.has(p.toLowerCase()) && next.length < 40) {
          next.push(p);
          set.add(p.toLowerCase());
        }
      }
      return next;
    });
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addItem(draft);
    } else if (e.key === "Backspace" && draft === "" && items.length > 0) {
      setItems((prev) => prev.slice(0, -1));
    }
  };

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const onGenerate = async () => {
    if (items.length === 0) {
      setError("Önce evdeki birkaç malzemeyi ekle.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cycle = loadCycleForGender();
      const info = cycle ? computeCycle(cycle) : null;
      const res = await suggest({
        data: { ingredients: items, phase: info?.phase ?? null },
      });
      setRecipes(res.recipes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  };

  const QUICK = ["Yumurta", "Domates", "Soğan", "Yoğurt", "Patates", "Mercimek", "Makarna", "Peynir", "Tavuk", "Ispanak"];

  return (
    <>
      <section className="mt-5 rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-sm font-medium text-foreground">Buzdolabımda ne var?</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Evdeki malzemeleri ekle, sana 2-3 sağlıklı tarif önereyim.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-background px-2.5 py-2 ring-1 ring-border focus-within:ring-primary">
          {items.map((it, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full bg-accent/40 px-2.5 py-1 text-xs text-foreground"
            >
              {it}
              <button
                onClick={() => removeItem(i)}
                aria-label={`${it} kaldır`}
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => addItem(draft)}
            placeholder={items.length === 0 ? "örn. yumurta, domates, peynir…" : "ekle…"}
            className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK.filter((q) => !items.some((i) => i.toLowerCase() === q.toLowerCase())).map((q) => (
            <button
              key={q}
              onClick={() => addItem(q)}
              className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-border hover:text-foreground"
            >
              <Plus size={10} /> {q}
            </button>
          ))}
        </div>

        <button
          onClick={onGenerate}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Tarifler hazırlanıyor…" : recipes.length ? "Yeniden öner" : "Tarif öner"}
        </button>
        {error ? (
          <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        ) : null}
      </section>

      {recipes.length > 0 ? (
        <div className="mt-5 space-y-4">
          {recipes.map((r, i) => (
            <RecipeCard key={i} recipe={r} missingButHelpful={r.missingButHelpful} />
          ))}
        </div>
      ) : null}
    </>
  );
}