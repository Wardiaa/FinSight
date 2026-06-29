export type TransactionType = 'income' | 'expense';
export type RecurringInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: 'income' | 'expense' | 'both';
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  description: string | null;
  date: string;
  currency: string;
  is_recurring: boolean;
  recurring_interval: RecurringInterval | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  month: string;
  amount: number;
  currency: string;
  category?: Category;
}

export interface UserSettings {
  user_id: string;
  base_currency: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id'>;
        Update: Partial<Omit<Category, 'id'>>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category'>>;
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, 'id' | 'category'>;
        Update: Partial<Omit<Budget, 'id' | 'category'>>;
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      user_settings: {
        Row: UserSettings;
        Insert: UserSettings;
        Update: Partial<UserSettings>;
        Relationships: [];
      };
    };
    Views: {
      monthly_summary: {
        month: string;
        income: number;
        expenses: number;
        net: number;
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}