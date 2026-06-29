import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Budget, Category, Transaction } from "@/types/database";
import { getRates, convertAmount, formatWithCurrency } from "@/lib/exchange-rates";
import { Plus, Trash2, ChevronLeft, ChevronRight, PieChart, X, Pencil } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { BudgetModal } from "@/components/budget-modal";
import { useToast } from "@/hooks/use-toast";

// Cache at module level
let _budgetCache: {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  baseCurrency: string;
  rates: Record<string, number>;
} | null = null;

/* ── Confirmation Modal ── */
function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  budget,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  budget: Budget | null;
}) {
  if (!isOpen || !budget) return null;

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
                Delete Budget?
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
                  {budget.category?.name || "Uncategorized"}
                </p>
                <p className="text-sm text-gray-500 font-medium">
                  {new Date(budget.month + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="font-bold text-lg text-foreground">
                {formatWithCurrency(budget.amount, budget.currency || "USD")}
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

export default function Budgets() {
  const { toast } = useToast();
  
  // Initialize with cached data
  const [budgets, setBudgets] = useState<Budget[]>(_budgetCache?.budgets ?? []);
  const [categories, setCategories] = useState<Category[]>(_budgetCache?.categories ?? []);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(_budgetCache?.transactions ?? []);
  const [baseCurrency, setBaseCurrency] = useState(_budgetCache?.baseCurrency ?? "USD");
  const [rates, setRates] = useState<Record<string, number>>(_budgetCache?.rates ?? {});
  const [loading, setLoading] = useState(!_budgetCache);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (showLoading) setLoading(false);
      return;
    }

    // Fetch ALL transactions (like the dashboard does) - not just expense
    const [budRes, catRes, txRes, setRes] = await Promise.all([
      supabase.from("budgets")
        .select("*, category:categories(*)")
        .eq("user_id", user.id)
        .eq("month", monthStr),
      supabase.from("categories")
        .select("*")
        .order("name"),
      supabase.from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      supabase.from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
    ]);

    const userBaseCurrency = (setRes.data as any)?.base_currency || "USD";
    const fetchedRates = await getRates(userBaseCurrency);

    const newBudgets = (budRes.data as Budget[]) ?? [];
    const newCategories = (catRes.data as Category[]) ?? [];
    const newTransactions = (txRes.data as Transaction[]) ?? [];

    setBudgets(newBudgets);
    setCategories(newCategories);
    setAllTransactions(newTransactions);
    setBaseCurrency(userBaseCurrency);
    setRates(fetchedRates);

    // Update cache
    _budgetCache = {
      budgets: newBudgets,
      categories: newCategories,
      transactions: newTransactions,
      baseCurrency: userBaseCurrency,
      rates: fetchedRates
    };

    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchData(!_budgetCache);
  }, [monthStr]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!budgetToDelete) return;
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", budgetToDelete.id);
      if (error) throw error;
      setIsDeleteModalOpen(false);
      setBudgetToDelete(null);
      fetchData(false);
    } catch (err: any) {
      toast({ 
        title: "Error deleting budget", 
        description: err.message || "Unknown error", 
        variant: "destructive" 
      });
    }
  };

  const renderIcon = (iconName: string) => {
    // @ts-ignore
    const IconComponent = LucideIcons[iconName] || LucideIcons.Wallet;
    return <IconComponent size={16} />;
  };

  // Calculate spending for each budget - EXACTLY like the dashboard does
  const getBudgetSpending = (budget: Budget) => {
    const bAmt = convertAmount(budget.amount, budget.currency, baseCurrency, rates) ?? budget.amount;
    let spent = 0;
    
    // Get current month transactions (like dashboard's currentMonthTxs)
    const currentMonthTxs = allTransactions.filter(t => t.date.startsWith(monthStr));
    
    // Loop through current month transactions (EXACT same logic as dashboard)
    currentMonthTxs.forEach(t => {
      if (t.type === "expense" && t.category_id === budget.category_id) {
        const amt = convertAmount(t.amount, t.currency || "USD", baseCurrency, rates) ?? 0;
        spent += amt;
      }
    });
    
    return { bAmt, spent };
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6 font-sans pb-24 md:pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">Control your spending</p>
        </div>
        <button
          onClick={() => {
            setEditingBudget(null);
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          <span>New Budget</span>
        </button>
      </header>

      <div className="flex items-center justify-between bg-card border rounded-lg p-2 shadow-sm max-w-sm mx-auto">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-muted rounded-md transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-sm w-32 text-center uppercase tracking-wide">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-muted rounded-md transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-sm font-medium">Loading budgets...</div>
      ) : budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => {
            const { bAmt, spent } = getBudgetSpending(b);
            const pct = Math.min(100, Math.max(0, bAmt > 0 ? (spent / bAmt) * 100 : 0));
            const isOver = spent > bAmt;
            const barColor = isOver ? "bg-destructive" : pct > 80 ? "bg-accent" : "bg-secondary";

            return (
              <div key={b.id} className="bg-card border rounded-xl p-5 shadow-sm hover:border-primary/30 transition-colors group relative">
                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleEdit(b)}
                    className="bg-background border shadow-sm p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={() => { setBudgetToDelete(b); setIsDeleteModalOpen(true); }}
                    className="bg-background border shadow-sm p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: b.category?.color || "hsl(var(--muted-foreground))" }}>
                    {renderIcon(b.category?.icon || "PieChart")}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">{b.category?.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {b.currency !== baseCurrency ? `Original: ${formatWithCurrency(b.amount, b.currency)}` : "Monthly Target"}
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div className="font-semibold text-lg tracking-tight">
                    {formatWithCurrency(spent, baseCurrency)} <span className="text-muted-foreground text-sm font-medium">/ {formatWithCurrency(bAmt, baseCurrency)}</span>
                  </div>
                  <span className={`text-xs font-bold ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>

                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
                </div>
                {isOver && (
                  <p className="text-[11px] font-medium text-destructive mt-2">
                    Over budget by {formatWithCurrency(spent - bAmt, baseCurrency)}
                  </p>
                )}
                {!isOver && spent > 0 && (
                  <p className="text-[11px] font-medium text-muted-foreground mt-2">
                    {formatWithCurrency(bAmt - spent, baseCurrency)} remaining
                  </p>
                )}
                {spent === 0 && (
                  <p className="text-[11px] font-medium text-muted-foreground mt-2">
                    No expenses this month
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center bg-card border rounded-xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <PieChart size={24} />
          </div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">No budgets set</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create a budget to track spending limits for specific categories this month.
          </p>
          <button
            onClick={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
            className="mt-6 text-primary text-sm font-medium hover:underline"
          >
            Create first budget
          </button>
        </div>
      )}

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBudget(null);
        }}
        categories={categories}
        onSave={() => fetchData(false)}
        defaultCurrency={baseCurrency}
        monthStr={monthStr}
        initialData={editingBudget}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setBudgetToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        budget={budgetToDelete}
      />
    </div>
  );
}