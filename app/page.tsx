"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Bell, Camera, ChevronDown, ChevronRight, CircleHelp, CreditCard, FileText, LayoutDashboard, MoreHorizontal, Plus, Receipt, Settings, Target, TrendingUp, Wallet, X, Sparkles, Check, Upload, LoaderCircle, PieChart, CalendarDays } from "lucide-react";

type Tx = { id: number; title: string; category: string; date: string; amount: number; kind: "income" | "expense"; icon: string; month: string };
const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const initialTx: Tx[] = [
  { id: 1, title: "Gaji bulanan", category: "Pemasukan", date: "Hari ini, 09:12", month: "2026-10", amount: 12500000, kind: "income", icon: "\u2022" },
  { id: 2, title: "Belanja bulanan", category: "Belanja", date: "Hari ini, 08:45", month: "2026-10", amount: 685000, kind: "expense", icon: "\u2022" },
  { id: 3, title: "Kopi Kenangan", category: "Makanan & minuman", date: "30 Sep 2026, 16:20", month: "2026-09", amount: 42000, kind: "expense", icon: "\u2022" },
  { id: 4, title: "Tagihan internet", category: "Tagihan", date: "29 Sep 2026, 10:05", month: "2026-09", amount: 350000, kind: "expense", icon: "\u2022" },
  { id: 5, title: "Freelance project", category: "Pemasukan", date: "28 Sep 2026, 14:30", month: "2026-09", amount: 1800000, kind: "income", icon: "\u2022" },
];
const initialBudgets = [
  { name: "Makanan & minuman", spent: 1850000, total: 2500000, color: "#ee8d69", icon: "\u2022" },
  { name: "Transportasi", spent: 680000, total: 1000000, color: "#7d8ce8", icon: "\u2022" },
  { name: "Belanja", spent: 1250000, total: 1800000, color: "#e9bb5c", icon: "\u2022" },
  { name: "Tagihan", spent: 940000, total: 1200000, color: "#50a890", icon: "\u2022" },
];
const initialGoals = [
  { name: "Dana darurat", saved: 8500000, target: 15000000, color: "#78907b", icon: "\u2022", due: "Des 2026" },
  { name: "Liburan ke Jepang", saved: 6200000, target: 12000000, color: "#ddaa68", icon: "\u2022", due: "Jun 2027" },
  { name: "Laptop baru", saved: 4500000, target: 8000000, color: "#8b83cc", icon: "\u2022", due: "Mar 2027" },
];
const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function HomePage() {
  const [transactions, setTransactions] = useState(initialTx);
  const [storageReady, setStorageReady] = useState(false);
  const [allocations, setAllocations] = useState(initialBudgets);
  const [goals, setGoals] = useState(initialGoals);
  const [toolModal, setToolModal] = useState<"budget" | "goal" | "contribute" | null>(null);
  const [toolName, setToolName] = useState("");
  const [toolAmount, setToolAmount] = useState("");
  const [goalDue, setGoalDue] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState("Dashboard");
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptMessage, setReceiptMessage] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualKind, setManualKind] = useState<Tx["kind"]>("expense");
  const [manualCategory, setManualCategory] = useState("Belanja");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try { const saved = localStorage.getItem("ruma-transactions"); if (saved) setTransactions((JSON.parse(saved) as Partial<Tx>[]).map(t => ({ ...t, month: t.month || currentMonthKey })) as Tx[]); const savedBudgets = localStorage.getItem("ruma-budgets"); if (savedBudgets) setAllocations(JSON.parse(savedBudgets)); const savedGoals = localStorage.getItem("ruma-goals"); if (savedGoals) setGoals(JSON.parse(savedGoals)); } catch { /* keep sample data if storage is unavailable */ }
    setStorageReady(true);
  }, []);
  useEffect(() => { if (storageReady) { localStorage.setItem("ruma-transactions", JSON.stringify(transactions)); localStorage.setItem("ruma-budgets", JSON.stringify(allocations)); localStorage.setItem("ruma-goals", JSON.stringify(goals)); } }, [transactions, allocations, goals, storageReady]);
  const currentTransactions = useMemo(() => transactions.filter(t => t.month === currentMonthKey), [transactions]);
  const expense = useMemo(() => currentTransactions.filter(t => t.kind === "expense").reduce((s,t) => s+t.amount, 0), [currentTransactions]);
  const income = useMemo(() => currentTransactions.filter(t => t.kind === "income").reduce((s,t) => s+t.amount, 0), [currentTransactions]);
  const spentFor = (category: string) => currentTransactions.filter(t => t.kind === "expense" && t.category === category).reduce((sum, t) => sum + t.amount, 0);
  const budgetSpent = allocations.reduce((sum, b) => sum + spentFor(b.name), 0);
  const currentBalance = 6935000 + income - expense;
  const budgetLimit = allocations.reduce((sum, b) => sum + b.total, 0);
  const chartMonths = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - 5 + index); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; const items = transactions.filter(t => t.month === key); return { key, label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date), income: items.filter(t => t.kind === "income").reduce((sum, t) => sum + t.amount, 0), expense: items.filter(t => t.kind === "expense").reduce((sum, t) => sum + t.amount, 0) }; });
  const chartMax = Math.max(1, ...chartMonths.flatMap(m => [m.income, m.expense]));
  const chartPath = (kind: "income" | "expense") => chartMonths.map((m, index) => `${index === 0 ? "M" : "L"}${index * 140} ${185 - m[kind] / chartMax * 155}`).join(" ");
  const shortRupiah = (amount: number) => `Rp ${(amount / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2800); };
  async function parseReceipt(file: File) {
    setReceiptBusy(true); setReceiptMessage("AI sedang membaca nota…");
    try {
      const data = new FormData(); data.append("file", file);
      const response = await fetch("/api/receipt", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nota belum bisa dibaca.");
      const tx = result.transaction;
      setTransactions(prev => [{ id: Date.now(), title: tx.title, category: tx.category || "Lainnya", date: "Hari ini", month: currentMonthKey, amount: Number(tx.amount), kind: "expense", icon: "\u2022" }, ...prev]);
      setReceiptMessage(`Tersimpan: ${tx.title} - ${rupiah(Number(tx.amount))}`); notify("Pengeluaran dari nota berhasil dicatat");
    } catch (error) { setReceiptMessage(error instanceof Error ? error.message : "Terjadi kesalahan."); }
    finally { setReceiptBusy(false); }
  }
  function saveTool(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(toolAmount.replace(/\D/g, ""));
    if (toolModal === "budget" && toolName && amount) {
      setAllocations(prev => [...prev, { name: toolName, spent: 0, total: amount, color: "#78907b", icon: "\u2022" }]);
      notify("Alokasi bulanan ditambahkan");
    } else if (toolModal === "goal" && toolName && amount) {
      setGoals(prev => [...prev, { name: toolName, saved: 0, target: amount, color: "#78907b", icon: "\u2022", due: goalDue || "Belum ditentukan" }]);
      notify("Pos tabungan dibuat");
    } else if (toolModal === "contribute" && selectedGoal && amount) {
      setGoals(prev => prev.map(g => g.name === selectedGoal ? { ...g, saved: g.saved + amount } : g));
      notify("Setoran tabungan dicatat");
    }
    setToolName(""); setToolAmount(""); setGoalDue(""); setToolModal(null);
  }
  function addManual(e: React.FormEvent) {
    e.preventDefault(); const amount = Number(manualAmount.replace(/\D/g, ""));
    if (!manualTitle || !amount) return;
    setTransactions(prev => [{ id: Date.now(), title: manualTitle, category: manualCategory, date: "Hari ini", month: currentMonthKey, amount, kind: manualKind, icon: "\u2022" }, ...prev]);
    setManualTitle(""); setManualAmount(""); setManualKind("expense"); setModal(false); notify("Transaksi berhasil dicatat");
  }
  return <main className="shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-icon"><Wallet size={20}/></span><span>ruma<span className="brand-dot">.</span><small>MONEY, MADE SIMPLE</small></span></a>
      <div className="side-label">MENU UTAMA</div>
      <nav>{[[LayoutDashboard,"Dashboard"],[CreditCard,"Transaksi"],[PieChart,"Anggaran"],[Target,"Pos tabungan"]].map(([Icon,label]: any) => <button key={label} className={`nav-item ${menu===label?"active":""}`} onClick={()=>{setMenu(label); if(label!=="Dashboard") notify(`${label} siap kamu kelola di sini`);}}><Icon size={18}/><span>{label}</span>{label==="Transaksi"&&<span className="nav-count">{transactions.length}</span>}</button>)}</nav>
      <div className="side-label second-label">LAINNYA</div><nav><button className="nav-item" onClick={()=>notify("Laporan bulanan sedang disiapkan")}><FileText size={18}/><span>Laporan</span></button><button className="nav-item" onClick={()=>notify("Pengaturan akun")}><Settings size={18}/><span>Pengaturan</span></button></nav>
      <div className="side-bottom"><div className="help-card"><span className="help-icon"><CircleHelp size={16}/></span><b>Butuh bantuan?</b><small>Kami siap membantu kamu.</small><button onClick={()=>notify("Pusat bantuan akan segera hadir")}>Kunjungi pusat bantuan <span>↗</span></button></div><div className="profile"><div className="avatar">AN</div><div><b>Andi Nugraha</b><small>Personal account</small></div><MoreHorizontal size={19}/></div></div>
    </aside>
    <section className="main-area"><header className="topbar"><div className="crumb"><span>Workspace</span><ChevronRight size={14}/><b>{menu}</b></div><div className="top-actions"><button className="icon-button" onClick={()=>notify("Belum ada notifikasi baru")} aria-label="Notifikasi"><Bell size={18}/><i/></button><div className="top-divider"/><div className="month-select"><CalendarDays size={16}/> {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date())} <ChevronDown size={14}/></div></div></header>
      <div className="content"><div className="welcome-row"><div><div className="eyebrow">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toLocaleUpperCase("id-ID")} <span className="sun">✳</span></div><h1>Selamat pagi, Andi <span>☀️</span></h1><p>Ini ringkasan keuanganmu bulan ini. Kamu sudah melakukan hal hebat!</p></div><button className="primary-button" onClick={()=>setModal(true)}><Plus size={17}/> Catat transaksi</button></div>
        <div className="stat-grid"><article className="stat-card balance-card"><div className="stat-heading">Total saldo <button onClick={()=>notify("Saldo dari semua akun")}><MoreHorizontal size={19}/></button></div><div className="stat-value">{rupiah(currentBalance)}</div><div className="stat-foot"><span className="trend"><TrendingUp size={14}/> 12,8%</span><span> dibanding bulan lalu</span></div><div className="balance-decoration"><span/><span/><span/></div></article><article className="stat-card"><div className="stat-heading">Pemasukan <span className="stat-icon income-icon"><ArrowDownLeft size={17}/></span></div><div className="stat-value">{rupiah(income)}</div><div className="stat-foot"><span className="trend"><TrendingUp size={14}/> 8,2%</span><span> dibanding bulan lalu</span></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article><article className="stat-card"><div className="stat-heading">Pengeluaran <span className="stat-icon expense-icon"><ArrowUpRight size={17}/></span></div><div className="stat-value">{rupiah(expense)}</div><div className="stat-foot"><span className="trend down"><TrendingUp size={14}/> 4,3%</span><span> dibanding bulan lalu</span></div><div className="mini-bars orange"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article></div>
        <div className="dashboard-grid"><section className="panel cashflow-panel"><div className="panel-heading"><div><h2>Arus kas</h2><p>Perbandingan pemasukan & pengeluaran</p></div><button className="period-button" onClick={()=>notify("Menampilkan data 6 bulan terakhir")}>6 bulan terakhir <ChevronDown size={14}/></button></div><div className="chart-legend"><span><i className="legend-in"/> Pemasukan</span><span><i className="legend-out"/> Pengeluaran</span></div><div className="chart"><div className="y-labels"><span>{shortRupiah(chartMax)}</span><span>{shortRupiah(chartMax * 2 / 3)}</span><span>{shortRupiah(chartMax / 3)}</span><span>Rp 0</span></div><div className="plot"><div className="gridline g1"/><div className="gridline g2"/><div className="gridline g3"/><div className="gridline g4"/><svg viewBox="0 0 700 205" preserveAspectRatio="none" aria-label="Grafik arus kas enam bulan"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#758d79" stopOpacity=".18"/><stop offset="1" stopColor="#758d79" stopOpacity="0"/></linearGradient></defs><path d={chartPath("income") + " L700 205 L0 205Z"} fill="url(#fill)"/><path d={chartPath("income")} fill="none" stroke="#758d79" strokeWidth="3"/><path d={chartPath("expense")} fill="none" stroke="#e6ad70" strokeWidth="3"/></svg><div className="x-labels">{chartMonths.map(m=><span key={m.key}>{m.label}</span>)}</div></div></div></section>
          <section className="panel budget-panel"><div className="panel-heading"><div><h2>Anggaran bulan ini</h2><p>Pengeluaran berdasarkan kategori</p></div><button className="text-link" onClick={()=>setToolModal("budget") }>Lihat semua <ChevronRight size={15}/></button></div><div className="budget-total"><div><small>Total terpakai</small><b>{rupiah(budgetSpent)} <span>/ {rupiah(budgetLimit)}</span></b></div><div className="budget-ring" style={{background:`conic-gradient(#758c78 0 ${Math.min(100, Math.round(budgetSpent / Math.max(1, budgetLimit) * 100))}%, #edf1eb ${Math.min(100, Math.round(budgetSpent / Math.max(1, budgetLimit) * 100))}% 100%)`}}><div><b>{Math.round(budgetSpent / Math.max(1, budgetLimit) * 100)}%</b><small>terpakai</small></div></div></div><div className="budget-list">{allocations.map(b=><div className="budget-row" key={b.name}><div className="budget-label"><span className="budget-emoji">{b.icon}</span><span>{b.name}</span><b>{rupiah(spentFor(b.name))}</b></div><div className="progress"><i style={{width:`${Math.min(100,spentFor(b.name)/b.total*100)}%`,background:b.color}}/></div></div>)}</div></section>
          <section className="panel transactions-panel"><div className="panel-heading"><div><h2>Transaksi terbaru</h2><p>Aktivitas keuangan terakhirmu</p></div><button className="text-link" onClick={()=>{setMenu("Transaksi");notify("Riwayat transaksi ditampilkan")}}>Lihat semua <ChevronRight size={15}/></button></div><div className="transaction-list">{transactions.slice(0,5).map(t=><div className="transaction-row" key={t.id}><span className="transaction-icon">{t.icon}</span><div className="transaction-name"><b>{t.title}</b><small>{t.category} <span>-</span> {t.date}</small></div><b className={t.kind==="income"?"amount-in":"amount-out"}>{t.kind==="income"?"+":"−"}{rupiah(t.amount)}</b></div>)}</div></section>
          <section className="panel goals-panel"><div className="panel-heading"><div><h2>Pos tabungan</h2><p>Pelan-pelan, tujuanmu makin dekat</p></div><button className="round-plus" onClick={()=>setToolModal("goal")}><Plus size={17}/></button></div><div className="goal-list">{goals.map(g=><div className="goal-row" key={g.name}><div className="goal-top"><div className="goal-name"><span>{g.icon}</span><div><b>{g.name}</b><small>Target {g.due}</small></div></div><b>{Math.round(g.saved/g.target*100)}%</b></div><div className="progress goal-progress"><i style={{width:`${g.saved/g.target*100}%`,background:g.color}}/></div><div className="goal-foot"><span>{rupiah(g.saved)} <small>terkumpul</small></span><span>{rupiah(g.target)}</span></div></div>)}</div><button className="goal-action" onClick={()=>{setSelectedGoal(goals[0]?.name || "");setToolModal("contribute")}}>Tambah setoran tabungan <ChevronRight size={15}/></button></section></div>
        <section className="receipt-banner"><div className="receipt-art"><div className="art-circle"><Receipt size={27}/><Sparkles size={15}/></div></div><div className="receipt-copy"><span className="ai-pill"><Sparkles size={12}/> DIDUKUNG AI</span><h3>Nota numpuk? Biar Ruma yang catat.</h3><p>Foto atau unggah nota, pengeluaranmu otomatis masuk ke laporan.</p></div><button onClick={()=>fileRef.current?.click()} disabled={receiptBusy}>{receiptBusy?<LoaderCircle className="spin" size={17}/>:<Camera size={17}/>} {receiptBusy?"Membaca nota…":"Scan nota"}</button><input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void parseReceipt(f);e.currentTarget.value=""}}/></section>{receiptMessage&&<div className={`receipt-status ${receiptMessage.startsWith("Tersimpan")?"success":""}`}>{receiptMessage.startsWith("Tersimpan")&&<Check size={15}/>} {receiptMessage}</div>}
        <footer>© 2026 Ruma Finance <span>Dirancang untuk hidup yang lebih tenang.</span><button onClick={()=>notify("Privasi & keamanan")}>Privasi & keamanan</button></footer>
      </div></section>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><section className="modal"><div className="modal-title"><div><span className="modal-icon"><Wallet size={18}/></span><div><h2>Catat transaksi</h2><p>Masukkan pemasukan atau pengeluaran.</p></div></div><button onClick={()=>setModal(false)}><X size={19}/></button></div><form onSubmit={addManual}><label>Nama transaksi<input autoFocus value={manualTitle} onChange={e=>setManualTitle(e.target.value)} placeholder="Contoh: Makan siang" required/></label><label>Jenis transaksi<select value={manualKind} onChange={e=>setManualKind(e.target.value as Tx["kind"])}><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label><label>Kategori<select value={manualCategory} onChange={e=>setManualCategory(e.target.value)}><option>Makanan & minuman</option><option>Transportasi</option><option>Belanja</option><option>Tagihan</option><option>Kesehatan</option><option>Lainnya</option></select></label><label>Jumlah (Rp)<input inputMode="numeric" value={manualAmount} onChange={e=>setManualAmount(e.target.value)} placeholder="Contoh: 50000" required/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>{setModal(false);fileRef.current?.click()}}><Upload size={15}/> Unggah nota</button><button className="primary-button" type="submit"><Plus size={16}/> Simpan transaksi</button></div></form></section></div>}
    {toolModal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setToolModal(null)}}><section className="modal"><div className="modal-title"><div><span className="modal-icon">{toolModal==="budget"?<PieChart size={18}/>:<Target size={18}/>}</span><div><h2>{toolModal==="budget"?"Tambah alokasi bulanan":toolModal==="goal"?"Buat pos tabungan":"Catat setoran"}</h2><p>{toolModal==="budget"?"Tentukan batas pengeluaran kategori ini.":toolModal==="goal"?"Pilih tujuan dan target tabungan.":"Tambahkan setoran ke salah satu tujuanmu."}</p></div></div><button onClick={()=>setToolModal(null)}><X size={19}/></button></div><form onSubmit={saveTool}>{toolModal==="contribute"?<label>Pos tabungan<select value={selectedGoal} onChange={e=>setSelectedGoal(e.target.value)} required>{goals.map(g=><option key={g.name} value={g.name}>{g.name}</option>)}</select></label>:<label>{toolModal==="budget"?"Nama kategori":"Nama tujuan"}<input autoFocus value={toolName} onChange={e=>setToolName(e.target.value)} placeholder={toolModal==="budget"?"Contoh: Kesehatan":"Contoh: Dana pendidikan"} required/></label>}<label>{toolModal==="budget"?"Batas per bulan (Rp)":toolModal==="goal"?"Target tabungan (Rp)":"Jumlah setoran (Rp)"}<input inputMode="numeric" value={toolAmount} onChange={e=>setToolAmount(e.target.value)} placeholder="Contoh: 1000000" required/></label>{toolModal==="goal"&&<label>Target waktu<input value={goalDue} onChange={e=>setGoalDue(e.target.value)} placeholder="Contoh: Des 2027"/></label>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setToolModal(null)}>Batal</button><button className="primary-button" type="submit"><Check size={16}/> Simpan</button></div></form></section></div>}    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </main>;
}















