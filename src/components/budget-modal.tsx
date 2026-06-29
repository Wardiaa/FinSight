import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Category, Budget } from "@/types/database";
import { CURRENCIES as CURRENCIES_LIST } from "@/lib/exchange-rates";
import { X, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: () => void;
  defaultCurrency?: string;
  monthStr: string; // YYYY-MM
  initialData?: Budget | null; // For editing
}

interface SelectOption { label: string; value: string; extra?: string }

function FilterSelect({
  value,
  onChange,
  options,
  placeholder = "Select a category",
  disabled = false
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
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
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-4 rounded-md text-sm font-medium transition-colors duration-150 border-2 ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-muted border-transparent"
            : open
              ? "bg-white border-primary text-foreground cursor-pointer"
              : "bg-muted border-transparent text-foreground hover:bg-gray-100 cursor-pointer"
        }`}
      >
        <span className="truncate flex items-center gap-2">
          {selected
            ? <>{selected.label}{selected.extra && <span className="text-gray-400 text-xs font-normal">{selected.extra}</span>}</>
            : <span className="text-gray-400 font-normal">{placeholder}</span>
          }
        </span>
        <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
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
                  <span className="truncate flex items-center gap-2">
                    {opt.label}
                    {opt.extra && <span className="text-gray-400 text-xs font-normal">{opt.extra}</span>}
                  </span>
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

export function BudgetModal({ 
  isOpen, 
  onClose, 
  categories, 
  onSave, 
  defaultCurrency = "USD", 
  monthStr,
  initialData = null 
}: BudgetModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setCurrency(initialData.currency || defaultCurrency);
      setCategoryId(initialData.category_id || "");
    } else {
      setAmount("");
      setCurrency(defaultCurrency);
      setCategoryId("");
    }
  }, [initialData, isOpen, defaultCurrency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !categoryId) return;
    setLoading(true);

    const payload = {
      user_id: user.id,
      category_id: categoryId,
      amount: parseFloat(amount),
      currency,
      month: monthStr,
    };

    try {
      if (isEditing && initialData) {
        // Update existing budget
        const { error } = await supabase
          .from("budgets")
          .update(payload)
          .eq("id", initialData.id);
        
        if (error) throw error;
      } else {
        // Create new budget
        const { error } = await supabase.from("budgets").insert(payload);
        if (error) {
          if (error.code === '23505') throw new Error("A budget for this category already exists this month.");
          throw error;
        }
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = categories.filter(c => c.type === "expense" || c.type === "both");
  const categoryOptions: SelectOption[] = expenseCategories.map(c => ({
    value: c.id,
    label: c.name,
  }));

  const currencyOptions: SelectOption[] = CURRENCIES_LIST.map(c => ({
    value: c.code,
    label: c.code,
    extra: c.name,
  }));

  const fieldClass = "w-full bg-muted text-foreground p-4 rounded-md outline-none border-2 border-transparent focus:bg-white focus:border-primary transition-colors duration-150 font-medium";

  return (
    <div className="fixed inset-0 bg-foreground/80 flex items-end sm:items-center justify-center sm:p-4 z-50 font-sans">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[92dvh] overflow-y-auto relative">
        <div className="p-6 md:p-8">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-500 hover:text-foreground hover:scale-110 transition-all bg-muted p-2 rounded-full cursor-pointer"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl font-bold text-foreground mb-6 tracking-tight pr-10">
            {isEditing ? "Edit Budget" : "Set Budget"}
          </h2>
          <p className="text-sm text-gray-400 -mt-4 mb-6">
            {new Date(monthStr + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">Category</label>
              <FilterSelect
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
                placeholder="Select expense category"
                disabled={isEditing} // Disable category change when editing
              />
              {isEditing && (
                <p className="text-xs text-gray-400 mt-1">Category cannot be changed when editing</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-semibold text-foreground block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${fieldClass} pl-8 font-bold text-lg`}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="col-span-1 space-y-2">
                <label className="text-sm font-semibold text-foreground block">Currency</label>
                <FilterSelect
                  value={currency}
                  onChange={setCurrency}
                  options={currencyOptions}
                  placeholder="USD"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !categoryId || !amount}
              className="w-full bg-primary text-white h-14 rounded-md font-semibold text-lg hover:bg-blue-600 transition-colors duration-150 disabled:opacity-70 cursor-pointer mt-2"
            >
              {loading ? "Saving..." : isEditing ? "Update Budget" : "Save Budget"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}