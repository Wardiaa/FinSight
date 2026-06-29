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
