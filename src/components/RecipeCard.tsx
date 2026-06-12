import { useState } from "react";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import type { Recipe } from "@/lib/api/meal.functions";

export function RecipeCard({
  recipe,
  missingButHelpful,
}: {
  recipe: Recipe;
  missingButHelpful?: string[];
}) {
  const [servings, setServings] = useState(recipe.servings);
  const scale = servings / recipe.servings;
  const fmtAmount = (n: number) => {
    const v = n * scale;
    if (v >= 10) return String(Math.round(v));
    return Math.round(v * 10) / 10 + "";
  };

  return (
    <article className="rounded-3xl bg-card p-5 ring-1 ring-border">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-soft">
          <UtensilsCrossed size={20} className="text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">{recipe.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{recipe.description}</p>
        </div>
      </div>

      {recipe.phaseNote ? (
        <p className="mt-4 rounded-2xl bg-accent/30 px-3 py-2 text-xs text-foreground">
          💚 {recipe.phaseNote}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-background px-3 py-2 ring-1 ring-border">
        <span className="text-xs text-muted-foreground">Porsiyon</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            className="rounded-full bg-muted p-1.5 text-foreground"
            aria-label="Porsiyon azalt"
          >
            <Minus size={14} />
          </button>
          <span className="w-6 text-center text-sm font-medium text-foreground">{servings}</span>
          <button
            onClick={() => setServings((s) => Math.min(12, s + 1))}
            className="rounded-full bg-muted p-1.5 text-foreground"
            aria-label="Porsiyon arttır"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">~{recipe.prepMinutes} dk</span>
      </div>

      <h3 className="mt-5 text-sm font-semibold text-foreground">Malzemeler</h3>
      <ul className="mt-2 space-y-1.5">
        {recipe.ingredients.map((ing, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-sm text-foreground">
            <span>{ing.name}</span>
            <span className="text-xs text-muted-foreground">
              {fmtAmount(ing.amount)} {ing.unit}
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-sm font-semibold text-foreground">Yapılışı</h3>
      <ol className="mt-2 space-y-2.5">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-foreground">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      {recipe.tips && recipe.tips.length > 0 ? (
        <>
          <h3 className="mt-5 text-sm font-semibold text-foreground">İpuçları</h3>
          <ul className="mt-2 space-y-1.5">
            {recipe.tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground">• {tip}</li>
            ))}
          </ul>
        </>
      ) : null}

      {missingButHelpful && missingButHelpful.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-sky-soft/40 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">Şu da olsa…</p>
          <ul className="mt-1 space-y-0.5">
            {missingButHelpful.map((m, i) => (
              <li key={i} className="text-xs text-muted-foreground">+ {m}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}