import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Category, Transaction } from "@/types/database";
import { X, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  initialData: Transaction | null;
  onSave: () => void;
}

/* ── Custom dropdown ── */
interface SelectOption { label: string; value: string }

function FilterSelect({
  value,
  onChange,
  options,
}: {
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
        <span className="truncate">{selected?.label ?? "Select a category"}</span>
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

export function TransactionModal({ isOpen, onClose, categories, initialData, onSave }: TransactionModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategoryId(initialData.category_id || "");
      setDescription(initialData.description || "");
      setDate(initialData.date);
    } else {
      setType("expense");
      setAmount("");
      setCategoryId("");
      setDescription("");
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      user_id: user.id,
      type,
      amount: parseFloat(amount),
      category_id: categoryId || null,
      description: description || null,
      date,
    };

    if (initialData) {
      // @ts-ignore - Supabase type issue
      await supabase.from("transactions").update(payload).eq("id", initialData.id);
    } else {
      // @ts-ignore - Supabase type issue
      await supabase.from("transactions").insert(payload);
    }

    setLoading(false);
    onSave();
    onClose();
  };

  const filteredCategories = categories.filter(c => c.type === type || c.type === "both");
  
  const categoryOptions: SelectOption[] = filteredCategories.map(c => ({
    value: c.id,
    label: c.name,
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
                onClick={() => setType("expense")}
              >
                Expense
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-semibold rounded-sm transition-colors duration-150 cursor-pointer ${
                  type === "income" ? "bg-white text-foreground" : "text-gray-500 hover:text-foreground"
                }`}
                onClick={() => setType("income")}
              >
                Income
              </button>
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">Category</label>
              <FilterSelect
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
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
              <label className="text-sm font-semibold text-foreground block">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={fieldClass}
                placeholder="What was this for?"
              />
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