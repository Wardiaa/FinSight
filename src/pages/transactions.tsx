import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction, Category } from "@/types/database";
import { Plus, Pencil, Trash2, Search, ChevronDown, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { TransactionModal } from "@/components/transaction-modal";

let _txCache: { transactions: Transaction[]; categories: Category[] } | null = null;

/* ── Custom dropdown ── */
interface SelectOption { label: string; value: string }

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative min-w-0 flex-1" ref={ref}>
      <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors duration-150 cursor-pointer border-2 ${
          open
            ? "bg-white border-primary text-foreground"
            : "bg-muted border-transparent text-foreground hover:bg-gray-100"
        }`}
      >
        <span className="truncate">{selected?.label ?? "—"}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-xl border border-gray-100 ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map(opt => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-100 cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-primary font-semibold"
                      : "text-foreground font-medium hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isActive && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(_txCache?.transactions ?? []);
  const [categories, setCategories] = useState<Category[]>(_txCache?.categories ?? []);
  const [loading, setLoading] = useState(!_txCache);

  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*, category:categories(*)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (data) {
      const txs = data as Transaction[];
      setTransactions(txs);
      if (_txCache) _txCache.transactions = txs;
    }
  };

  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const catRes = await supabase.from("categories").select("*").order("name");
      const cats = (catRes.data as Category[]) ?? [];
      setCategories(cats);
      const { data } = await supabase
        .from("transactions")
        .select("*, category:categories(*)")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      const txs = (data as Transaction[]) ?? [];
      setTransactions(txs);
      _txCache = { transactions: txs, categories: cats };
      setLoading(false);
    }
    initData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    await supabase.from("transactions").delete().eq("id", id);
    fetchTransactions();
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const renderIcon = (iconName: string) => {
    // @ts-ignore
    const IconComponent = LucideIcons[iconName] || LucideIcons.CircleDollarSign;
    return <IconComponent size={20} />;
  };

  const months = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort().reverse();

  const typeOptions: SelectOption[] = [
    { value: "all", label: "All Types" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
  ];

  const categoryOptions: SelectOption[] = [
    { value: "all", label: "All Categories" },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ];

  const monthOptions: SelectOption[] = [
    { value: "all", label: "All Time" },
    ...months.map(m => {
      const [yyyy, mm] = m.split("-");
      const date = new Date(parseInt(yyyy), parseInt(mm) - 1);
      return { value: m, label: date.toLocaleString("default", { month: "long", year: "numeric" }) };
    }),
  ];

  const filteredTransactions = transactions.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (categoryFilter !== "all" && t.category_id !== categoryFilter) return false;
    if (monthFilter !== "all" && !t.date.startsWith(monthFilter)) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Transactions</h1>
        <button
          onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-600 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto"
        >
          <Plus size={20} />
          <span>Add Transaction</span>
        </button>
      </header>

      {/* Filters */}
      <section className="bg-white p-4 md:p-6 rounded-xl overflow-visible">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={v => setTypeFilter(v as any)}
            options={typeOptions}
          />
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
          />
          <FilterSelect
            label="Month"
            value={monthFilter}
            onChange={setMonthFilter}
            options={monthOptions}
          />
        </div>
      </section>

      {/* Transactions List */}
      <section className="bg-white rounded-lg">
        {loading ? (
          <div className="p-8 text-center text-gray-400 font-medium">Loading transactions...</div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-2">
            {filteredTransactions.map(t => (
              <div
                key={t.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 bg-muted hover:bg-gray-200 transition-colors rounded-lg gap-4 group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: t.category?.color || "#9CA3AF" }}
                  >
                    {renderIcon(t.category?.icon || "CircleDollarSign")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-lg truncate">{t.description || "Transaction"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold px-2 py-1 rounded-sm bg-white text-gray-700 shrink-0">
                        {t.category?.name || "Uncategorized"}
                      </span>
                      <span className="text-sm text-gray-500 font-medium shrink-0">
                        {new Date(t.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 w-full md:w-auto shrink-0">
                  <div className={`font-bold text-xl ${t.type === "income" ? "text-secondary" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </div>
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(t)}
                      className="w-10 h-10 rounded-md bg-white flex items-center justify-center text-gray-600 hover:text-primary hover:scale-105 transition-all cursor-pointer"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="w-10 h-10 rounded-md bg-white flex items-center justify-center text-gray-600 hover:text-destructive hover:scale-105 transition-all cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center bg-muted rounded-lg flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-6">
              <Search size={40} />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">No transactions found.</h3>
            <p className="text-gray-500 font-medium">Add your first transaction or change filters to see more.</p>
          </div>
        )}
      </section>

      {isModalOpen && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          categories={categories}
          initialData={editingTransaction}
          onSave={fetchTransactions}
        />
      )}
    </div>
  );
}
