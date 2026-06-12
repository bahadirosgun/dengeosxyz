import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HabitLite = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
});

const ProgramInput = z.object({
  habits: z.array(HabitLite).max(50),
  phase: z.enum(["menstrual", "follicular", "ovulation", "luteal"]).optional().nullable(),
  wakeHour: z.number().int().min(4).max(11).default(7),
  sleepHour: z.number().int().min(20).max(26).default(23),
});

const BlockSchema = z.object({
  title: z.string().min(1).max(80),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  habitId: z.string().optional().nullable(),
  note: z.string().optional().default(""),
});

const ProgramResponse = z.object({
  blocks: z.array(BlockSchema).min(3).max(20),
  rationale: z.string().max(400),
});

export type SuggestedBlock = z.infer<typeof BlockSchema>;

const PHASE_HINT: Record<string, string> = {
  menstrual: "Menstrüel faz: enerji düşük olabilir. Yoğun antrenmandan kaçın, hafif yürüyüş ve dinlenme ağırlıklı bir gün öner.",
  follicular: "Folliküler faz: enerji yükseliyor. Yoğun egzersizi, yeni başlangıçları, odak gerektiren işleri bu güne yerleştir.",
  ovulation: "Ovulasyon: zirve enerji. Sosyal aktivite, ekip işleri, kardiyo iyi gider.",
  luteal: "Luteal faz: enerji yavaşlıyor. Yoga, esneme, sakin tempoda görevler, erken yatma önerilir.",
};

export const suggestProgram = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ProgramInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY tanımlı değil.");

    const phaseHint = data.phase ? PHASE_HINT[data.phase] : "Döngü bilgisi yok — genel dengeli bir gün kur.";
    const habitList = data.habits.length
      ? data.habits.map((h) => `- ${h.name} [${h.category}] (id: ${h.id})`).join("\n")
      : "(kullanıcının kayıtlı alışkanlığı yok)";

    const system = `Sen sıcak, yargısız bir günlük ritim koçusun. Türkçe konuşursun. Kullanıcının alışkanlıklarına ve döngü fazına göre dengeli, gerçekçi bir günlük program kurarsın. Aşırı doldurmazsın, boşluk ve dinlenme bırakırsın. Yanıtın SADECE geçerli JSON olsun.`;

    const user = `Kullanıcının alışkanlıkları:
${habitList}

Döngü ipucu: ${phaseHint}

Uyanma saati: ${data.wakeHour}:00
Yatma saati: ${data.sleepHour}:00

Bu güne 6-12 arası zaman bloğu öner. Bloklar çakışmasın, kronolojik olsun, dakika cinsinden ifade edilsin (örn. 07:30 = 450). Mevcut alışkanlıklardan uygun olanları kullan ve habitId alanına ilgili id'yi yaz. Ek aktiviteler (kahvaltı, çalışma, mola, akşam yemeği, dinlenme) ekle — bunların habitId'si null olsun. Her bloğun süresi 15-120 dk arasında olsun.

Şu JSON şemasına uy:
{
  "blocks": [
    {"title":"Sabah yürüyüşü","startMinute":420,"endMinute":450,"habitId":"h_xxx","note":""}
  ],
  "rationale": "Bu programı neden böyle kurduğunun 1-2 cümle özeti."
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
      throw new Error(`Program önerisi alınamadı (${res.status}). ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Yapay zeka geçerli bir program döndürmedi.");
      parsed = JSON.parse(match[0]);
    }
    return ProgramResponse.parse(parsed);
  });