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

type FormType = "transaction" | "budget" | "goal" | "contribution";

const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const dateKey = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const monthKey = () => dateKey().slice(0, 7);

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? createClient()
    : null;

const expenseCategories = [
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

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [modal, setModal] = useState<FormType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Belanja");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [transactionDate, setTransactionDate] = useState(dateKey());
  const [selectedGoal, setSelectedGoal] = useState("");

  const [receiptMsg, setReceiptMsg] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const load = useCallback(async () => {
    if (!supabase) return;

    setBusy(true);
    setError("");

    const [transactionResult, budgetResult, goalResult, contributionResult] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("id,title,category,kind,amount,occurred_on")
          .order("occurred_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(500),

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

    let alive = true;

    supabase.auth.getUser().then(({ data }) => {
      if (alive) {
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
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      void load();
    } else {
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setContributions([]);
    }
  }, [user, load]);

  const [year, month] = monthKey().split("-");

  const currentTransactions = transactions.filter(
    (transaction) =>
      transaction.occurred_on?.slice(0, 7) === `${year}-${month}`
  );

  const income = currentTransactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const expense = currentTransactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const saved = (goalId: string) =>
    contributions
      .filter((contribution) => contribution.goal_id === goalId)
      .reduce(
        (total, contribution) => total + Number(contribution.amount),
        0
      );

  const budgetSpent = (categoryName: string) =>
    currentTransactions
      .filter(
        (transaction) =>
          transaction.kind === "expense" &&
          transaction.category === categoryName
      )
      .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const totalLimit = budgets.reduce(
    (total, budget) => total + Number(budget.limit_amount),
    0
  );

  const totalBudgetSpent = budgets.reduce(
    (total, budget) => total + budgetSpent(budget.category),
    0
  );

  const months = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Number(year), Number(month) - 1 - index, 1);

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      return {
        key,
        label: new Intl.DateTimeFormat("id-ID", {
          month: "short",
        }).format(date),

        income: transactions
          .filter(
            (transaction) =>
              transaction.occurred_on?.startsWith(key) &&
              transaction.kind === "income"
          )
          .reduce(
            (total, transaction) => total + Number(transaction.amount),
            0
          ),

        expense: transactions
          .filter(
            (transaction) =>
              transaction.occurred_on?.startsWith(key) &&
              transaction.kind === "expense"
          )
          .reduce(
            (total, transaction) => total + Number(transaction.amount),
            0
          ),
      };
    }).reverse();
  }, [transactions, year, month]);

  const chartMax = Math.max(
    1,
    ...months.flatMap((item) => [item.income, item.expense])
  );

  function openForm(
    type: FormType,
    initialKind: "income" | "expense" = "expense",
    goalId = ""
  ) {
    setError("");
    setEditingId(null);
    setModal(type);

    setTitle("");
    setAmount("");
    setTargetDate("");
    setTransactionDate(dateKey());

    setKind(initialKind);
    setCategory(initialKind === "income" ? "Gaji" : "Belanja");

    setSelectedGoal(goalId || goals[0]?.id || "");
  }

  function editTransaction(item: Transaction) {
    setError("");
    setEditingId(item.id);
    setModal("transaction");

    setTitle(item.title);
    setAmount(String(Number(item.amount)));
    setCategory(item.category);
    setKind(item.kind);
    setTransactionDate(item.occurred_on);
  }

  function editBudget(item: Budget) {
    setError("");
    setEditingId(item.id);
    setModal("budget");

    setTitle(item.category);
    setAmount(String(Number(item.limit_amount)));
  }

  function editGoal(item: Goal) {
    setError("");
    setEditingId(item.id);
    setModal("goal");

    setTitle(item.name);
    setAmount(String(Number(item.target_amount)));
    setTargetDate(item.target_date || "");
  }

  function editContribution(item: Contribution) {
    setError("");
    setEditingId(item.id);
    setModal("contribution");

    setSelectedGoal(item.goal_id);
    setAmount(String(Number(item.amount)));
  }

  function closeForm() {
    setModal(null);
    setEditingId(null);
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
      return;
    }

    if (authMode === "signup" && !result.data.session) {
      notify("Cek email untuk konfirmasi akun.");
    }
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!supabase || !modal) return;

    const value = Number(amount.replace(/\D/g, ""));

    if (!value || value <= 0) {
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
        amount: value,
        occurred_on: transactionDate,
      };

      result = editingId
        ? await supabase.from("transactions").update(fields).eq("id", editingId)
        : await supabase.from("transactions").insert(fields);
    }

    if (modal === "budget") {
      const fields = {
        category: title.trim(),
        limit_amount: value,
        color: "#78907b",
      };

      result = editingId
        ? await supabase
            .from("monthly_budgets")
            .update(fields)
            .eq("id", editingId)
        : await supabase.from("monthly_budgets").upsert(
            {
              period_key: monthKey(),
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
        target_amount: value,
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
        amount: value,
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

    const message = editingId
      ? "Perubahan berhasil disimpan"
      : "Data berhasil ditambahkan";

    closeForm();
    notify(message);
    await load();
  }

  async function removeItem(
    type: "transaction" | "budget" | "goal" | "contribution",
    id: string,
    label: string
  ) {
    if (!supabase) return;

    const approved = window.confirm(
      `Hapus ${label}? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!approved) return;

    setBusy(true);
    setError("");

    let result: any = null;

    if (type === "transaction") {
      result = await supabase.from("transactions").delete().eq("id", id);
    }

    if (type === "budget") {
      result = await supabase.from("monthly_budgets").delete().eq("id", id);
    }

    if (type === "goal") {
      result = await supabase.from("savings_goals").delete().eq("id", id);
    }

    if (type === "contribution") {
      result = await supabase
        .from("savings_contributions")
        .delete()
        .eq("id", id);
    }

    setBusy(false);

    if (result?.error) {
      setError(result.error.message);
      return;
    }

    notify(
      type === "goal"
        ? "Pos tabungan dan seluruh setoran berhasil dihapus"
        : "Data berhasil dihapus"
    );

    await load();
  }

  async function parseReceipt(file: File) {
    if (!supabase) return;

    setReceiptBusy(true);
    setReceiptMsg("AI sedang membaca nota.");

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

      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          title: transaction.title,
          category: transaction.category || "Lainnya",
          kind: "expense",
          amount: Number(transaction.amount),
          occurred_on: dateKey(),
        });

      if (insertError) {
        throw insertError;
      }

      setReceiptMsg(
        `Tersimpan: ${transaction.title} - ${money(
          Number(transaction.amount)
        )}`
      );

      notify("Pengeluaran dari nota berhasil dicatat");
      await load();
    } catch (error) {
      setReceiptMsg(
        error instanceof Error ? error.message : "Terjadi kesalahan."
      );
    } finally {
      setReceiptBusy(false);
    }
  }

  if (ready && !supabase) {
    return (
      <main className="shell">
        <section className="auth-card">
          <div className="brand">
            <span className="brand-icon">
              <Wallet size={20} />
            </span>
            <span>
              ruma<span className="brand-dot">.</span>
              <small>MONEY, MADE SIMPLE</small>
            </span>
          </div>

          <h1>Hubungkan Supabase</h1>
          <p>
            Tambahkan NEXT_PUBLIC_SUPABASE_URL dan
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di environment Vercel.
          </p>
        </section>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="shell">
        <div className="auth-card">Memuat akun...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="shell">
        <section className="auth-card">
          <div className="brand">
            <span className="brand-icon">
              <Wallet size={20} />
            </span>
            <span>
              ruma<span className="brand-dot">.</span>
              <small>MONEY, MADE SIMPLE</small>
            </span>
          </div>

          <h1>{authMode === "login" ? "Masuk ke Ruma" : "Buat akun Ruma"}</h1>
          <p>Data keuanganmu disimpan di akun pribadi.</p>

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
              {busy && <LoaderCircle className="spin" size={16} />}
              {authMode === "login" ? "Masuk" : "Daftar"}
            </button>
          </form>

          <button
            className="auth-switch"
            onClick={() => {
              setAuthMode(authMode === "login" ? "signup" : "login");
              setError("");
            }}
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
          <span className="brand-icon">
            <Wallet size={20} />
          </span>

          <span>
            ruma<span className="brand-dot">.</span>
            <small>MONEY, MADE SIMPLE</small>
          </span>
        </a>

        <div className="side-label">MENU UTAMA</div>

        <nav>
          <button className="nav-item active">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById("transactions")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <CreditCard size={18} />
            <span>Transaksi</span>
            <span className="nav-count">{transactions.length}</span>
          </button>

          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById("budgets")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <PieChart size={18} />
            <span>Anggaran</span>
          </button>

          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById("goals")
                ?.scrollIntoView({ behavior: "smooth" })
            }
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

            <button onClick={signOut} title="Keluar">
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
            <b>Dashboard</b>
          </div>

          <div className="top-actions">
            <div className="month-select">
              <CalendarDays size={16} />
              {new Intl.DateTimeFormat("id-ID", {
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </div>

            <button className="icon-button" onClick={signOut}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">
                {new Intl.DateTimeFormat("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
                  .format(new Date())
                  .toLocaleUpperCase("id-ID")}
              </div>

              <h1>Ringkasan keuanganmu</h1>
              <p>Data tersimpan di akun {user.email}.</p>
            </div>

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
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="stat-grid">
            <article className="stat-card balance-card">
              <div className="stat-heading">Saldo bersih bulan ini</div>
              <div className="stat-value">{money(income - expense)}</div>
              <div className="stat-foot">
                Pemasukan dikurangi pengeluaran bulan ini
              </div>
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

          <div className="dashboard-grid">
            <section className="panel cashflow-panel">
              <div className="panel-heading">
                <div>
                  <h2>Arus kas</h2>
                  <p>Enam bulan terakhir</p>
                </div>
              </div>

              <div className="chart-legend">
                <span>
                  <i className="legend-in" /> Pemasukan
                </span>

                <span>
                  <i className="legend-out" /> Pengeluaran
                </span>
              </div>

              <div className="chart">
                <div className="y-labels">
                  <span>{money(chartMax)}</span>
                  <span>{money(chartMax / 2)}</span>
                  <span>Rp 0</span>
                </div>

                <div className="plot">
                  <div className="gridline g1" />
                  <div className="gridline g2" />
                  <div className="gridline g4" />

                  <svg
                    viewBox="0 0 700 205"
                    preserveAspectRatio="none"
                    aria-label="Grafik arus kas"
                  >
                    <polyline
                      points={months
                        .map(
                          (item, index) =>
                            `${index * 140},${
                              185 - (item.income / chartMax) * 155
                            }`
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#758d79"
                      strokeWidth="3"
                    />

                    <polyline
                      points={months
                        .map(
                          (item, index) =>
                            `${index * 140},${
                              185 - (item.expense / chartMax) * 155
                            }`
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#e6ad70"
                      strokeWidth="3"
                    />
                  </svg>

                  <div className="x-labels">
                    {months.map((item) => (
                      <span key={item.key}>{item.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel budget-panel" id="budgets">
              <div className="panel-heading">
                <div>
                  <h2>Anggaran bulan ini</h2>
                  <p>Pengeluaran berdasarkan kategori</p>
                </div>

                <button
                  className="text-link"
                  onClick={() => openForm("budget")}
                >
                  Tambah <Plus size={14} />
                </button>
              </div>

              <div className="budget-total">
                <div>
                  <small>Total terpakai</small>
                  <b>
                    {money(totalBudgetSpent)}
                    <span> / {money(totalLimit)}</span>
                  </b>
                </div>

                <div
                  className="budget-ring"
                  style={{
                    background: `conic-gradient(
                      #758c78 0 ${
                        Math.min(
                          100,
                          totalLimit
                            ? Math.round(
                                (totalBudgetSpent / totalLimit) * 100
                              )
                            : 0
                        )
                      }%,
                      #edf1eb ${
                        Math.min(
                          100,
                          totalLimit
                            ? Math.round(
                                (totalBudgetSpent / totalLimit) * 100
                              )
                            : 0
                        )
                      }% 100%
                    )`,
                  }}
                >
                  <div>
                    <b>
                      {totalLimit
                        ? Math.round((totalBudgetSpent / totalLimit) * 100)
                        : 0}
                      %
                    </b>
                    <small>terpakai</small>
                  </div>
                </div>
              </div>

              <div className="budget-list">
                {budgets.length ? (
                  budgets.map((budget) => (
                    <div className="budget-row" key={budget.id}>
                      <div className="budget-label">
                        <span>{budget.category}</span>

                        <b>
                          {money(budgetSpent(budget.category))} /{" "}
                          {money(Number(budget.limit_amount))}
                        </b>

                        <RowActions
                          label={`anggaran ${budget.category}`}
                          onEdit={() => editBudget(budget)}
                          onDelete={() =>
                            void removeItem(
                              "budget",
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
                              (budgetSpent(budget.category) /
                                Number(budget.limit_amount)) *
                                100
                            )}%`,
                            background: budget.color,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Belum ada alokasi anggaran.</p>
                )}
              </div>
            </section>

            <section className="panel transactions-panel" id="transactions">
              <div className="panel-heading">
                <div>
                  <h2>Transaksi</h2>
                  <p>{transactions.length} transaksi tersimpan</p>
                </div>

                <button
                  className="text-link"
                  onClick={() => openForm("transaction", "income")}
                >
                  <Plus size={14} />
                  Pemasukan
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

                    <b
                      className={
                        transaction.kind === "income"
                          ? "amount-in"
                          : "amount-out"
                      }
                    >
                      {transaction.kind === "income" ? "+" : "-"}
                      {money(Number(transaction.amount))}
                    </b>

                    <RowActions
                      label={`transaksi ${transaction.title}`}
                      onEdit={() => editTransaction(transaction)}
                      onDelete={() =>
                        void removeItem(
                          "transaction",
                          transaction.id,
                          `transaksi ${transaction.title}`
                        )
                      }
                    />
                  </div>
                ))}

                {!transactions.length && (
                  <p>Belum ada transaksi. Catat pemasukan atau pengeluaran.</p>
                )}
              </div>
            </section>

            <section className="panel goals-panel" id="goals">
              <div className="panel-heading">
                <div>
                  <h2>Pos tabungan</h2>
                  <p>Setoran tersimpan di akunmu</p>
                </div>

                <button
                  className="round-plus"
                  onClick={() => openForm("goal")}
                  title="Tambah pos tabungan"
                >
                  <Plus size={17} />
                </button>
              </div>

              <div className="goal-list">
                {goals.map((goal) => (
                  <div className="goal-row" key={goal.id}>
                    <div className="goal-top">
                      <div className="goal-name">
                        <span>
                          <Target size={14} />
                        </span>

                        <div>
                          <b>{goal.name}</b>
                          <small>
                            {goal.target_date
                              ? `Target ${new Date(
                                  `${goal.target_date}T00:00:00`
                                ).toLocaleDateString("id-ID")}`
                              : "Tanpa tanggal target"}
                          </small>
                        </div>
                      </div>

                      <b>
                        {Math.min(
                          100,
                          Math.round(
                            (saved(goal.id) / Number(goal.target_amount)) *
                              100
                          )
                        )}
                        %
                      </b>

                      <RowActions
                        label={`pos tabungan ${goal.name}`}
                        onEdit={() => editGoal(goal)}
                        onDelete={() =>
                          void removeItem(
                            "goal",
                            goal.id,
                            `pos tabungan ${goal.name} beserta seluruh setorannya`
                          )
                        }
                      />
                    </div>

                    <div className="progress goal-progress">
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            (saved(goal.id) / Number(goal.target_amount)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="goal-foot">
                      <span>
                        {money(saved(goal.id))} <small>terkumpul</small>
                      </span>
                      <span>Target {money(Number(goal.target_amount))}</span>
                    </div>

                    <div className="contribution-list">
                      {contributions
                        .filter(
                          (contribution) => contribution.goal_id === goal.id
                        )
                        .map((contribution) => (
                          <div
                            className="contribution-row"
                            key={contribution.id}
                          >
                            <small>
                              Setoran -{" "}
                              {new Date(
                                contribution.created_at
                              ).toLocaleDateString("id-ID")}
                            </small>

                            <b>{money(Number(contribution.amount))}</b>

                            <RowActions
                              label="setoran tabungan"
                              onEdit={() => editContribution(contribution)}
                              onDelete={() =>
                                void removeItem(
                                  "contribution",
                                  contribution.id,
                                  `setoran tabungan senilai ${money(
                                    Number(contribution.amount)
                                  )}`
                                )
                              }
                            />
                          </div>
                        ))}
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

          <section className="receipt-banner">
            <div className="receipt-art">
              <div className="art-circle">
                <Camera size={25} />
              </div>
            </div>

            <div className="receipt-copy">
              <span className="ai-pill">DIDUKUNG AI</span>
              <h3>Foto atau unggah nota</h3>
              <p>
                AI membaca nominal dan kategori, lalu menyimpannya sebagai
                pengeluaran.
              </p>
            </div>

            <button
              disabled={receiptBusy}
              onClick={() => fileRef.current?.click()}
            >
              {receiptBusy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Camera size={17} />
              )}
              Scan nota
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];

                if (file) {
                  void parseReceipt(file);
                }

                event.currentTarget.value = "";
              }}
            />
          </section>

          {receiptMsg && <div className="receipt-status">{receiptMsg}</div>}

          <footer>
            2026 Ruma Finance
            <span>Data milik akunmu.</span>
          </footer>

          {busy && (
            <div className="loading-note">Memproses perubahan...</div>
          )}
        </div>
      </section>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
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
                      ? "anggaran bulanan"
                      : modal === "goal"
                      ? "pos tabungan"
                      : "setoran tabungan"}
                  </h2>

                  <p>Perubahan disimpan ke akunmu.</p>
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
                          setCategory("Belanja");
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
                      required
                      placeholder={
                        kind === "income"
                          ? "Contoh: Gaji bulanan"
                          : "Contoh: Makan siang"
                      }
                    />
                  </label>

                  <label>
                    Kategori
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      {(
                        kind === "income"
                          ? incomeCategories
                          : expenseCategories
                      ).map((item) => (
                        <option key={item}>{item}</option>
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

              {(modal === "budget" || modal === "goal") && (
                <>
                  <label>
                    {modal === "budget" ? "Kategori anggaran" : "Nama tujuan"}

                    <input
                      autoFocus
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                      placeholder={
                        modal === "budget"
                          ? "Contoh: Transportasi"
                          : "Contoh: Dana darurat"
                      }
                    />
                  </label>

                  {modal === "goal" && (
                    <label>
                      Tanggal target (opsional)
                      <input
                        type="date"
                        value={targetDate}
                        onChange={(event) => setTargetDate(event.target.value)}
                      />
                    </label>
                  )}
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
                  ? "Batas per bulan (Rp)"
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
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="row-actions">
      <button
        type="button"
        aria-label={`Edit ${label}`}
        title={`Edit ${label}`}
        onClick={onEdit}
      >
        <Pencil size={13} />
      </button>

      <button
        type="button"
        aria-label={`Hapus ${label}`}
        title={`Hapus ${label}`}
        onClick={onDelete}
      >
        <Trash2 size={13} />
      </button>
    </span>
  );
}