export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: "income" | "expense" | "both";
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface TransactionInput {
  amount: number;
  type: TransactionType;
  category_id: string | null;
  description: string | null;
  date: string;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  category_name: string;
  color: string;
  total: number;
}

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Transaction, "id" | "created_at" | "updated_at">>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id">;
        Update: Partial<Omit<Category, "id">>;
      };
    };
  };
}
