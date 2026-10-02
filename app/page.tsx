"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  CalendarDays,
  Check,
  ChevronRight,
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

type ModalType = "transaction" | "budget" | "goal" | "contribution";
type TabType = "dashboard" | "transactions" | "budgets" | "goals";

const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const today = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentMonth = () => today().slice(0, 7);

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

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? createClient()
    : null;

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [modal, setModal] = useState<ModalType | null>(null);
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

  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptMessage, setReceiptMessage] = useState("");

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const tabTitle = {
    dashboard: "Dashboard",
    transactions: "Transaksi",
    budgets: "Anggaran",
    goals: "Pos tabungan",
  }[activeTab];

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    if (!supabase) return;

    setBusy(true);
    setError("");

    const [transactionData, budgetData, goalData, contributionData] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("id,title,category,kind,amount,occurred_on")
          .order("occurred_on", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("monthly_budgets")
          .select("id,category,limit_amount,color")
          .eq("period_key", currentMonth())
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
      transactionData.error ||
      budgetData.error ||
      goalData.error ||
      contributionData.error;

    if (failure) {
      setError(failure.message);
    } else {
      setTransactions(transactionData.data || []);
      setBudgets(budgetData.data || []);
      setGoals(goalData.data || []);
      setContributions(contributionData.data || []);
    }

    setBusy(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user, loadData]);

  const expenseCategories = useMemo(
    () =>
      Array.from(
        new Set([
          ...defaultExpenseCategories,
          ...budgets.map((budget) => budget.category),
        ])
      ),
    [budgets]
  );

  const transactionCategories =
    kind === "income" ? incomeCategories : expenseCategories;

  const thisMonthTransactions = transactions.filter(
    (transaction) => transaction.occurred_on?.slice(0, 7) === currentMonth()
  );

  const income = thisMonthTransactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const expense = thisMonthTransactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const spentFor = (budgetCategory: string) =>
    thisMonthTransactions
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

  function openForm(
    type: ModalType,
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

    if (type === "budget") {
      setCategory(expenseCategories[0] || "Belanja");
    } else if (transactionKind === "income") {
      setCategory("Gaji");
    } else {
      setCategory(expenseCategories[0] || "Belanja");
    }

    setSelectedGoal(goalId || goals[0]?.id || "");
  }

  function closeForm() {
    setModal(null);
    setEditingId(null);
    setError("");
  }

  function editTransaction(item: Transaction) {
    setEditingId(item.id);
    setModal("transaction");
    setTitle(item.title);
    setCategory(item.category);
    setKind(item.kind);
    setAmount(String(Number(item.amount)));
    setTransactionDate(item.occurred_on);
    setError("");
  }

  function editBudget(item: Budget) {
    setEditingId(item.id);
    setModal("budget");
    setCategory(item.category);
    setAmount(String(Number(item.limit_amount)));
    setError("");
  }

  function editGoal(item: Goal) {
    setEditingId(item.id);
    setModal("goal");
    setTitle(item.name);
    setAmount(String(Number(item.target_amount)));
    setTargetDate(item.target_date || "");
    setError("");
  }

  function editContribution(item: Contribution) {
    setEditingId(item.id);
    setModal("contribution");
    setSelectedGoal(item.goal_id);
    setAmount(String(Number(item.amount)));
    setError("");
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
      notify("Cek email untuk konfirmasi akun.");
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!supabase || !modal) return;

    const numberAmount = Number(amount.replace(/\D/g, ""));

    if (!numberAmount || numberAmount <= 0) {
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
        amount: numberAmount,
        occurred_on: transactionDate,
      };

      result = editingId
        ? await supabase.from("transactions").update(fields).eq("id", editingId)
        : await supabase.from("transactions").insert(fields);
    }

    if (modal === "budget") {
      const fields = {
  category: category.trim(),
  limit_amount: numberAmount,
  color: "#78907b",
};

      result = editingId
        ? await supabase
            .from("monthly_budgets")
            .update(fields)
            .eq("id", editingId)
        : await supabase.from("monthly_budgets").upsert(
            {
              period_key: currentMonth(),
              ...fields,
            },
            {
              onConflict: "user_id,period_key,category",
            }
          );
    }

    if (modal === "goal") {
      const fields = {
        name: title.trim(),
        target_amount: numberAmount,
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
        amount: numberAmount,
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

    closeForm();
    notify(editingId ? "Perubahan berhasil disimpan" : "Data berhasil ditambahkan");
    await loadData();
  }

  async function deleteData(
    table: "transactions" | "monthly_budgets" | "savings_goals" | "savings_contributions",
    id: string,
    label: string
  ) {
    if (!supabase) return;

    if (!window.confirm(`Hapus ${label}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setBusy(true);

    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    setBusy(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    notify("Data berhasil dihapus");
    await loadData();
  }

  function normalizeReceiptCategory(rawCategory: string) {
    const text = rawCategory.toLowerCase();

    if (text.includes("makan") || text.includes("minum") || text.includes("kopi")) {
      return expenseCategories.find((item) => item === "Makanan & minuman") || "Lainnya";
    }

    if (text.includes("transport") || text.includes("bensin") || text.includes("parkir")) {
      return expenseCategories.find((item) => item === "Transportasi") || "Lainnya";
    }

    if (text.includes("tagih") || text.includes("listrik") || text.includes("internet")) {
      return expenseCategories.find((item) => item === "Tagihan") || "Lainnya";
    }

    if (text.includes("sehat") || text.includes("obat") || text.includes("rumah sakit")) {
      return expenseCategories.find((item) => item === "Kesehatan") || "Lainnya";
    }

    return expenseCategories.find(
      (item) => item.toLowerCase() === text
    ) || "Lainnya";
  }

  async function parseReceipt(file: File) {
    if (!supabase) return;

    const allowedTypes = ["image/png", "image/jpeg"];

    if (!allowedTypes.includes(file.type)) {
      setReceiptMessage("Gunakan gambar PNG, JPG, atau JPEG.");
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

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Nota gagal dibaca.");
      }

      const transaction = json.transaction;
      const categoryFromReceipt = normalizeReceiptCategory(
        transaction.category || "Lainnya"
      );

      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          title: transaction.title,
          category: categoryFromReceipt,
          kind: "expense",
          amount: Number(transaction.amount),
          occurred_on: today(),
        });

      if (insertError) {
        throw insertError;
      }

      setReceiptMessage(
        `Tersimpan di kategori ${categoryFromReceipt}: ${transaction.title}`
      );

      notify("Pengeluaran dari nota berhasil dicatat");
      await loadData();
    } catch (parseError) {
      setReceiptMessage(
        parseError instanceof Error
          ? parseError.message
          : "Terjadi kesalahan saat membaca nota."
      );
    } finally {
      setReceiptBusy(false);
    }
  }

  if (!ready) {
    return <main className="shell"><div className="auth-card">Memuat akun...</div></main>;
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
                value={password}
                minLength={8}
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
            <span className="nav-count">{transactions.length}</span>
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
          <div className="crumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{tabTitle}</b>
          </div>

          <div className="top-actions">
            <div className="month-select">
              <CalendarDays size={16} />
              {new Intl.DateTimeFormat("id-ID", {
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">RUMA FINANCE</div>

              <h1>
                {activeTab === "dashboard" && "Ringkasan keuanganmu"}
                {activeTab === "transactions" && "Transaksi"}
                {activeTab === "budgets" && "Anggaran bulanan"}
                {activeTab === "goals" && "Pos tabungan"}
              </h1>

              <p>
                {activeTab === "dashboard" && "Pantau arus kas dan anggaran bulan ini."}
                {activeTab === "transactions" && "Catat pemasukan, pengeluaran, atau unggah nota."}
                {activeTab === "budgets" && "Kategori anggaran terhubung dengan pencatatan pengeluaran."}
                {activeTab === "goals" && "Kelola tujuan dan setoran tabungan."}
              </p>
            </div>

            {(activeTab === "dashboard" || activeTab === "transactions") && (
              <div className="welcome-actions">
                <button
                  className="income-button"
                  onClick={() => openForm("transaction", "income")}
                >
                  <ArrowDownLeft size={16} />
                  Catat pemasukan
                </button>

                <button
                  className="primary-button"
                  onClick={() => openForm("transaction", "expense")}
                >
                  <Plus size={17} />
                  Catat pengeluaran
                </button>
              </div>
            )}

            {activeTab === "budgets" && (
              <button className="primary-button" onClick={() => openForm("budget")}>
                <Plus size={17} />
                Tambah anggaran
              </button>
            )}

            {activeTab === "goals" && (
              <button className="primary-button" onClick={() => openForm("goal")}>
                <Plus size={17} />
                Buat pos tabungan
              </button>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className={`stat-grid ${activeTab !== "dashboard" ? "tab-hidden" : ""}`}>
            <article className="stat-card balance-card">
              <div className="stat-heading">Saldo bersih bulan ini</div>
              <div className="stat-value">{money(income - expense)}</div>
              <div className="stat-foot">Pemasukan dikurangi pengeluaran</div>
            </article>

            <article className="stat-card">
              <div className="stat-heading">
                Pemasukan
                <span className="stat-icon income-icon">
                  <ArrowDownLeft size={17} />
                </span>
              </div>

              <div className="stat-value">{money(income)}</div>
              <div className="stat-foot">Bulan ini</div>
            </article>

            <article className="stat-card">
              <div className="stat-heading">
                Pengeluaran
                <span className="stat-icon expense-icon">
                  <ArrowUpRight size={17} />
                </span>
              </div>

              <div className="stat-value">{money(expense)}</div>
              <div className="stat-foot">Bulan ini</div>
            </article>
          </div>

          <div className={`dashboard-grid active-${activeTab}`}>
            <section className="panel cashflow-panel">
              <div className="panel-heading">
                <div>
                  <h2>Arus kas</h2>
                  <p>Enam bulan terakhir</p>
                </div>
              </div>

              <div className="chart-legend">
                <span><i className="legend-in" /> Pemasukan</span>
                <span><i className="legend-out" /> Pengeluaran</span>
              </div>

              <div className="chart">
                <div className="y-labels">
                  <span>{money(Math.max(income, expense, 1))}</span>
                  <span>{money(Math.max(income, expense, 1) / 2)}</span>
                  <span>Rp 0</span>
                </div>

                <div className="plot">
                  <div className="gridline g1" />
                  <div className="gridline g2" />
                  <div className="gridline g4" />

                  <svg viewBox="0 0 700 205" preserveAspectRatio="none">
                    <polyline
                      points="0,185 140,180 280,160 420,170 560,120 700,80"
                      fill="none"
                      stroke="#758d79"
                      strokeWidth="3"
                    />
                    <polyline
                      points="0,185 140,180 280,175 420,165 560,150 700,135"
                      fill="none"
                      stroke="#e6ad70"
                      strokeWidth="3"
                    />
                  </svg>

                  <div className="x-labels">
                    <span>Mei</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Agu</span>
                    <span>Sep</span>
                    <span>Okt</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel budget-panel">
              <div className="panel-heading">
                <div>
                  <h2>Anggaran bulan ini</h2>
                  <p>Pengeluaran dihitung berdasarkan kategori yang sama.</p>
                </div>

                <button className="text-link" onClick={() => openForm("budget")}>
                  Tambah <Plus size={14} />
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

                      <RowActions
                        onEdit={() => editBudget(budget)}
                        onDelete={() =>
                          void deleteData(
                            "monthly_budgets",
                            budget.id,
                            `anggaran ${budget.category}`
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

                {!budgets.length && <p>Belum ada anggaran.</p>}
              </div>
            </section>

            <section className="panel transactions-panel">
              <div className="panel-heading">
                <div>
                  <h2>Transaksi</h2>
                  <p>Pilih kategori yang sudah dibuat di anggaran.</p>
                </div>

                <button
                  className="text-link"
                  onClick={() => openForm("transaction", "expense")}
                >
                  <Plus size={14} />
                  Tambah
                </button>
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

                    <RowActions
                      onEdit={() => editTransaction(transaction)}
                      onDelete={() =>
                        void deleteData(
                          "transactions",
                          transaction.id,
                          `transaksi ${transaction.title}`
                        )
                      }
                    />
                  </div>
                ))}

                {!transactions.length && <p>Belum ada transaksi.</p>}
              </div>
            </section>

            <section className="panel goals-panel">
              <div className="panel-heading">
                <div>
                  <h2>Pos tabungan</h2>
                  <p>Setoran tersimpan di akunmu.</p>
                </div>

                <button className="round-plus" onClick={() => openForm("goal")}>
                  <Plus size={17} />
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
                          <small>
                            Target {money(Number(goal.target_amount))}
                          </small>
                        </div>
                      </div>

                      <RowActions
                        onEdit={() => editGoal(goal)}
                        onDelete={() =>
                          void deleteData(
                            "savings_goals",
                            goal.id,
                            `pos tabungan ${goal.name}`
                          )
                        }
                      />
                    </div>

                    <div className="progress goal-progress">
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            (savedFor(goal.id) / Number(goal.target_amount)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="goal-foot">
                      <span>{money(savedFor(goal.id))} terkumpul</span>
                      <span>
                        {Math.round(
                          (savedFor(goal.id) / Number(goal.target_amount)) *
                            100
                        )}
                        %
                      </span>
                    </div>

                    <button
                      className="goal-action"
                      onClick={() =>
                        openForm("contribution", "expense", goal.id)
                      }
                    >
                      <Plus size={13} />
                      Tambah setoran
                    </button>
                  </div>
                ))}

                {!goals.length && <p>Belum ada tujuan tabungan.</p>}
              </div>
            </section>
          </div>

          <section
            className={`receipt-banner ${
              activeTab !== "transactions" ? "tab-hidden" : ""
            }`}
          >
            <div className="receipt-art">
              <div className="art-circle">
                <Camera size={25} />
              </div>
            </div>

            <div className="receipt-copy">
              <span className="ai-pill">DIDUKUNG AI</span>
              <h3>Foto atau unggah nota</h3>
              <p>Format yang didukung: PNG, JPG, dan JPEG.</p>
            </div>

            <button
              disabled={receiptBusy}
              onClick={() => cameraRef.current?.click()}
            >
              {receiptBusy ? <LoaderCircle className="spin" size={17} /> : <Camera size={17} />}
              Foto nota
            </button>

            <button
              disabled={receiptBusy}
              onClick={() => uploadRef.current?.click()}
            >
              <Upload size={17} />
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

          {busy && (
            <div className="loading-note">Memproses perubahan...</div>
          )}
        </div>
      </section>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section className="modal">
            <div className="modal-title">
              <div>
                <span className="modal-icon">
                  {modal === "transaction" ? (
                    <Wallet size={18} />
                  ) : modal === "budget" ? (
                    <PieChart size={18} />
                  ) : (
                    <Target size={18} />
                  )}
                </span>

                <div>
                  <h2>
                    {editingId ? "Edit " : "Tambah "}
                    {modal === "transaction"
                      ? "transaksi"
                      : modal === "budget"
                      ? "anggaran"
                      : modal === "goal"
                      ? "pos tabungan"
                      : "setoran tabungan"}
                  </h2>

                  <p>Data tersimpan ke akunmu.</p>
                </div>
              </div>

              <button type="button" onClick={closeForm}>
                <X size={19} />
              </button>
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
                        <ArrowDownLeft size={15} />
                        Pemasukan
                      </button>

                      <button
                        type="button"
                        className={kind === "expense" ? "selected" : ""}
                        onClick={() => {
                          setKind("expense");
                          setCategory(expenseCategories[0] || "Belanja");
                        }}
                      >
                        <ArrowUpRight size={15} />
                        Pengeluaran
                      </button>
                    </div>
                  </label>

                  <label>
                    Nama transaksi
                    <input
                      autoFocus
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Contoh: Makan siang"
                      required
                    />
                  </label>

                  <label>
                    Kategori
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      {!transactionCategories.includes(category) && (
                        <option value={category}>{category}</option>
                      )}

                      {transactionCategories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Tanggal transaksi
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={(event) =>
                        setTransactionDate(event.target.value)
                      }
                      required
                    />
                  </label>
                </>
              )}

             {modal === "budget" && (
  <label>
    Kategori anggaran

    <input
      list="budget-category-options"
      value={category}
      onChange={(event) => setCategory(event.target.value)}
      placeholder="Pilih atau ketik kategori baru"
      required
    />

    <datalist id="budget-category-options">
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
                      autoFocus
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Contoh: Dana darurat"
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
                    required
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
                {modal === "transaction"
                  ? "Jumlah (Rp)"
                  : modal === "budget"
                  ? "Batas anggaran (Rp)"
                  : modal === "goal"
                  ? "Target tabungan (Rp)"
                  : "Jumlah setoran (Rp)"}

                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="500000"
                  required
                />
              </label>

              {error && <p className="error-message">{error}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                >
                  Batal
                </button>

                <button className="primary-button" disabled={busy}>
                  <Check size={16} />
                  {editingId ? "Simpan perubahan" : "Simpan"}
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

function RowActions({
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