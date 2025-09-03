/*
  # Create designs table for visual database schema storage

  1. New Tables
    - `designs`
      - `id` (uuid, primary key) - Unique identifier for each design
      - `name` (text, not null) - Human-readable name for the design
      - `description` (text, nullable) - Optional description of the design
      - `schema_data` (jsonb, not null) - Complete schema data including tables and relationships
      - `created_at` (timestamptz, default now()) - When the design was first created
      - `updated_at` (timestamptz, default now()) - When the design was last modified
      - `user_id` (uuid, nullable) - Future support for user-specific designs

  2. Security
    - Enable RLS on `designs` table
    - Add policy for public read access (since no auth is implemented yet)
    - Add policy for public write access (since no auth is implemented yet)

  3. Indexes
    - Index on `updated_at` for efficient sorting
    - Index on `name` for search functionality
*/

CREATE TABLE IF NOT EXISTS public.designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  schema_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid
);

-- Enable RLS
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no authentication is implemented)
CREATE POLICY "Allow public read access to designs"
  ON public.designs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to designs"
  ON public.designs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to designs"
  ON public.designs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to designs"
  ON public.designs
  FOR DELETE
  TO public
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_designs_updated_at ON public.designs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_designs_name ON public.designs(name);
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON public.designs(user_id) WHERE user_id IS NOT NULL;

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_designs_updated_at
  BEFORE UPDATE ON public.designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();