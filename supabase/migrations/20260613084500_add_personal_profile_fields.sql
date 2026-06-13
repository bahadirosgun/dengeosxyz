ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS initial_weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS birth_date date;
