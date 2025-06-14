/*
  # Finance App Database Schema

  1. New Tables
    - `accounts`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `type` (text, not null)
      - `bank_name` (text, nullable)
      - `account_number` (text, nullable)
      - `balance` (numeric, default 0)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)

    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `type` (text, not null - 'income' or 'expense')
      - `created_at` (timestamp)

    - `subcategories`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to categories)
      - `name` (text, not null)
      - `created_at` (timestamp)

    - `transactions`
      - `id` (uuid, primary key)
      - `account_id` (uuid, foreign key to accounts)
      - `type` (text, not null - 'income' or 'expense')
      - `category_id` (uuid, foreign key to categories)
      - `subcategory_id` (uuid, foreign key to subcategories, nullable)
      - `amount` (numeric, not null)
      - `description` (text, nullable)
      - `date` (date, not null)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data

  3. Sample Data
    - Default categories for income and expenses
    - Sample account types
*/

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  bank_name text,
  account_number text,
  balance numeric DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subcategory_id uuid REFERENCES subcategories(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  date date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for accounts
CREATE POLICY "Users can read all accounts"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert accounts"
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update accounts"
  ON accounts
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policies for categories
CREATE POLICY "Users can read all categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for subcategories
CREATE POLICY "Users can read all subcategories"
  ON subcategories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert subcategories"
  ON subcategories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for transactions
CREATE POLICY "Users can read all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default categories
INSERT INTO categories (name, type) VALUES
  -- Income categories
  ('Salary', 'income'),
  ('Freelance', 'income'),
  ('Investment Returns', 'income'),
  ('Business Income', 'income'),
  ('Other Income', 'income'),
  
  -- Expense categories
  ('Food & Dining', 'expense'),
  ('Transportation', 'expense'),
  ('Shopping', 'expense'),
  ('Entertainment', 'expense'),
  ('Bills & Utilities', 'expense'),
  ('Healthcare', 'expense'),
  ('Education', 'expense'),
  ('Travel', 'expense'),
  ('Insurance', 'expense'),
  ('Taxes', 'expense'),
  ('Other Expenses', 'expense')
ON CONFLICT DO NOTHING;

-- Insert default subcategories
DO $$
DECLARE
  food_cat_id uuid;
  transport_cat_id uuid;
  shopping_cat_id uuid;
  bills_cat_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO food_cat_id FROM categories WHERE name = 'Food & Dining' AND type = 'expense';
  SELECT id INTO transport_cat_id FROM categories WHERE name = 'Transportation' AND type = 'expense';
  SELECT id INTO shopping_cat_id FROM categories WHERE name = 'Shopping' AND type = 'expense';
  SELECT id INTO bills_cat_id FROM categories WHERE name = 'Bills & Utilities' AND type = 'expense';

  -- Insert subcategories
  IF food_cat_id IS NOT NULL THEN
    INSERT INTO subcategories (category_id, name) VALUES
      (food_cat_id, 'Restaurants'),
      (food_cat_id, 'Groceries'),
      (food_cat_id, 'Fast Food'),
      (food_cat_id, 'Coffee & Tea')
    ON CONFLICT DO NOTHING;
  END IF;

  IF transport_cat_id IS NOT NULL THEN
    INSERT INTO subcategories (category_id, name) VALUES
      (transport_cat_id, 'Fuel'),
      (transport_cat_id, 'Public Transport'),
      (transport_cat_id, 'Taxi/Ride Share'),
      (transport_cat_id, 'Vehicle Maintenance')
    ON CONFLICT DO NOTHING;
  END IF;

  IF shopping_cat_id IS NOT NULL THEN
    INSERT INTO subcategories (category_id, name) VALUES
      (shopping_cat_id, 'Clothing'),
      (shopping_cat_id, 'Electronics'),
      (shopping_cat_id, 'Home & Garden'),
      (shopping_cat_id, 'Personal Care')
    ON CONFLICT DO NOTHING;
  END IF;

  IF bills_cat_id IS NOT NULL THEN
    INSERT INTO subcategories (category_id, name) VALUES
      (bills_cat_id, 'Electricity'),
      (bills_cat_id, 'Water'),
      (bills_cat_id, 'Internet'),
      (bills_cat_id, 'Phone'),
      (bills_cat_id, 'Rent/Mortgage')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);