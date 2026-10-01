# Ruma Finance

Aplikasi pengelolaan keuangan pribadi dengan Next.js, Supabase Auth/Postgres, dan ekstraksi nota melalui OpenAI.

## Menjalankan lokal

1. `npm install`
2. Buat proyek di Supabase. Di Project Settings, salin Project URL dan Publishable key.
3. Di Supabase SQL Editor, jalankan seluruh isi `supabase/migrations/20261001_ruma_finance.sql`.
4. Buka `.env.local` yang sudah ada (atau buat dari `.env.example`) dan tambahkan URL serta publishable key Supabase. Pertahankan `OPENAI_API_KEY` yang sudah kamu isi. Jangan commit file `.env.local`.
5. Di Authentication > URL Configuration, set Site URL ke alamat aplikasi dan tambahkan URL lokal serta domain Vercel ke Redirect URLs.
6. Jalankan `npm run dev`.

Di Vercel, tambahkan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan `OPENAI_API_KEY` pada Environment Variables, lalu redeploy. Jangan pernah menaruh secret OpenAI di variabel `NEXT_PUBLIC_` atau GitHub.

Data transaksi, anggaran dan tabungan disimpan per akun. Kebijakan Row Level Security di migration membatasi setiap akun ke datanya sendiri. Untuk akun baru dengan konfirmasi email, pengguna harus membuka tautan konfirmasi sebelum masuk.

