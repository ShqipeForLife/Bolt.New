CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  vehicle_brand text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_year integer NOT NULL,
  vin text,
  service_type text NOT NULL,
  preferred_date date NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_appointments" ON appointments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "select_appointments" ON appointments FOR SELECT
  TO authenticated USING (true);

CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created ON appointments(created_at DESC);