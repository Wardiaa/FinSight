import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction, Category, Budget } from "@/types/database";
import { getRates, convertAmount, formatWithCurrency } from "@/lib/exchange-rates";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, CircleDollarSign } from "lucide-react";
import { Link } from "wouter";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as LucideIcons from "lucide-react";
import { TransactionModal } from "@/components/transaction-modal";
import { useToast } from "@/hooks/use-toast";

// Cache at module level - persists across component remounts
let _dashCache: {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  baseCurrency: string;
  rates: Record<string, number>;
  currenciesUsed: Set<string>;
} | null = null;

export default function Dashboard() {
  useToast();
  
  // Initialize state with cached data if available
  const [transactions, setTransactions] = useState<Transaction[]>(_dashCache?.transactions ?? []);
  const [categories, setCategories] = useState<Category[]>(_dashCache?.categories ?? []);
  const [budgets, setBudgets] = useState<Budget[]>(_dashCache?.budgets ?? []);
  const [baseCurrency, setBaseCurrency] = useState(_dashCache?.baseCurrency ?? "USD");
  const [rates, setRates] = useState<Record<string, number>>(_dashCache?.rates ?? {});
  const [loading, setLoading] = useState(!_dashCache);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currenciesUsed, setCurrenciesUsed] = useState<Set<string>>(_dashCache?.currenciesUsed ?? new Set());

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (showLoading) setLoading(false);
      return;
    }

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [txRes, catRes, setRes, budRes] = await Promise.all([
      supabase.from("transactions").select("*, category:categories(*)").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("budgets").select("*, category:categories(*)").eq("user_id", user.id).eq("month", currentMonthStr)
    ]);

    const txs = (txRes.data as Transaction[]) ?? [];
    const cats = (catRes.data as Category[]) ?? [];
    const userBaseCurrency = setRes.data?.base_currency || "USD";
    const userBudgets = (budRes.data as Budget[]) ?? [];

    setTransactions(txs);
    setCategories(cats);
    setBaseCurrency(userBaseCurrency);
    setBudgets(userBudgets);

    const usedCurs = new Set<string>();
    txs.forEach(t => usedCurs.add(t.currency || "USD"));
    setCurrenciesUsed(usedCurs);

    const fetchedRates = await getRates(userBaseCurrency);
    setRates(fetchedRates);

    // Update cache
    _dashCache = {
      transactions: txs,
      categories: cats,
      budgets: userBudgets,
      baseCurrency: userBaseCurrency,
      rates: fetchedRates,
      currenciesUsed: usedCurs
    };

    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    // Always fetch fresh data when the component mounts, but show loading only if no cache exists
    fetchData(!_dashCache);
  }, []);

  if (loading) {
    return <div className="p-8 font-medium text-gray-400">Loading dashboard...</div>;
  }

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthTxs = transactions.filter(t => t.date.startsWith(currentMonthStr));

  let income = 0;
  let expense = 0;
  currentMonthTxs.forEach(t => {
    const amt = convertAmount(t.amount, t.currency || "USD", baseCurrency, rates) ?? 0;
    if (t.type === "income") income += amt;
    else expense += amt;
  });
  const balance = income - expense;

  const expenseTxs = currentMonthTxs.filter(t => t.type === "expense");
  const pieDataMap = expenseTxs.reduce((acc, t) => {
    const catName = t.category?.name || "Uncategorized";
    const amt = convertAmount(t.amount, t.currency || "USD", baseCurrency, rates) ?? 0;
    if (!acc[catName]) acc[catName] = { name: catName, value: 0, color: t.category?.color || "#9CA3AF" };
    acc[catName].value += amt;
    return acc;
  }, {} as Record<string, { name: string; value: number; color: string }>);
  const pieData = Object.values(pieDataMap).sort((a, b) => b.value - a.value);

  const barDataMap: Record<string, { month: string, income: number, expense: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mLabel = d.toLocaleString('default', { month: 'short' });
    barDataMap[mStr] = { month: mLabel, income: 0, expense: 0 };
  }
  transactions.forEach(t => {
    const mStr = t.date.substring(0, 7);
    if (barDataMap[mStr]) {
      const amt = convertAmount(t.amount, t.currency || "USD", baseCurrency, rates) ?? 0;
      if (t.type === "income") barDataMap[mStr].income += amt;
      else barDataMap[mStr].expense += amt;
    }
  });
  const barData = Object.values(barDataMap);

  const showConverted = currenciesUsed.size > 1;

  const renderIcon = (iconName: string) => {
    // @ts-ignore
    const IconComponent = LucideIcons[iconName] || CircleDollarSign;
    return <IconComponent size={20} />;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans pb-24 md:pb-8">
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-primary rounded-full opacity-5 pointer-events-none -translate-y-1/2 blur-xl" />

      <header className="flex items-center justify-between relative z-10">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Overview</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-600 hover:scale-105 transition-all duration-200 flex items-center gap-2 cursor-pointer"
        >
          <Plus size={20} />
          <span className="hidden md:inline">Add Transaction</span>
        </button>
      </header>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="bg-[#f0fdf4] p-8 rounded-lg">
          <div className="flex items-center gap-3 text-secondary mb-4">
            <ArrowUpRight size={24} />
            <h2 className="font-semibold text-lg">Income</h2>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">{formatWithCurrency(income, baseCurrency)}</p>
          {showConverted && <p className="text-xs text-gray-500 font-medium mt-1">Converted to {baseCurrency}</p>}
        </div>
        <div className="bg-[#fff1f2] p-8 rounded-lg">
          <div className="flex items-center gap-3 text-destructive mb-4">
            <ArrowDownRight size={24} />
            <h2 className="font-semibold text-lg">Expenses</h2>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">{formatWithCurrency(expense, baseCurrency)}</p>
          {showConverted && <p className="text-xs text-gray-500 font-medium mt-1">Converted to {baseCurrency}</p>}
        </div>
        <div className="bg-[#eff6ff] p-8 rounded-lg">
          <div className="flex items-center gap-3 text-primary mb-4">
            <Wallet size={24} />
            <h2 className="font-semibold text-lg">Net Balance</h2>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">{formatWithCurrency(balance, baseCurrency)}</p>
          {showConverted && <p className="text-xs text-gray-500 font-medium mt-1">Converted to {baseCurrency}</p>}
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        <div className="bg-white p-6 rounded-lg">
          <h3 className="text-xl font-bold text-foreground mb-6 tracking-tight">Expense Breakdown</h3>
          {pieData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatWithCurrency(value, baseCurrency)}
                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#111827', color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 font-medium">No expenses this month</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg">
          <h3 className="text-xl font-bold text-foreground mb-6 tracking-tight">Income vs Expenses</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) => formatWithCurrency(value, baseCurrency)}
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#111827', color: '#fff' }}
                />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Budget Progress */}
      {budgets.length > 0 && (
        <section className="bg-white p-6 md:p-8 rounded-lg relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground tracking-tight">Budget Progress</h3>
            <Link href="/budgets" className="text-primary font-semibold hover:underline text-sm">Manage</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map(b => {
              const bAmt = convertAmount(b.amount, b.currency, baseCurrency, rates) ?? b.amount;
              let spent = 0;
              currentMonthTxs.forEach(t => {
                if (t.type === "expense" && t.category_id === b.category_id) {
                  spent += convertAmount(t.amount, t.currency || "USD", baseCurrency, rates) ?? 0;
                }
              });
              const pct = Math.min(100, Math.max(0, bAmt > 0 ? (spent / bAmt) * 100 : 0));
              const isOver = spent > bAmt;
              const barColor = isOver ? "bg-destructive" : pct > 80 ? "bg-yellow-400" : "bg-secondary";

              return (
                <div key={b.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: b.category?.color || "#9CA3AF" }}>
                        {renderIcon(b.category?.icon || "Wallet")}
                      </div>
                      <span className="font-semibold text-foreground text-sm">{b.category?.name}</span>
                    </div>
                    <span className={`text-xs font-semibold ${isOver ? "text-destructive" : "text-gray-500"}`}>
                      {formatWithCurrency(spent, baseCurrency)} / {formatWithCurrency(bAmt, baseCurrency)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Transactions */}
      <section className="bg-white p-6 md:p-8 rounded-lg relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground tracking-tight">Recent Transactions</h3>
          <Link href="/transactions" className="text-primary font-semibold hover:underline">View All</Link>
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.slice(0, 5).map((t) => {
              const isIncome = t.type === 'income';
              const convertedAmt = convertAmount(t.amount, t.currency || "USD", baseCurrency, rates) ?? t.amount;
              return (
                <div key={t.id} className="flex items-center justify-between p-4 bg-muted hover:bg-gray-200 transition-colors rounded-lg group">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: t.category?.color || '#9CA3AF' }}
                    >
                      {renderIcon(t.category?.icon || 'CircleDollarSign')}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t.description || t.category?.name || "Transaction"}</p>
                      <p className="text-sm text-gray-500 font-medium">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-lg ${isIncome ? 'text-secondary' : 'text-foreground'}`}>
                      {isIncome ? '+' : '-'}{formatWithCurrency(t.amount, t.currency || "USD")}
                    </div>
                    {showConverted && (t.currency || "USD") !== baseCurrency && (
                      <div className="text-xs text-gray-400 font-medium">
                        ≈ {formatWithCurrency(convertedAmt, baseCurrency)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 font-medium bg-muted rounded-lg">
            No transactions yet. Add your first one to get started.
          </div>
        )}
      </section>

      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors shadow-lg"
        >
          <Plus size={28} />
        </button>
      </div>

      {isModalOpen && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          categories={categories}
          initialData={null}
          onSave={fetchData}
          defaultCurrency={baseCurrency}
        />
      )}
    </div>
  );
}