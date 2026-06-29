import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction, Category } from "@/types/database";
import { exportToCSV } from "@/lib/csv-export";
import { Plus, Pencil, Trash2, Search, ChevronDown, Check, X, Download, RefreshCw } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { TransactionModal } from "@/components/transaction-modal";
import { useToast } from "@/hooks/use-toast";

// Cache at module level
let _txCache: {
  transactions: Transaction[];
  categories: Category[];
  baseCurrency: string;
} | null = null;

/* ── Confirmation Modal ── */
function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  transaction,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: Transaction | null;
}) {
  if (!isOpen || !transaction) return null;

  const formatCurrency = (amount: number, cur: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount);

  return (
    <div className="fixed inset-0 bg-foreground/80 flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden relative">
        <div className="p-6 md:p-8">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-500 hover:text-foreground hover:scale-110 transition-all bg-muted p-2 rounded-full cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Delete Transaction?
              </h2>
              <p className="text-gray-500 font-medium text-sm">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">
                  {transaction.description || "Transaction"}
                </p>
                <p className="text-sm text-gray-500 font-medium">
                  {transaction.category?.name || "Uncategorized"} &bull; {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
              <div className={`font-bold text-lg ${transaction.type === "income" ? "text-secondary" : "text-foreground"}`}>
                {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount, transaction.currency || "USD")}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-muted text-foreground h-12 rounded-md font-semibold hover:bg-gray-300 transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-destructive text-white h-12 rounded-md font-semibold hover:bg-red-700 transition-colors duration-150 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>(_txCache?.transactions ?? []);
  const [categories, setCategories] = useState<Category[]>(_txCache?.categories ?? []);
  const [baseCurrency, setBaseCurrency] = useState(_txCache?.baseCurrency ?? "USD");
  const [loading, setLoading] = useState(!_txCache);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const fetchTransactions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (showLoading) setLoading(false);
      return;
    }
    
    const [catRes, txRes, setRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("transactions").select("*, category:categories(*)").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
    ]);
    
    const cats = (catRes.data as Category[]) ?? [];
    const txs = (txRes.data as Transaction[]) ?? [];
    const userBaseCurrency = setRes.data?.base_currency || "USD";
    
    setCategories(cats);
    setTransactions(txs);
    setBaseCurrency(userBaseCurrency);
    
    // Update cache
    _txCache = {
      transactions: txs,
      categories: cats,
      baseCurrency: userBaseCurrency
    };
    
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchTransactions(!_txCache);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      await supabase.from("transactions").delete().eq("id", transactionToDelete.id);
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
      fetchTransactions(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: number, cur: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount);

  const renderIcon = (iconName: string) => {
    // @ts-ignore
    const IconComponent = LucideIcons[iconName] || LucideIcons.CircleDollarSign;
    return <IconComponent size={20} />;
  };

  const months = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort().reverse();
  const availableCurrencies = Array.from(new Set(transactions.map(t => t.currency || "USD")));

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

  const currencyOptions: SelectOption[] = [
    { value: "all", label: "All Currencies" },
    ...availableCurrencies.map(c => ({ value: c, label: c })),
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category_id !== categoryFilter) return false;
      if (monthFilter !== "all" && !t.date.startsWith(monthFilter)) return false;
      if (currencyFilter !== "all" && (t.currency || "USD") !== currencyFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const descMatch = t.description?.toLowerCase().includes(s);
        const catMatch = t.category?.name.toLowerCase().includes(s);
        if (!descMatch && !catMatch) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, monthFilter, currencyFilter, search]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Transactions</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCSV(filteredTransactions)}
            className="bg-muted text-foreground px-5 py-3 rounded-md font-semibold hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer border"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
            className="bg-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-600 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={20} />
            <span>Add Transaction</span>
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by description or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border-2 border-transparent focus:border-primary rounded-lg pl-11 pr-4 py-3 text-sm font-medium outline-none transition-all duration-150 shadow-sm"
        />
      </div>

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
          <FilterSelect
            label="Currency"
            value={currencyFilter}
            onChange={setCurrencyFilter}
            options={currencyOptions}
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
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-1 rounded-sm bg-white text-gray-700 shrink-0">
                        {t.category?.name || "Uncategorized"}
                      </span>
                      {t.is_recurring && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-sm bg-blue-50 text-primary shrink-0 flex items-center gap-1">
                          <RefreshCw size={10} />
                          {t.recurring_interval || "Recurring"}
                        </span>
                      )}
                      <span className="text-sm text-gray-500 font-medium shrink-0">
                        {new Date(t.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 w-full md:w-auto shrink-0">
                  <div className="text-right">
                    <div className={`font-bold text-xl ${t.type === "income" ? "text-secondary" : "text-foreground"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, t.currency || "USD")}
                    </div>
                    {(t.currency || "USD") !== baseCurrency && (
                      <div className="text-xs text-gray-400 font-medium mt-0.5">{t.currency || "USD"}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(t)}
                      className="w-10 h-10 rounded-md bg-white flex items-center justify-center text-gray-600 hover:text-primary hover:scale-105 transition-all cursor-pointer"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => { setTransactionToDelete(t); setIsDeleteModalOpen(true); }}
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
          onSave={() => fetchTransactions(false)}
          defaultCurrency={baseCurrency}
        />
      )}

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        transaction={transactionToDelete}
      />
    </div>
  );
}