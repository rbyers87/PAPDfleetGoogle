-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "All authenticated users can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can modify vehicles" ON vehicles;
DROP POLICY IF EXISTS "All authenticated users can view status history" ON vehicle_status_history;
DROP POLICY IF EXISTS "All users can create status history" ON vehicle_status_history;
DROP POLICY IF EXISTS "All authenticated users can view work orders" ON work_orders;
DROP POLICY IF EXISTS "All users can create work orders" ON work_orders;
DROP POLICY IF EXISTS "Admins can update work orders" ON work_orders;

-- Create helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin(user_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Policies for vehicles
CREATE POLICY "All authenticated users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can modify vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Policies for vehicle_status_history
CREATE POLICY "All authenticated users can view status history"
  ON vehicle_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All users can create status history"
  ON vehicle_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for work_orders
CREATE POLICY "All authenticated users can view work orders"
  ON work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All users can create work orders"
  ON work_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update work orders"
  ON work_orders FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));
