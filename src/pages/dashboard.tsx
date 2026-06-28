import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction, Category } from "@/types/database";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, CircleDollarSign } from "lucide-react";
import { Link } from "wouter";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as LucideIcons from "lucide-react";

let _dashCache: { transactions: Transaction[]; categories: Category[] } | null = null;

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>(_dashCache?.transactions ?? []);
  const [categories, setCategories] = useState<Category[]>(_dashCache?.categories ?? []);
  const [loading, setLoading] = useState(!_dashCache);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [txRes, catRes] = await Promise.all([
        supabase.from("transactions").select("*, category:categories(*)").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("categories").select("*").order("name")
      ]);

      const txs = (txRes.data as Transaction[]) ?? [];
      const cats = (catRes.data as Category[]) ?? [];

      setTransactions(txs);
      setCategories(cats);
      _dashCache = { transactions: txs, categories: cats };
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 font-medium text-gray-400">Loading dashboard...</div>;
  }

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const currentMonthTxs = transactions.filter(t => t.date.startsWith(currentMonthStr));
  const income = currentMonthTxs.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
  const expense = currentMonthTxs.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  const expenseTxs = currentMonthTxs.filter(t => t.type === "expense");
  const pieDataMap = expenseTxs.reduce((acc, t) => {
    const catName = t.category?.name || "Uncategorized";
    if (!acc[catName]) acc[catName] = { name: catName, value: 0, color: t.category?.color || "#9CA3AF" };
    acc[catName].value += t.amount;
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
      if (t.type === "income") barDataMap[mStr].income += t.amount;
      else barDataMap[mStr].expense += t.amount;
    }
  });
  const barData = Object.values(barDataMap);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

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
        <Link href="/transactions" className="bg-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-600 hover:scale-105 transition-all duration-200 flex items-center gap-2">
          <Plus size={20} />
          <span className="hidden md:inline">Add Transaction</span>
        </Link>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="bg-[#f0fdf4] p-8 rounded-lg">
          <div className="flex items-center gap-3 text-secondary mb-4">
            <ArrowUpRight size={24} />
            <h2 className="font-semibold text-lg">Income</h2>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">{formatCurrency(income)}</p>
        </div>
        <div className="bg-[#fff1f2] p-8 rounded-lg">
          <div className="flex items-center gap-3 text-destructive mb-4">
            <ArrowDownRight size={24} />
            <h2 className="font-semibold text-lg">Expenses</h2>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">{formatCurrency(expense)}</p>
        </div>
        <div className="bg-[#eff6ff] p-8 rounded-lg">
          <div className="flex items-center gap-3 text-primary mb-4">
            <Wallet size={24} />
            <h2 className="font-semibold text-lg">Net Balance</h2>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">{formatCurrency(balance)}</p>
        </div>
      </section>

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
                    formatter={(value: number) => formatCurrency(value)}
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
                  formatter={(value: number) => formatCurrency(value)}
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

      <section className="bg-white p-6 md:p-8 rounded-lg relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground tracking-tight">Recent Transactions</h3>
          <Link href="/transactions" className="text-primary font-semibold hover:underline">View All</Link>
        </div>
        
        {transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.slice(0, 5).map((t) => (
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
                <div className={`font-bold text-lg ${t.type === 'income' ? 'text-secondary' : 'text-foreground'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 font-medium bg-muted rounded-lg">
            No transactions yet. Add your first one to get started.
          </div>
        )}
      </section>
      
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <Link href="/transactions">
          <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors">
            <Plus size={28} />
          </div>
        </Link>
      </div>
    </div>
  );
}
