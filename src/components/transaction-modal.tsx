import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Category, Transaction } from "@/types/database";
import { CURRENCIES as CURRENCIES_LIST } from "@/lib/exchange-rates";
import { X, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  initialData: Transaction | null;
  onSave: () => void;
  defaultCurrency?: string;
}

interface SelectOption { label: string; value: string; extra?: string }

function FilterSelect({
  value,
  onChange,
  options,
  placeholder = "Select a category"
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
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
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-4 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer border-2 ${
          open
            ? "bg-white border-primary text-foreground"
            : "bg-muted border-transparent text-foreground hover:bg-gray-100"
        }`}
      >
        <span className="truncate flex items-center gap-2">
          {selected
            ? <>{selected.label}{selected.extra && <span className="text-gray-400 text-xs font-normal">{selected.extra}</span>}</>
            : <span className="text-gray-400 font-normal">{placeholder}</span>
          }
        </span>
        <ChevronDown
          size={18}
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

export function TransactionModal({ isOpen, onClose, categories, initialData, onSave, defaultCurrency = "USD" }: TransactionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<"daily"|"weekly"|"monthly"|"yearly">("monthly");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCurrency(initialData.currency || defaultCurrency);
      setCategoryId(initialData.category_id || "");
      setDescription(initialData.description || "");
      setDate(initialData.date);
      setIsRecurring(initialData.is_recurring || false);
      setRecurringInterval((initialData.recurring_interval as any) || "monthly");
    } else {
      setType("expense");
      setAmount("");
      setCurrency(defaultCurrency);
      setCategoryId("");
      setDescription("");
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setRecurringInterval("monthly");
    }
  }, [initialData, isOpen, defaultCurrency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      user_id: user.id,
      type,
      amount: parseFloat(amount),
      currency,
      category_id: categoryId || null,
      description: description || null,
      date,
      is_recurring: isRecurring,
      recurring_interval: isRecurring ? recurringInterval : null,
    };

    try {
      if (initialData) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type || c.type === "both");
  
  const categoryOptions: SelectOption[] = filteredCategories.map(c => ({
    value: c.id,
    label: c.name,
  }));

  const currencyOptions: SelectOption[] = CURRENCIES_LIST.map(c => ({
    value: c.code,
    label: c.code,
    extra: c.name,
  }));

  const intervalOptions: SelectOption[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

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
            {initialData ? "Edit Transaction" : "Add Transaction"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type Toggle */}
            <div className="flex bg-muted p-1 rounded-md">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-semibold rounded-sm transition-colors duration-150 cursor-pointer ${
                  type === "expense" ? "bg-white text-foreground" : "text-gray-500 hover:text-foreground"
                }`}
                onClick={() => { setType("expense"); setCategoryId(""); }}
              >
                Expense
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-semibold rounded-sm transition-colors duration-150 cursor-pointer ${
                  type === "income" ? "bg-white text-foreground" : "text-gray-500 hover:text-foreground"
                }`}
                onClick={() => { setType("income"); setCategoryId(""); }}
              >
                Income
              </button>
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-semibold text-foreground block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
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

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">Category</label>
              <FilterSelect
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
                placeholder="Select a category"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={fieldClass}
                placeholder="What was this for?"
              />
            </div>

            {/* Recurring */}
            <div className="border-2 border-transparent bg-muted rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground cursor-pointer" htmlFor="recurring-toggle">
                  Recurring Transaction
                </label>
                <button
                  type="button"
                  id="recurring-toggle"
                  role="switch"
                  aria-checked={isRecurring}
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`w-10 h-6 flex items-center rounded-full px-0.5 transition-colors duration-200 cursor-pointer ${
                    isRecurring ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${isRecurring ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              
              {isRecurring && (
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Interval</label>
                  <FilterSelect
                    value={recurringInterval}
                    onChange={(v) => setRecurringInterval(v as any)}
                    options={intervalOptions}
                    placeholder="Select interval"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white h-14 rounded-md font-semibold text-lg hover:bg-blue-600 transition-colors duration-150 disabled:opacity-70 cursor-pointer mt-2"
            >
              {loading ? "Saving..." : "Save Transaction"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}