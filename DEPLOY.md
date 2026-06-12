# DengeOS — GitHub, Vercel, Cloudflare ve Supabase yayın rehberi

DengeOS, TanStack Start + React + Supabase kullanan server/client bir uygulamadır.
Yemek ve programdaki AI çağrıları server tarafında çalışır; bu yüzden secret key'ler
tarayıcıya verilmez.

## 1. Git hazırlığı

```bash
git init
git branch -M main
git add .
git commit -m "Initial DengeOS deployment setup"
git remote add origin https://github.com/<kullanici>/<repo>.git
git push -u origin main
```

`.env`, `.vercel`, `node_modules`, `dist` ve `.output` Git'e girmez.

## 2. Supabase tarafı

Supabase CLI ile proje bağlama:

```bash
npx supabase login
npx supabase link --project-ref dtmisljjfrsfgbebwmtq
npx supabase db push
```

Bu migration'lar şunları hazırlar:

- `profiles`, `habits`, `day_logs`, `week_freeze_usage`
- `cycle_settings`
- `journal_entries`
- `movement_entries`, `weight_entries`, `schedule_blocks`
- `journal_media`
- private `journal-media` Storage bucket
- Kullanıcıya özel RLS politikaları

Supabase Auth ayarları:

1. Supabase Dashboard → Authentication → URL Configuration.
2. Site URL: `https://<domainin>`
3. Redirect URLs:
   - `https://<domainin>`
   - `https://<domainin>/sifre-sifirla`
   - Vercel preview kullanacaksan `https://*.vercel.app/**`

Google OAuth kullanılacaksa:

1. Supabase Dashboard → Authentication → Providers → Google.
2. Google Cloud Console'daki OAuth Client bilgilerini gir.
3. Authorized redirect URI olarak Supabase'in verdiği callback URL'yi Google'a ekle.

## 3. Vercel deploy

Vercel Dashboard:

1. **Add New → Project**
2. GitHub repo'yu seç.
3. Framework: `Vite`
4. Build Command: `npm run build`
5. Install Command: `npm install`

Bu repo `vite.config.ts` içinde Nitro'yu Vercel preset'iyle build eder. `vercel.json`
minimum ayarı tutar; asıl server build Nitro tarafından hazırlanır.

Vercel → Project Settings → Environment Variables:

| Değişken | Ortam | Açıklama |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Production + Preview | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production + Preview | Supabase publishable/anon key |
| `VITE_SUPABASE_PROJECT_ID` | Production + Preview | `dtmisljjfrsfgbebwmtq` |
| `SUPABASE_URL` | Production + Preview | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Production + Preview | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | Sadece server-side; tarayıcıya girmez |
| `LOVABLE_API_KEY` | Production + Preview | AI Gateway key |
| `VITE_APP_URL` | Production | `https://<domainin>` |

Deploy sonrası Vercel'in verdiği `*.vercel.app` URL'yi açıp:

- Kayıt/giriş
- Onboarding
- Bugün ekranı
- Keşfet
- Yemek AI önerisi
- Program AI önerisi
- Günce fotoğraf yükleme

akışlarını kontrol et.

## 4. Cloudflare ile alan adı bağlama

Cloudflare DNS'te domain Vercel'e yönlenecek.

Vercel Dashboard → Project → Settings → Domains:

1. Domaini ekle: `<domainin>`
2. Vercel'in verdiği DNS kayıtlarını Cloudflare'a gir.

Tipik kayıtlar:

| Tip | Name | Target | Proxy |
| --- | --- | --- | --- |
| A | `@` | Vercel'in verdiği IP | DNS only veya Proxied |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only veya Proxied |

Vercel domain doğrulaması tamamlanana kadar Cloudflare proxy'yi geçici olarak
**DNS only** yapmak daha sorunsuzdur. Doğrulama ve SSL tamamlandıktan sonra proxied
açılabilir.

Cloudflare SSL/TLS:

- Mode: `Full`
- Always Use HTTPS: On
- Automatic HTTPS Rewrites: On

## 5. Yerel geliştirme

```bash
cp .env.example .env
npm install
npm run dev
```

Yerel URL:

```text
http://127.0.0.1:5173/
```

## 6. Yayın öncesi kontrol

```bash
npm run build
npm audit --audit-level=moderate
```

Not: Projede mevcut Prettier/lint borcu var. Build yayına engel değil, ama CI'da
`npm run lint` zorunlu yapılacaksa tüm dosyalar formatlanmalı.
