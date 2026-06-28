-- ============================================================
-- Personal Finance Tracker — Initial Schema
-- Run this in your Supabase SQL Editor or via Supabase CLI
-- ============================================================

-- ──────────────────────────────────────────
-- 1. Categories (global, no RLS)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT        NOT NULL,
  color TEXT        NOT NULL,  -- hex color, e.g. "#3B82F6"
  icon  TEXT        NOT NULL,  -- lucide-react icon name
  type  TEXT        NOT NULL CHECK (type IN ('income', 'expense', 'both'))
);

-- Seed default categories
INSERT INTO categories (name, color, icon, type) VALUES
  ('Salary',        '#10B981', 'Briefcase',    'income'),
  ('Freelance',     '#3B82F6', 'Laptop',       'income'),
  ('Investment',    '#8B5CF6', 'TrendingUp',   'income'),
  ('Gift',          '#F59E0B', 'Gift',         'income'),
  ('Other Income',  '#6B7280', 'Plus',         'income'),
  ('Food',          '#EF4444', 'UtensilsCrossed', 'expense'),
  ('Transport',     '#F59E0B', 'Car',          'expense'),
  ('Housing',       '#3B82F6', 'Home',         'expense'),
  ('Health',        '#10B981', 'Heart',        'expense'),
  ('Entertainment', '#8B5CF6', 'Tv',           'expense'),
  ('Shopping',      '#EC4899', 'ShoppingBag',  'expense'),
  ('Education',     '#0EA5E9', 'BookOpen',     'expense'),
  ('Utilities',     '#6B7280', 'Zap',          'expense'),
  ('Travel',        '#F97316', 'Plane',        'expense'),
  ('Other',         '#6B7280', 'MoreHorizontal', 'both');

-- ──────────────────────────────────────────
-- 2. Transactions (per-user, RLS enabled)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type        TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID        REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx     ON transactions (date DESC);

-- ──────────────────────────────────────────
-- 3. Auto-update updated_at on transactions
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────
-- 4. Row Level Security
-- ──────────────────────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "select_own_transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert transactions for themselves
CREATE POLICY "insert_own_transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own transactions
CREATE POLICY "update_own_transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own transactions
CREATE POLICY "delete_own_transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Categories are public (read-only for all authenticated users)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_categories"
  ON categories FOR SELECT
  USING (true);

-- ──────────────────────────────────────────
-- 5. Useful view: monthly summary per user
-- ──────────────────────────────────────────
CREATE OR REPLACE VIEW monthly_summary AS
SELECT
  user_id,
  TO_CHAR(date, 'YYYY-MM') AS month,
  type,
  SUM(amount)              AS total
FROM transactions
GROUP BY user_id, month, type;
