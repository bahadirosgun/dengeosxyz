-- movement entries
CREATE TABLE public.movement_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('walking','activity')),
  steps integer,
  duration_minutes integer,
  distance_km numeric(6,2),
  activity_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (steps IS NULL OR steps >= 0),
  CHECK (duration_minutes IS NULL OR (duration_minutes >= 0 AND duration_minutes <= 1440))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movement_entries TO authenticated;
GRANT ALL ON public.movement_entries TO service_role;

ALTER TABLE public.movement_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own movement_entries" ON public.movement_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX movement_entries_user_date_idx ON public.movement_entries (user_id, date);

CREATE TRIGGER movement_entries_set_updated_at
  BEFORE UPDATE ON public.movement_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- weight entries
CREATE TABLE public.weight_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_entries TO authenticated;
GRANT ALL ON public.weight_entries TO service_role;

ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own weight_entries" ON public.weight_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX weight_entries_user_date_idx ON public.weight_entries (user_id, date);

CREATE TRIGGER weight_entries_set_updated_at
  BEFORE UPDATE ON public.weight_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- profile goal columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS step_goal integer NOT NULL DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS active_minutes_goal integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS weight_goal_kg numeric(5,2);