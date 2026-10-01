import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI belum dikonfigurasi. Tambahkan OPENAI_API_KEY di environment Vercel." }, { status: 503 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Pilih foto nota terlebih dahulu." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Ukuran gambar maksimal 10 MB." }, { status: 413 });
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini", response_format: { type: "json_object" }, messages: [{ role: "system", content: "Baca nota belanja. Ambil judul singkat/merchant, total pembayaran akhir dalam angka rupiah, kategori Bahasa Indonesia. Jangan mengarang. Balas JSON: {\"title\":string,\"amount\":number,\"category\":string}. Amount angka tanpa pemisah." }, { role: "user", content: [{ type: "text", text: "Baca nota ini dan ambil total yang benar-benar dibayar." }, { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}`, detail: "high" } }] }], temperature: 0 }) });
  if (!response.ok) return NextResponse.json({ error: "AI gagal membaca nota. Coba gunakan foto yang lebih jelas." }, { status: 502 });
  const data = await response.json();
  try { const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}"); if (typeof parsed.amount !== "number" || parsed.amount <= 0) throw new Error(); return NextResponse.json({ transaction: { title: String(parsed.title || "Pengeluaran dari nota").slice(0, 100), amount: parsed.amount, category: String(parsed.category || "Lainnya").slice(0, 60) } }); }
  catch { return NextResponse.json({ error: "Nominal pada nota belum terbaca. Coba foto ulang dengan lebih jelas." }, { status: 422 }); }
}
