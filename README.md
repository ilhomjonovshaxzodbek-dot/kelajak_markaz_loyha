# Kelajak Markazi Platformasi — GitHub va Railway Deploy Qo‘llanmasi

Ushbu loyiha Express + Vite React (TypeScript), Firebase (Firestore + Google Auth), Gemini AI va Telegram Bot integratsiyasi bilan Railway serverida ishga tushirishga to‘liq moslashtirilgan.

## 1. GitHub'ga yuklash

1. Loyihani ZIP qilib yuklab oling (yoki lokal kompyuterdan `git push` qiling).
2. GitHub'da yangi repozitoriy yarating (`kelajak-markazi`) va barcha fayllarni yuklang.
   - `node_modules/`, `dist/`, `.env*` va `data/*.json` `.gitignore` orqali avtomatik chiqarib tashlangan.

## 2. Railway'da ishga tushirish (`railway.app`)

1. [Railway](https://railway.app) saytiga GitHub akkauntingiz bilan kiring.
2. **New Project -> Deploy from GitHub repo** tugmasini bosing va `kelajak-markazi` repozitoriyasini tanlang.
3. Railway `railway.json` faylini avtomatik o‘qiydi:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start` (`NODE_ENV=production tsx server.ts`)
   - **Healthcheck**: `/api/health`

## 3. Railway Variables (Muhit o‘zgaruvchilari)

Railway servisi -> **Variables** bo‘limiga quyidagilarni kiriting:

- `GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/apikey) dan olingan API kalit
- `GEMINI_MODEL` — tashqi API kalit uchun ixtiyoriy model nomi (masalan: `gemini-2.5-flash`)
- `TELEGRAM_BOT_TOKEN` — `@BotFather` dan olingan bot tokeni; kiritilsa server yoqilganda bot avtomatik ulanadi (token saytdan kiritilmaydi)
- `APP_URL` — Railway bergan domen (masalan: `https://kelajak-markazi-production.up.railway.app`)
- `DATA_DIR` — (ixtiyoriy) agar Railway Volume ulasangiz, masalan `/data`

> **Eslatma:** `PORT` Railway tomonidan avtomatik beriladi, uni qo‘lda kiritish shart emas.

## 4. Firebase Google Kirish (Auth) uchun Domen Qo‘shish (MUHIM!)

Railway saytingizga domen bergach (masalan `kelajak-markazi-production.up.railway.app`), Google orqali kirish ishlashi uchun:

1. [Firebase Console](https://console.firebase.google.com/) -> **`sylvan-nirvana-0klwk`** loyihasini oching.
2. **Authentication -> Settings -> Authorized domains -> Add domain** bo‘limiga kiring.
3. Railway domeningizni (masalan `kelajak-markazi-production.up.railway.app`) qo‘shing va saqlang.
