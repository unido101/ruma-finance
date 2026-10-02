"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Check,
  CreditCard,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Pencil,
  PieChart,
  Plus,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Tab = "dashboard" | "transactions" | "budgets" | "goals";
type Modal = "transaction" | "budget" | "goal" | "contribution";

type Transaction = {
  id: string;
  title: string;
  category: string;
  kind: "income" | "expense";
  amount: number;
  occurred_on: string;
};

type Budget = {
  id: string;
  category: string;
  limit_amount: number;
  color: string;
};

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
};

type Contribution = {
  id: string;
  goal_id: string;
  amount: number;
  created_at: string;
};

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? createClient()
    : null;

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const today = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const monthKey = () => today().slice(0, 7);

const defaultExpenseCategories = [
  "Makanan & minuman",
  "Transportasi",
  "Belanja",
  "Tagihan",
  "Kesehatan",
  "Pendidikan",
  "Hiburan",
  "Lainnya",
];

const incomeCategories = [
  "Gaji",
  "Freelance",
  "Bonus",
  "Investasi",
  "Penjualan",
  "Lainnya",
];

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [modal, setModal] = useState<Modal | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Belanja");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(today());
  const [targetDate, setTargetDate] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");

  const [receiptMessage, setReceiptMessage] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    if (!supabase) return;

    setBusy(true);
    setError("");

    const [transactionResult, budgetResult, goalResult, contributionResult] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("id,title,category,kind,amount,occurred_on")
          .order("occurred_on", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("monthly_budgets")
          .select("id,category,limit_amount,color")
          .eq("period_key", monthKey())
          .order("category"),

        supabase
          .from("savings_goals")
          .select("id,name,target_amount,target_date")
          .order("created_at", { ascending: false }),

        supabase
          .from("savings_contributions")
          .select("id,goal_id,amount,created_at")
          .order("created_at", { ascending: false }),
      ]);

    const failure =
      transactionResult.error ||
      budgetResult.error ||
      goalResult.error ||
      contributionResult.error;

    if (failure) {
      setError(failure.message);
    } else {
      setTransactions(transactionResult.data || []);
      setBudgets(budgetResult.data || []);
      setGoals(goalResult.data || []);
      setContributions(contributionResult.data || []);
    }

    setBusy(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  const expenseCategories = Array.from(
    new Set([
      ...defaultExpenseCategories,
      ...budgets.map((budget) => budget.category),
    ])
  );

  const currentTransactions = transactions.filter(
    (transaction) => transaction.occurred_on.slice(0, 7) === monthKey()
  );

  const income = currentTransactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const expense = currentTransactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const spentFor = (budgetCategory: string) =>
    currentTransactions
      .filter(
        (transaction) =>
          transaction.kind === "expense" &&
          transaction.category === budgetCategory
      )
      .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const savedFor = (goalId: string) =>
    contributions
      .filter((contribution) => contribution.goal_id === goalId)
      .reduce(
        (total, contribution) => total + Number(contribution.amount),
        0
      );

  const totalBudgetLimit = budgets.reduce(
    (total, budget) => total + Number(budget.limit_amount),
    0
  );

  const totalBudgetSpent = budgets.reduce(
    (total, budget) => total + spentFor(budget.category),
    0
  );

  function closeModal() {
    setModal(null);
    setEditingId(null);
    setError("");
  }

  function openForm(
    type: Modal,
    transactionKind: "income" | "expense" = "expense",
    goalId = ""
  ) {
    setEditingId(null);
    setError("");
    setModal(type);

    setTitle("");
    setAmount("");
    setTargetDate("");
    setTransactionDate(today());
    setKind(transactionKind);
    setCategory(
      transactionKind === "income"
        ? "Gaji"
        : expenseCategories[0] || "Belanja"
    );
    setSelectedGoal(goalId || goals[0]?.id || "");
  }

  async function auth(event: FormEvent) {
    event.preventDefault();

    if (!supabase) return;

    setBusy(true);
    setError("");

    const result =
      authMode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);

    if (result.error) {
      setError(result.error.message);
    } else if (authMode === "signup" && !result.data.session) {
      notify("Akun dibuat. Cek email jika konfirmasi email aktif.");
    }
  }

  async function signInWithGoogle() {
    if (!supabase) return;

    setBusy(true);
    setError("");

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (googleError) {
      setError(googleError.message);
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!supabase || !modal) return;

    const numericAmount = Number(amount.replace(/\D/g, ""));

    if (!numericAmount || numericAmount <= 0) {
      setError("Masukkan jumlah lebih dari nol.");
      return;
    }

    setBusy(true);
    setError("");

    let result: any = null;

    if (modal === "transaction") {
      const fields = {
        title: title.trim(),
        category,
        kind,
        amount: numericAmount,
        occurred_on: transactionDate,
      };

      result = editingId
        ? await supabase.from("transactions").update(fields).eq("id", editingId)
        : await supabase.from("transactions").insert(fields);
    }

    if (modal === "budget") {
      const fields = {
        category: category.trim(),
        limit_amount: numericAmount,
        color: "#78907b",
      };

      result = editingId
        ? await supabase
            .from("monthly_budgets")
            .update(fields)
            .eq("id", editingId)
        : await supabase.from("monthly_budgets").upsert(
            { period_key: monthKey(), ...fields },
            { onConflict: "user_id,period_key,category" }
          );
    }

    if (modal === "goal") {
      const fields = {
        name: title.trim(),
        target_amount: numericAmount,
        target_date: targetDate || null,
      };

      result = editingId
        ? await supabase
            .from("savings_goals")
            .update(fields)
            .eq("id", editingId)
        : await supabase.from("savings_goals").insert(fields);
    }

    if (modal === "contribution") {
      const fields = {
        goal_id: selectedGoal,
        amount: numericAmount,
      };

      result = editingId
        ? await supabase
            .from("savings_contributions")
            .update(fields)
            .eq("id", editingId)
        : await supabase.from("savings_contributions").insert(fields);
    }

    setBusy(false);

    if (result?.error) {
      setError(result.error.message);
      return;
    }

    closeModal();
    notify(editingId ? "Perubahan berhasil disimpan" : "Data berhasil ditambahkan");
    await loadData();
  }

  async function deleteData(
    table:
      | "transactions"
      | "monthly_budgets"
      | "savings_goals"
      | "savings_contributions",
    id: string,
    label: string
  ) {
    if (!supabase) return;

    if (!window.confirm(`Hapus ${label}?`)) return;

    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    notify("Data berhasil dihapus");
    await loadData();
  }

  function receiptCategory(rawCategory: string) {
    const value = rawCategory.toLowerCase();

    if (value.includes("makan") || value.includes("kopi")) {
      return "Makanan & minuman";
    }

    if (
      value.includes("bensin") ||
      value.includes("parkir") ||
      value.includes("transport")
    ) {
      return "Transportasi";
    }

    if (
      value.includes("internet") ||
      value.includes("listrik") ||
      value.includes("tagihan")
    ) {
      return "Tagihan";
    }

    return expenseCategories.find(
      (categoryItem) => categoryItem.toLowerCase() === value
    ) || "Lainnya";
  }

  async function parseReceipt(file: File) {
    if (!supabase) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setReceiptMessage("Gunakan file PNG, JPG, atau JPEG.");
      return;
    }

    setReceiptBusy(true);
    setReceiptMessage("AI sedang membaca nota.");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/receipt", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Nota gagal dibaca.");
      }

      const receipt = result.transaction;
      const categoryFromReceipt = receiptCategory(receipt.category || "Lainnya");

      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          title: receipt.title,
          category: categoryFromReceipt,
          kind: "expense",
          amount: Number(receipt.amount),
          occurred_on: today(),
        });

      if (insertError) throw insertError;

      setReceiptMessage(
        `Nota tersimpan ke kategori ${categoryFromReceipt}.`
      );

      notify("Pengeluaran dari nota berhasil dicatat");
      await loadData();
    } catch (receiptError) {
      setReceiptMessage(
        receiptError instanceof Error
          ? receiptError.message
          : "Terjadi kesalahan."
      );
    } finally {
      setReceiptBusy(false);
    }
  }

  if (!ready) {
    return <main className="shell"><div className="auth-card">Memuat...</div></main>;
  }

  if (!user) {
    return (
      <main className="shell">
        <section className="auth-card">
          <div className="brand">
            <span className="brand-icon"><Wallet size={20} /></span>
            <span>
              ruma<span className="brand-dot">.</span>
              <small>MONEY, MADE SIMPLE</small>
            </span>
          </div>

          <h1>{authMode === "login" ? "Masuk ke Ruma" : "Buat akun Ruma"}</h1>
          <p>Data keuanganmu tersimpan di akun pribadi.</p>

          <form onSubmit={auth}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Kata sandi
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && <p className="error-message">{error}</p>}

            <button className="primary-button" disabled={busy}>
              {authMode === "login" ? "Masuk" : "Daftar"}
            </button>
          </form>

          <button
            type="button"
            className="secondary-button google-login-button"
            onClick={signInWithGoogle}
            disabled={busy}
          >
            Masuk dengan Google
          </button>

          <button
            className="auth-switch"
            onClick={() =>
              setAuthMode(authMode === "login" ? "signup" : "login")
            }
          >
            {authMode === "login"
              ? "Belum punya akun? Daftar"
              : "Sudah punya akun? Masuk"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon"><Wallet size={20} /></span>
          <span>
            ruma<span className="brand-dot">.</span>
            <small>MONEY, MADE SIMPLE</small>
          </span>
        </a>

        <div className="side-label">MENU UTAMA</div>

        <nav>
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            <CreditCard size={18} />
            <span>Transaksi</span>
          </button>

          <button
            className={`nav-item ${activeTab === "budgets" ? "active" : ""}`}
            onClick={() => setActiveTab("budgets")}
          >
            <PieChart size={18} />
            <span>Anggaran</span>
          </button>

          <button
            className={`nav-item ${activeTab === "goals" ? "active" : ""}`}
            onClick={() => setActiveTab("goals")}
          >
            <Target size={18} />
            <span>Pos tabungan</span>
          </button>
        </nav>

        <div className="side-bottom">
          <div className="profile">
            <div className="avatar">
              {(user.email || "R").slice(0, 2).toUpperCase()}
            </div>

            <div>
              <b>{user.email}</b>
              <small>Personal account</small>
            </div>

            <button onClick={() => supabase?.auth.signOut()}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="crumb"><b>{activeTab}</b></div>
        </header>

        <div className="content">
          {error && <p className="error-message">{error}</p>}

          {activeTab === "dashboard" && (
            <>
              <div className="welcome-row">
                <div>
                  <div className="eyebrow">RUMA FINANCE</div>
                  <h1>Ringkasan keuanganmu</h1>
                  <p>Rekap cashflow bulan ini.</p>
                </div>
              </div>

              <div className="stat-grid">
                <article className="stat-card balance-card">
                  <div className="stat-heading">Saldo bersih bulan ini</div>
                  <div className="stat-value">{money(income - expense)}</div>
                </article>

                <article className="stat-card">
                  <div className="stat-heading">Pemasukan</div>
                  <div className="stat-value">{money(income)}</div>
                </article>

                <article className="stat-card">
                  <div className="stat-heading">Pengeluaran</div>
                  <div className="stat-value">{money(expense)}</div>
                </article>
              </div>
            </>
          )}

          {activeTab === "transactions" && (
            <>
              <div className="welcome-row">
                <div>
                  <h1>Transaksi</h1>
                  <p>Pilih kategori anggaran saat mencatat pengeluaran.</p>
                </div>

                <div className="welcome-actions">
                  <button
                    className="income-button"
                    onClick={() => openForm("transaction", "income")}
                  >
                    <ArrowDownLeft size={16} />
                    Pemasukan
                  </button>

                  <button
                    className="primary-button"
                    onClick={() => openForm("transaction", "expense")}
                  >
                    <Plus size={16} />
                    Pengeluaran
                  </button>
                </div>
              </div>

              <section className="receipt-banner">
                <div className="receipt-art">
                  <div className="art-circle"><Camera size={25} /></div>
                </div>

                <div className="receipt-copy">
                  <span className="ai-pill">DIDUKUNG AI</span>
                  <h3>Foto atau unggah nota</h3>
                  <p>Format: PNG, JPG, dan JPEG.</p>
                </div>

                <button onClick={() => cameraRef.current?.click()}>
                  <Camera size={16} />
                  Foto nota
                </button>

                <button onClick={() => uploadRef.current?.click()}>
                  <Upload size={16} />
                  Unggah nota
                </button>

                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  capture="environment"
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void parseReceipt(file);
                    event.currentTarget.value = "";
                  }}
                />

                <input
                  ref={uploadRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void parseReceipt(file);
                    event.currentTarget.value = "";
                  }}
                />
              </section>

              {receiptMessage && (
                <div className="receipt-status">{receiptMessage}</div>
              )}

              <section className="panel transactions-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Daftar transaksi</h2>
                    <p>{transactions.length} transaksi tersimpan</p>
                  </div>
                </div>

                <div className="transaction-list">
                  {transactions.map((transaction) => (
                    <div className="transaction-row" key={transaction.id}>
                      <span className="transaction-icon">
                        {transaction.kind === "income" ? (
                          <ArrowDownLeft size={15} />
                        ) : (
                          <ArrowUpRight size={15} />
                        )}
                      </span>

                      <div className="transaction-name">
                        <b>{transaction.title}</b>
                        <small>
                          {transaction.category} -{" "}
                          {new Date(
                            `${transaction.occurred_on}T00:00:00`
                          ).toLocaleDateString("id-ID")}
                        </small>
                      </div>

                      <b className={transaction.kind === "income" ? "amount-in" : "amount-out"}>
                        {transaction.kind === "income" ? "+" : "-"}
                        {money(Number(transaction.amount))}
                      </b>

                      <Actions
                        onEdit={() => {
                          setEditingId(transaction.id);
                          setModal("transaction");
                          setTitle(transaction.title);
                          setCategory(transaction.category);
                          setKind(transaction.kind);
                          setAmount(String(transaction.amount));
                          setTransactionDate(transaction.occurred_on);
                        }}
                        onDelete={() =>
                          void deleteData(
                            "transactions",
                            transaction.id,
                            transaction.title
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === "budgets" && (
            <section className="panel budget-panel">
              <div className="panel-heading">
                <div>
                  <h2>Anggaran bulan ini</h2>
                  <p>Kategori di sini otomatis muncul pada pengeluaran.</p>
                </div>

                <button className="primary-button" onClick={() => openForm("budget")}>
                  <Plus size={16} />
                  Tambah
                </button>
              </div>

              <div className="budget-total">
                <div>
                  <small>Total terpakai</small>
                  <b>
                    {money(totalBudgetSpent)}
                    <span> / {money(totalBudgetLimit)}</span>
                  </b>
                </div>
              </div>

              <div className="budget-list">
                {budgets.map((budget) => (
                  <div className="budget-row" key={budget.id}>
                    <div className="budget-label">
                      <span>{budget.category}</span>
                      <b>
                        {money(spentFor(budget.category))} /{" "}
                        {money(Number(budget.limit_amount))}
                      </b>

                      <Actions
                        onEdit={() => {
                          setEditingId(budget.id);
                          setModal("budget");
                          setCategory(budget.category);
                          setAmount(String(budget.limit_amount));
                        }}
                        onDelete={() =>
                          void deleteData(
                            "monthly_budgets",
                            budget.id,
                            budget.category
                          )
                        }
                      />
                    </div>

                    <div className="progress">
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            (spentFor(budget.category) /
                              Number(budget.limit_amount)) *
                              100
                          )}%`,
                          background: budget.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "goals" && (
            <section className="panel goals-panel">
              <div className="panel-heading">
                <div>
                  <h2>Pos tabungan</h2>
                  <p>Tujuan dan setoranmu.</p>
                </div>

                <button className="primary-button" onClick={() => openForm("goal")}>
                  <Plus size={16} />
                  Tambah
                </button>
              </div>

              <div className="goal-list">
                {goals.map((goal) => (
                  <div className="goal-row" key={goal.id}>
                    <div className="goal-top">
                      <div className="goal-name">
                        <span><Target size={14} /></span>
                        <div>
                          <b>{goal.name}</b>
                          <small>Target {money(Number(goal.target_amount))}</small>
                        </div>
                      </div>

                      <Actions
                        onEdit={() => {
                          setEditingId(goal.id);
                          setModal("goal");
                          setTitle(goal.name);
                          setAmount(String(goal.target_amount));
                          setTargetDate(goal.target_date || "");
                        }}
                        onDelete={() =>
                          void deleteData(
                            "savings_goals",
                            goal.id,
                            goal.name
                          )
                        }
                      />
                    </div>

                    <div className="progress goal-progress">
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            (savedFor(goal.id) / Number(goal.target_amount)) * 100
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="goal-foot">
                      <span>{money(savedFor(goal.id))} terkumpul</span>
                      <span>Target {money(Number(goal.target_amount))}</span>
                    </div>

                    <button
                      className="goal-action"
                      onClick={() => openForm("contribution", "expense", goal.id)}
                    >
                      <Plus size={13} />
                      Tambah setoran
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {busy && <div className="loading-note">Memproses...</div>}
        </div>
      </section>

      {modal && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="modal-title">
              <div>
                <span className="modal-icon"><Wallet size={18} /></span>
                <div>
                  <h2>{editingId ? "Edit data" : "Tambah data"}</h2>
                  <p>Data tersimpan di akunmu.</p>
                </div>
              </div>

              <button onClick={closeModal}><X size={19} /></button>
            </div>

            <form onSubmit={save}>
              {modal === "transaction" && (
                <>
                  <label>
                    Jenis transaksi
                    <div className="kind-switch">
                      <button
                        type="button"
                        className={kind === "income" ? "selected" : ""}
                        onClick={() => {
                          setKind("income");
                          setCategory("Gaji");
                        }}
                      >
                        Pemasukan
                      </button>

                      <button
                        type="button"
                        className={kind === "expense" ? "selected" : ""}
                        onClick={() => {
                          setKind("expense");
                          setCategory(expenseCategories[0]);
                        }}
                      >
                        Pengeluaran
                      </button>
                    </div>
                  </label>

                  <label>
                    Nama transaksi
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Kategori
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      {(kind === "income" ? incomeCategories : expenseCategories).map(
                        (item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Tanggal
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={(event) => setTransactionDate(event.target.value)}
                    />
                  </label>
                </>
              )}

              {modal === "budget" && (
                <label>
                  Kategori anggaran
                  <input
                    list="budget-categories"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Pilih atau tulis kategori baru"
                    required
                  />

                  <datalist id="budget-categories">
                    {expenseCategories.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
              )}

              {modal === "goal" && (
                <>
                  <label>
                    Nama tujuan
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Target waktu
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(event) => setTargetDate(event.target.value)}
                    />
                  </label>
                </>
              )}

              {modal === "contribution" && (
                <label>
                  Pos tabungan
                  <select
                    value={selectedGoal}
                    onChange={(event) => setSelectedGoal(event.target.value)}
                  >
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Jumlah (Rp)
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </label>

              {error && <p className="error-message">{error}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                >
                  Batal
                </button>

                <button className="primary-button" disabled={busy}>
                  <Check size={16} />
                  Simpan
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </main>
  );
}

function Actions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="row-actions">
      <button type="button" onClick={onEdit} title="Edit">
        <Pencil size={13} />
      </button>

      <button type="button" onClick={onDelete} title="Hapus">
        <Trash2 size={13} />
      </button>
    </span>
  );
}