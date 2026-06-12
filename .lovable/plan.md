## DengeOS — büyük güncelleme planı

Bu istek 6 ayrı büyük iş içeriyor. Önce planı onayına sunuyorum, sonra adım adım uygulayacağım. Uzun olduğu için 2-3 aşamada teslim etmem gerekecek.

---

### 1) Marka: "Zincir" → "DengeOS"
- `index.html` title, PWA manifest (`name`, `short_name`), favicon altı isim, Auth ekranı başlığı, Onboarding, Settings "Hakkında", tüm route `head().meta` title'larında geçen "Zincir" → "DengeOS".
- Tagline: "Sakin, dengeli, sürdürülebilir." (yeşil wellness teması zaten mevcut, dokunmuyorum.)

### 2) Cinsiyet (Kadın / Erkek)
- DB: `profiles.gender` kolonu (`'female' | 'male'`, NOT NULL eklenince eski satırlar için default + onboarding zorla seçtirme).
- Onboarding'e zorunlu cinsiyet adımı, Ayarlar'da değiştirilebilir.
- `useGender()` hook + üst seviye guard: `gender === 'male'` ise:
  - BottomNav'dan Döngü sekmesi gizli
  - Today/Insights faz kartı gizli
  - Takvim'de döngü işaretleri gizli
  - Yemek / Program / Hareket AI promptlarında faz bilgisi pas geçilir, "genel sağlık ilkeleri" prompt'u devreye girer
- Tüm döngü kodu yerinde kalır — yalnızca koşullu render (kadın seçilirse anında geri gelir).

### 3) Günce (görselli hikaye akışı)
- Supabase Storage: özel bucket `journal-media` (public=false), RLS ile yalnızca sahibi okuyup yazabilir (`{user_id}/...` path kuralı).
- DB: `journal_media` tablosu — `user_id, storage_path, caption, tag ('meal'|'movement'|'weight'|'general'), taken_at, linked_entry_id?`.
- Yeni route `/gunce`: tarih sıralı feed, kart-grid (modern, sade).
- Upload akışı: tarayıcıda `createImageBitmap` + canvas ile maks 1600px / ~80% JPEG sıkıştırma (kütüphane eklemeden), sonra `supabase.storage.upload`.
- "Yemek" ve "Tartı" sayfalarına opsiyonel "Fotoğraf ekle" → Günce'ye de yazar, linkler.

### 4) Ana sayfa widget'ları (özelleştirilebilir)
- `profiles.dashboard_widgets jsonb` — kullanıcının seçtiği ve sırası.
- Mevcut widget'lar: Adım halkası, Hareket haftalık, Tartı trendi, Alışkanlık zinciri özeti, Faz kartı (sadece kadın), Su, Ruh hali, Son Günce.
- Today ekranına kompakt grid; her widget tıklanınca ilgili sayfaya gider.
- Ayarlar → "Ana sayfa widget'ları" toggle listesi (sürükle-bırak ileride; şimdilik aç/kapa + üst-alt taşı butonları).

### 5) Hızlı ekle (FAB)
- Sağ altta sürekli görünen `+` (TodayScreen üzerinde). Aç → bottom sheet:
  Adım • Kilo • Ruh/Stres • Su • Günce fotoğrafı • Günlük (bullet) satırı.
- Her giriş minik modal/sheet; mevcut hooks ile direkt yazar.
- Sık kullanılan üstte (kullanım sayacını `localStorage`'da basit tutuyoruz; profil şişmesin).

### 6) Yayın
- `.env.example` (kod tabanına gömülmeyen) + README'ye Vercel & Cloudflare Pages için adımlar (build cmd, output, env var listesi).
- Cloudflare Pages için `wrangler.toml` (TanStack Start zaten Worker hedefliyor — uyumlu hale getirip ek talimat veriyorum).
- GitHub bağlama: Lovable'ın Plus → GitHub akışıyla yapılır; ben repo oluşturamam, kullanıcıya net adımlar veriyorum.
- Custom domain: Lovable Cloud üzerinden bağlanabilir; talimat README'de.

---

### Teknik notlar
- Supabase Storage bucket'ı **özel** (public=false). Görsel göstermek için `createSignedUrl` (1 saat) kullanılacak.
- Image küçültme: ek paket eklemeden tarayıcı `<canvas>` API'siyle (~30 satır util).
- Cinsiyet kolonu eklenirken default `'female'` veriyorum (eski kullanıcı verisi kırılmasın) ve onboarding'i tamamlamamış kullanıcılar tekrar yönlendirilecek.
- Tüm yeni tablolar RLS + GRANT ile geliyor.

### Sıra (her aşama bağımsız test edilebilir)
1. **Aşama A**: DB migration (gender, dashboard_widgets, journal_media + storage bucket) + isim değişikliği (DengeOS) + cinsiyet onboarding & guard.
2. **Aşama B**: Günce (upload + feed + Yemek/Tartı entegrasyonu).
3. **Aşama C**: Dashboard widget özelleştirme + Hızlı ekle FAB.
4. **Aşama D**: Yayın belgeleri (README, .env.example, wrangler config).

Onaylarsan Aşama A'dan başlıyorum.