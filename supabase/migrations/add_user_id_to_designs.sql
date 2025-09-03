/*
  # Add user_id column to designs table

  1. Changes
    - Add user_id column to designs table if it doesn't exist
    - Add foreign key constraint to auth.users
    - Add index for better query performance
    - Update RLS policies to use user_id

  2. Security
    - Enable RLS if not already enabled
    - Add policies for user-specific access
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'designs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.designs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'designs' AND indexname = 'idx_designs_user_id'
  ) THEN
    CREATE INDEX idx_designs_user_id ON public.designs(user_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own designs" ON public.designs;
DROP POLICY IF EXISTS "Users can create own designs" ON public.designs;
DROP POLICY IF EXISTS "Users can update own designs" ON public.designs;
DROP POLICY IF EXISTS "Users can delete own designs" ON public.designs;

-- Create new policies for user-specific access
CREATE POLICY "Users can view own designs"
  ON public.designs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own designs"
  ON public.designs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own designs"
  ON public.designs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own designs"
  ON public.designs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
