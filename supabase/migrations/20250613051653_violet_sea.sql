/*
  # Add anonymous user policies for categories table

  1. Security Changes
    - Add policy for anonymous users to insert categories
    - Add policy for anonymous users to read categories
    - This matches the existing pattern used for the accounts table

  2. Background
    - The categories table currently only allows authenticated users to perform operations
    - The application uses the anonymous Supabase key, so it needs anon policies
    - This change aligns the categories table permissions with the accounts table
*/

-- Add policy to allow anonymous users to insert categories
CREATE POLICY "Allow anon to insert categories"
  ON categories
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add policy to allow anonymous users to read categories  
CREATE POLICY "Allow anon to read categories"
  ON categories
  FOR SELECT
  TO anon
  USING (true);