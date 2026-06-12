import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MealInput = z.object({
  mealType: z.enum(["kahvalti", "ogle", "aksam", "ara"]),
  preference: z.string().max(120).optional().default(""),
  phase: z.enum(["menstrual", "follicular", "ovulation", "luteal"]).optional().nullable(),
  dayOfCycle: z.number().int().min(1).max(60).optional().nullable(),
});

const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number().int().min(1).max(12),
  prepMinutes: z.number().int().min(0).max(240),
  phaseNote: z.string(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
      unit: z.string(),
    }),
  ).min(1),
  steps: z.array(z.string()).min(1),
  tips: z.array(z.string()).optional().default([]),
});

export type Recipe = z.infer<typeof RecipeSchema>;

const FridgeInput = z.object({
  ingredients: z.array(z.string().min(1).max(60)).min(1).max(40),
  phase: z.enum(["menstrual", "follicular", "ovulation", "luteal"]).optional().nullable(),
});

const FridgeResponseSchema = z.object({
  recipes: z.array(RecipeSchema.extend({
    missingButHelpful: z.array(z.string()).optional().default([]),
  })).min(1).max(3),
});

export type FridgeRecipe = z.infer<typeof FridgeResponseSchema>["recipes"][number];

const MEAL_LABEL: Record<string, string> = {
  kahvalti: "kahvaltı",
  ogle: "öğle yemeği",
  aksam: "akşam yemeği",
  ara: "ara öğün / atıştırmalık",
};

const PHASE_HINT: Record<string, string> = {
  menstrual: "Menstrüel faz: demir ve B12 açısından zengin, sıcak ve rahatlatıcı yemekler iyi gelir.",
  follicular: "Folliküler faz: hafif protein, taze sebzeler, fermente besinler güzel uyum sağlar.",
  ovulation: "Ovulasyon: antioksidan açısından zengin renkli sebzeler, lifli ve hafif tarifler önerilir.",
  luteal: "Luteal faz: magnezyumdan zengin besinler (kabak çekirdeği, koyu yeşillik, bitter çikolata) ve kompleks karbonhidratlar (yulaf, tatlı patates, tam tahıl) iyi gelir.",
};

export const suggestMeal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MealInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY tanımlı değil.");

    const phaseHint = data.phase ? PHASE_HINT[data.phase] : "Döngü bilgisi yok — genel dengeli öneri ver.";
    const mealLabel = MEAL_LABEL[data.mealType];

    const system = `Sen sıcak, yargısız bir beslenme rehberisin. Türkçe konuşursun. Kalori saymazsın, kısıtlayıcı diyet önermezsin. Dengeli, sürdürülebilir ve keyifli yemekler önerirsin. Türk mutfağına ve kolay bulunan malzemelere öncelik verirsin. Yanıtın SADECE geçerli bir JSON nesnesi olsun, başka metin ekleme.`;

    const user = `Bir ${mealLabel} önerisi hazırla.
Kullanıcı tercihi: ${data.preference || "belirtilmedi"}.
Döngü ipucu: ${phaseHint}

Şu JSON şemasına UYGUN tek bir nesne döndür:
{
  "title": "Yemeğin adı",
  "description": "1-2 cümle sıcak tanıtım",
  "servings": 2,
  "prepMinutes": 25,
  "phaseNote": "Bu öneri döngü fazıyla nasıl uyumlu, 1-2 cümle. Faz bilinmiyorsa neden dengeli olduğunu söyle.",
  "ingredients": [{"name": "...", "amount": 1, "unit": "su bardağı"}],
  "steps": ["Adım 1...", "Adım 2..."],
  "tips": ["Opsiyonel küçük ipucu"]
}
Sadece JSON döndür.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Şu an çok yoğunuz, biraz sonra tekrar dener misin?");
      if (res.status === 402) throw new Error("AI kredisi tükendi. Lütfen workspace ayarlarından kredi ekle.");
      throw new Error(`Yemek önerisi alınamadı (${res.status}). ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Yapay zeka geçerli bir tarif döndürmedi.");
      parsed = JSON.parse(match[0]);
    }
    const recipe = RecipeSchema.parse(parsed);
    return { recipe };
  });

export const suggestFromFridge = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => FridgeInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY tanımlı değil.");

    const phaseHint = data.phase ? PHASE_HINT[data.phase] : "Döngü bilgisi yok — genel dengeli öneri yeterli.";

    const system = `Sen sıcak, yargısız bir beslenme rehberisin. Türkçe konuşursun. Kalori saymazsın. Kullanıcının evdeki malzemelerine bakıp pratik, sağlıklı, dengeli yemekler önerirsin. Önerilerin gerçekçi olsun — uydurma malzeme ekleme; eklemek istediğin küçük şeyleri "missingButHelpful" alanına yaz. Yanıtın SADECE geçerli JSON olsun.`;

    const user = `Evimde şu malzemeler var:
${data.ingredients.map((i) => `- ${i}`).join("\n")}

Döngü ipucu: ${phaseHint}

Bu malzemelerle yapılabilecek 2 veya 3 sağlıklı yemek öner. Her tarifte ağırlıklı olarak verilen malzemeleri kullan. Tuz, karabiber, zeytinyağı, su gibi temel şeyleri varsayabilirsin. Eksik ama tarifi belirgin geliştirecek 1-2 malzeme varsa nazikçe "missingButHelpful" listesine ekle (boş bırakabilirsin).

Şu JSON şemasına uy:
{
  "recipes": [
    {
      "title": "Yemek adı",
      "description": "1-2 cümle sıcak tanıtım",
      "servings": 2,
      "prepMinutes": 20,
      "phaseNote": "Bu öneri neden iyi gelir, 1 cümle",
      "ingredients": [{"name": "...", "amount": 1, "unit": "su bardağı"}],
      "steps": ["Adım 1...", "Adım 2..."],
      "tips": ["Opsiyonel ipucu"],
      "missingButHelpful": ["şu da olsa daha güzel olur"]
    }
  ]
}
Sadece JSON döndür.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Şu an çok yoğunuz, biraz sonra tekrar dener misin?");
      if (res.status === 402) throw new Error("AI kredisi tükendi. Lütfen workspace ayarlarından kredi ekle.");
      throw new Error(`Öneri alınamadı (${res.status}). ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Yapay zeka geçerli bir tarif döndürmedi.");
      parsed = JSON.parse(match[0]);
    }
    const result = FridgeResponseSchema.parse(parsed);
    return result;
  });