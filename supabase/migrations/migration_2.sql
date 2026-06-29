-- 1. Add new columns to transactions
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_interval TEXT CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly'));

-- 2. Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, month)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "select_own_budgets" ON budgets;
DROP POLICY IF EXISTS "insert_own_budgets" ON budgets;
DROP POLICY IF EXISTS "update_own_budgets" ON budgets;
DROP POLICY IF EXISTS "delete_own_budgets" ON budgets;

-- Create policies
CREATE POLICY "select_own_budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- 3. User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
DROP POLICY IF EXISTS "update_own_settings" ON user_settings;

-- Create policies
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);