-- ============================================================
-- EntregaPRO - Supabase Database Schema
-- Full PostgreSQL schema compatible with Supabase
-- Includes: enums, tables, indexes, RLS policies, seed data
-- ============================================================

-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
-- ============================================================
CREATE TYPE order_status AS ENUM (
  'PENDING', 'ASSIGNED', 'LOADING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
);

CREATE TYPE invoice_status AS ENUM (
  'PENDING', 'PROCESSED', 'ERROR'
);

CREATE TYPE loading_verification_status AS ENUM (
  'VERIFIED', 'CONFIRMED', 'SEALED'
);

CREATE TYPE whatsapp_message_status AS ENUM (
  'SENT', 'DELIVERED', 'READ', 'FAILED'
);

-- 2. AUTH (Supabase Auth Compatible)
-- ============================================================
-- The User table integrates with Supabase's auth.users via `id` (UUID)
-- For backward compatibility, we keep a local user table too.
-- You can link auth.users.id = public.users.id via trigger.

CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  password_hash   TEXT NOT NULL,
  refresh_token   TEXT,
  active_status   BOOLEAN NOT NULL DEFAULT true,
  role_id         UUID,
  organization_id TEXT,
  created_by      UUID,
  last_login      TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ROLES & PERMISSIONS (RBAC)
-- ============================================================
CREATE TABLE public.roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT,
  organization_id TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Add FK for users.role_id
ALTER TABLE public.users
  ADD CONSTRAINT fk_users_role
  FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- 4. CUSTOMERS
-- ============================================================
CREATE TABLE public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT NOT NULL,
  whatsapp        TEXT,
  address         TEXT NOT NULL,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  notes           TEXT,
  organization_id TEXT,
  created_by      UUID,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. VEHICLES
-- ============================================================
CREATE TABLE public.vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number  TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL,
  capacity        TEXT NOT NULL,
  fuel_type       TEXT NOT NULL,
  active_status   BOOLEAN NOT NULL DEFAULT true,
  maintenance_due TIMESTAMPTZ,
  organization_id TEXT,
  created_by      UUID,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. DRIVERS
-- ============================================================
CREATE TABLE public.drivers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id          UUID UNIQUE REFERENCES public.vehicles(id),
  license_number      TEXT NOT NULL UNIQUE,
  phone               TEXT NOT NULL,
  live_latitude       DOUBLE PRECISION,
  live_longitude      DOUBLE PRECISION,
  availability_status BOOLEAN NOT NULL DEFAULT true,
  is_online           BOOLEAN NOT NULL DEFAULT false,
  last_seen           TIMESTAMPTZ,
  organization_id     TEXT,
  created_by          UUID,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ORDERS (Dispatch parent entity)
-- ============================================================
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT NOT NULL UNIQUE,
  dispatcher_id   UUID REFERENCES public.users(id),
  status          order_status NOT NULL DEFAULT 'PENDING',
  organization_id TEXT,
  created_by      UUID,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. DELIVERIES (Core entity)
-- ============================================================
CREATE TABLE public.deliveries (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number                 TEXT NOT NULL UNIQUE,
  order_id                        UUID REFERENCES public.orders(id),
  driver_id                       UUID REFERENCES public.drivers(id),
  vehicle_id                      UUID REFERENCES public.vehicles(id),
  customer_id                     UUID NOT NULL REFERENCES public.customers(id),
  dispatcher_id                   UUID REFERENCES public.users(id),

  -- Specs
  material_type                   TEXT NOT NULL,
  quantity                        TEXT NOT NULL,
  delivery_address                TEXT NOT NULL,
  latitude                        DOUBLE PRECISION NOT NULL,
  longitude                       DOUBLE PRECISION NOT NULL,
  scheduled_time                  TIMESTAMPTZ NOT NULL,
  started_at                      TIMESTAMPTZ,
  completed_at                    TIMESTAMPTZ,
  status                          order_status NOT NULL DEFAULT 'PENDING',

  -- Real-time ETA & Logistics
  eta_minutes                     INT,
  route_distance                  DOUBLE PRECISION,
  loading_started_at              TIMESTAMPTZ,
  transit_started_at              TIMESTAMPTZ,

  -- Proof of Delivery (POD)
  proof_image_url                 TEXT,
  signature_url                   TEXT,
  pod_latitude                    DOUBLE PRECISION,
  pod_longitude                   DOUBLE PRECISION,
  pod_timestamp                   TIMESTAMPTZ,

  -- Smart Financial Breakdown
  total_km                        DOUBLE PRECISION,
  estimated_driving_time_minutes  INT,
  toll_cost                       DOUBLE PRECISION,
  traffic_delay_minutes           INT,
  expected_fuel_liters            DOUBLE PRECISION,
  expected_fuel_cost              DOUBLE PRECISION,
  driver_cost                     DOUBLE PRECISION,
  assistant_cost                  DOUBLE PRECISION,
  maintenance_cost                DOUBLE PRECISION,
  estimated_profit                DOUBLE PRECISION,
  delivery_margin_percentage      DOUBLE PRECISION,

  organization_id                 TEXT,
  created_by                      UUID,
  deleted_at                      TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. DELIVERY HELPERS (Many-to-many: deliveries <-> drivers as helpers)
-- ============================================================
CREATE TABLE public.delivery_helpers (
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  PRIMARY KEY (delivery_id, driver_id)
);

-- 10. DELIVERY TRACKING (GPS breadcrumbs)
-- ============================================================
CREATE TABLE public.delivery_tracking (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id  UUID NOT NULL REFERENCES public.deliveries(id),
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
  battery_level DOUBLE PRECISION,
  heading      DOUBLE PRECISION,
  speed        DOUBLE PRECISION
);

-- 11. DELIVERY STATUS LOG (Audit trail)
-- ============================================================
CREATE TABLE public.delivery_status_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id),
  status      order_status NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes       TEXT,
  changed_by  UUID REFERENCES public.users(id)
);

-- 12. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  organization_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. ZONES (Service areas - PostGIS)
-- ============================================================
CREATE TABLE public.zones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT NOT NULL DEFAULT '#3b82f6',
  polygon         JSONB NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  organization_id TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. GEOFENCES (Alert zones - PostGIS)
-- ============================================================
CREATE TABLE public.geofences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  polygon         JSONB NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  organization_id TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. LOCATION PINGS (Raw GPS history)
-- ============================================================
CREATE TABLE public.location_pings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id    UUID NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  speed        DOUBLE PRECISION,
  heading      DOUBLE PRECISION,
  battery_level DOUBLE PRECISION,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id TEXT
);

-- 16. INVOICES
-- ============================================================
CREATE TABLE public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT,
  vendor_name     TEXT,
  issue_date      TIMESTAMPTZ,
  due_date        TIMESTAMPTZ,
  total_amount    DOUBLE PRECISION,
  currency        TEXT NOT NULL DEFAULT 'BRL',
  status          invoice_status NOT NULL DEFAULT 'PENDING',
  file_url        TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  extracted_text  TEXT,
  delivery_id     UUID REFERENCES public.deliveries(id),
  organization_id TEXT,
  created_by      UUID,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. INVOICE ITEMS
-- ============================================================
CREATE TABLE public.invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    DOUBLE PRECISION,
  unit_price  DOUBLE PRECISION,
  total_price DOUBLE PRECISION
);

-- 18. FUEL LOGS
-- ============================================================
CREATE TABLE public.fuel_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id        UUID REFERENCES public.drivers(id),
  fill_date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  liters_filled    DOUBLE PRECISION NOT NULL,
  cost_per_liter   DOUBLE PRECISION NOT NULL,
  total_cost       DOUBLE PRECISION NOT NULL,
  odometer         DOUBLE PRECISION NOT NULL,
  station_name     TEXT,
  receipt_photo_url TEXT,
  odometer_photo_url TEXT,
  detected_anomaly  BOOLEAN NOT NULL DEFAULT false,
  anomaly_reason   TEXT,
  organization_id  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. MAINTENANCE LOGS
-- ============================================================
CREATE TABLE public.maintenance_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        UUID NOT NULL REFERENCES public.vehicles(id),
  service_type      TEXT NOT NULL,
  service_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  cost              DOUBLE PRECISION NOT NULL,
  odometer          DOUBLE PRECISION NOT NULL,
  provider_name     TEXT,
  notes             TEXT,
  next_due_date     TIMESTAMPTZ,
  next_due_odometer DOUBLE PRECISION,
  alert_generated   BOOLEAN NOT NULL DEFAULT false,
  organization_id   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. LOADING VERIFICATIONS
-- ============================================================
CREATE TABLE public.loading_verifications (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id               UUID NOT NULL UNIQUE REFERENCES public.deliveries(id) ON DELETE CASCADE,
  verified_by_user_id       UUID NOT NULL REFERENCES public.users(id),
  material_count            INT NOT NULL,
  invoice_mapped            BOOLEAN NOT NULL DEFAULT true,
  package_quantity          INT NOT NULL,
  truck_capacity_ok         BOOLEAN NOT NULL DEFAULT true,
  empty_truck_photo_url     TEXT,
  materials_loaded_photo_url TEXT,
  sealed_cargo_photo_url    TEXT,
  invoice_verification_photo_url TEXT,
  status                    loading_verification_status NOT NULL DEFAULT 'VERIFIED',
  sealed_at                 TIMESTAMPTZ,
  driver_acknowledged       BOOLEAN NOT NULL DEFAULT false,
  organization_id           TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. ANALYTICS SNAPSHOTS
-- ============================================================
CREATE TABLE public.analytics_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_deliveries_today INT NOT NULL,
  trucks_on_route       INT NOT NULL,
  delayed_deliveries    INT NOT NULL,
  active_drivers        INT NOT NULL,
  loading_in_progress   INT NOT NULL,
  revenue_today         DOUBLE PRECISION NOT NULL,
  fuel_cost_today       DOUBLE PRECISION NOT NULL,
  maintenance_alerts_count INT NOT NULL,
  completed_deliveries  INT NOT NULL,
  failed_deliveries     INT NOT NULL,
  delivery_success_rate DOUBLE PRECISION NOT NULL,
  organization_id       TEXT
);

-- 22. WHATSAPP MESSAGES
-- ============================================================
CREATE TABLE public.whatsapp_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id   UUID REFERENCES public.deliveries(id),
  phone         TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        whatsapp_message_status NOT NULL DEFAULT 'SENT',
  provider_ref  TEXT,
  organization_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. SYSTEM SETTINGS
-- ============================================================
CREATE TABLE public.system_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  value           JSONB NOT NULL,
  organization_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 24. ACTIVITY LOGS (API audit trail)
-- ============================================================
CREATE TABLE public.activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id),
  action          TEXT NOT NULL,
  entity          TEXT NOT NULL,
  entity_id       TEXT,
  details         JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  organization_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 25. AUDIT LOG ENTRIES (Data change tracking)
-- ============================================================
CREATE TABLE public.audit_log_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id),
  action          TEXT NOT NULL,
  entity          TEXT NOT NULL,
  entity_id       TEXT,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  organization_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role_id ON public.users(role_id);
CREATE INDEX idx_users_organization_id ON public.users(organization_id);

-- Customers
CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_customers_organization_id ON public.customers(organization_id);

-- Vehicles
CREATE INDEX idx_vehicles_organization_id ON public.vehicles(organization_id);
CREATE INDEX idx_vehicles_active_status ON public.vehicles(active_status);

-- Drivers
CREATE INDEX idx_drivers_organization_id ON public.drivers(organization_id);
CREATE INDEX idx_drivers_is_online ON public.drivers(is_online);
CREATE INDEX idx_drivers_vehicle_id ON public.drivers(vehicle_id);

-- Orders
CREATE INDEX idx_orders_dispatcher_id ON public.orders(dispatcher_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_organization_id ON public.orders(organization_id);

-- Deliveries (core - most queried table)
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_driver_id ON public.deliveries(driver_id);
CREATE INDEX idx_deliveries_customer_id ON public.deliveries(customer_id);
CREATE INDEX idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX idx_deliveries_vehicle_id ON public.deliveries(vehicle_id);
CREATE INDEX idx_deliveries_dispatcher_id ON public.deliveries(dispatcher_id);
CREATE INDEX idx_deliveries_scheduled_time ON public.deliveries(scheduled_time);
CREATE INDEX idx_deliveries_organization_id ON public.deliveries(organization_id);
CREATE INDEX idx_deliveries_created_at ON public.deliveries(created_at);

-- Delivery Tracking
CREATE INDEX idx_delivery_tracking_delivery_id ON public.delivery_tracking(delivery_id);
CREATE INDEX idx_delivery_tracking_timestamp ON public.delivery_tracking(timestamp);

-- Delivery Status Logs
CREATE INDEX idx_delivery_status_logs_delivery_id ON public.delivery_status_logs(delivery_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Zones / Geofences (PostGIS spatial indexes)
CREATE INDEX idx_zones_active ON public.zones(active);
CREATE INDEX idx_geofences_active ON public.geofences(active);

-- Location Pings
CREATE INDEX idx_location_pings_driver_id ON public.location_pings(driver_id);
CREATE INDEX idx_location_pings_timestamp ON public.location_pings(timestamp);

-- Invoices
CREATE INDEX idx_invoices_delivery_id ON public.invoices(delivery_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_organization_id ON public.invoices(organization_id);

-- Invoice Items
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Fuel Logs
CREATE INDEX idx_fuel_logs_vehicle_id ON public.fuel_logs(vehicle_id);
CREATE INDEX idx_fuel_logs_driver_id ON public.fuel_logs(driver_id);

-- Maintenance Logs
CREATE INDEX idx_maintenance_logs_vehicle_id ON public.maintenance_logs(vehicle_id);

-- Loading Verifications
CREATE INDEX idx_loading_verifications_delivery_id ON public.loading_verifications(delivery_id);

-- Activity Logs
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Analytics
CREATE INDEX idx_analytics_snapshots_timestamp ON public.analytics_snapshots(timestamp);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_fuel_logs_updated_at
  BEFORE UPDATE ON public.fuel_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_maintenance_logs_updated_at
  BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_loading_verifications_updated_at
  BEFORE UPDATE ON public.loading_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_geofences_updated_at
  BEFORE UPDATE ON public.geofences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loading_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_entries ENABLE ROW LEVEL SECURITY;

-- RLS Helper: Get current user role name
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  role_name TEXT;
BEGIN
  SELECT r.name INTO role_name
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
  RETURN role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Helper: Check if user has a specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(perm_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE u.id = auth.uid() AND p.key = perm_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users: users can read own record; admins can read all
CREATE POLICY users_select_policy ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR public.user_has_permission('MANAGE_USERS')
  );

CREATE POLICY users_insert_policy ON public.users
  FOR INSERT WITH CHECK (
    public.user_has_permission('MANAGE_USERS')
  );

CREATE POLICY users_update_policy ON public.users
  FOR UPDATE USING (
    id = auth.uid()
    OR public.user_has_permission('MANAGE_USERS')
  );

CREATE POLICY users_delete_policy ON public.users
  FOR DELETE USING (
    public.user_has_permission('MANAGE_USERS')
  );

-- Roles: only admins
CREATE POLICY roles_select_policy ON public.roles
  FOR SELECT USING (
    public.user_has_permission('MANAGE_USERS')
    OR public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
  );

CREATE POLICY roles_insert_policy ON public.roles
  FOR INSERT WITH CHECK (public.user_has_permission('MANAGE_USERS'));

CREATE POLICY roles_update_policy ON public.roles
  FOR UPDATE USING (public.user_has_permission('MANAGE_USERS'));

CREATE POLICY roles_delete_policy ON public.roles
  FOR DELETE USING (public.user_has_permission('MANAGE_USERS'));

-- Permissions: only admins
CREATE POLICY permissions_select_policy ON public.permissions
  FOR SELECT USING (
    public.user_has_permission('MANAGE_USERS')
    OR public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
  );

-- Customers: admin/dispatcher can CRUD
CREATE POLICY customers_select_policy ON public.customers
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER')
  );

CREATE POLICY customers_insert_policy ON public.customers
  FOR INSERT WITH CHECK (public.user_has_permission('MANAGE_CUSTOMERS'));

CREATE POLICY customers_update_policy ON public.customers
  FOR UPDATE USING (public.user_has_permission('MANAGE_CUSTOMERS'));

CREATE POLICY customers_delete_policy ON public.customers
  FOR DELETE USING (public.user_has_permission('MANAGE_CUSTOMERS'));

-- Vehicles: admin/dispatcher can CRUD
CREATE POLICY vehicles_select_policy ON public.vehicles
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER')
  );

CREATE POLICY vehicles_insert_policy ON public.vehicles
  FOR INSERT WITH CHECK (public.user_has_permission('MANAGE_VEHICLES'));

CREATE POLICY vehicles_update_policy ON public.vehicles
  FOR UPDATE USING (public.user_has_permission('MANAGE_VEHICLES'));

CREATE POLICY vehicles_delete_policy ON public.vehicles
  FOR DELETE USING (public.user_has_permission('MANAGE_VEHICLES'));

-- Drivers: admin/dispatcher can CRUD; drivers can read own
CREATE POLICY drivers_select_policy ON public.drivers
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER')
    OR user_id = auth.uid()
  );

CREATE POLICY drivers_insert_policy ON public.drivers
  FOR INSERT WITH CHECK (public.user_has_permission('MANAGE_DRIVERS'));

CREATE POLICY drivers_update_policy ON public.drivers
  FOR UPDATE USING (
    public.user_has_permission('MANAGE_DRIVERS')
    OR user_id = auth.uid()
  );

-- Orders: admin/dispatcher
CREATE POLICY orders_select_policy ON public.orders
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER')
  );

CREATE POLICY orders_insert_policy ON public.orders
  FOR INSERT WITH CHECK (public.user_has_permission('CREATE_DELIVERY'));

CREATE POLICY orders_update_policy ON public.orders
  FOR UPDATE USING (public.user_has_permission('CREATE_DELIVERY'));

-- Deliveries: admin/dispatcher can see all; drivers see assigned
CREATE POLICY deliveries_select_policy ON public.deliveries
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER')
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY deliveries_insert_policy ON public.deliveries
  FOR INSERT WITH CHECK (public.user_has_permission('CREATE_DELIVERY'));

CREATE POLICY deliveries_update_policy ON public.deliveries
  FOR UPDATE USING (
    public.user_has_permission('UPDATE_DELIVERY_STATUS')
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- Notifications: users see own
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_policy ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Invoices: admin/dispatcher/accountant
CREATE POLICY invoices_select_policy ON public.invoices
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'ACCOUNTANT')
  );

-- Fuel/Maintenance Logs: admin/dispatcher
CREATE POLICY fuel_logs_select_policy ON public.fuel_logs
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER')
  );

CREATE POLICY maintenance_logs_select_policy ON public.maintenance_logs
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER')
  );

-- System Settings: admin only
CREATE POLICY system_settings_select_policy ON public.system_settings
  FOR SELECT USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
  );

CREATE POLICY system_settings_insert_policy ON public.system_settings
  FOR INSERT WITH CHECK (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
  );

CREATE POLICY system_settings_update_policy ON public.system_settings
  FOR UPDATE USING (
    public.get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
  );

-- ============================================================
-- SEED DATA: Roles & Permissions
-- ============================================================

-- Permissions
INSERT INTO public.permissions (key, description) VALUES
  ('VIEW_ANALYTICS', 'View analytics and reports'),
  ('MONITOR_OPERATIONS', 'Monitor live operations'),
  ('MANAGE_FLEET', 'Manage fleet and maintenance'),
  ('MANAGE_USERS', 'Create, edit, delete users'),
  ('MANAGE_INVOICES', 'Manage invoices'),
  ('MANAGE_CUSTOMERS', 'Create, edit, delete customers'),
  ('MANAGE_DRIVERS', 'Create, edit, delete drivers'),
  ('MANAGE_VEHICLES', 'Create, edit, delete vehicles'),
  ('CREATE_DELIVERY', 'Create new delivery orders'),
  ('ASSIGN_DRIVER', 'Assign drivers to deliveries'),
  ('UPDATE_DELIVERY_STATUS', 'Update delivery status'),
  ('UPLOAD_POD', 'Upload proof of delivery'),
  ('OPTIMIZE_DISPATCH', 'Run route optimization'),
  ('VIEW_ASSIGNED_TASKS', 'View own assigned tasks'),
  ('MANAGE_SETTINGS', 'Manage system settings')
ON CONFLICT (key) DO NOTHING;

-- Roles
INSERT INTO public.roles (name, description) VALUES
  ('SUPER_ADMIN', 'Full system access with user management'),
  ('ADMIN', 'Administrative access to all operations'),
  ('DISPATCHER', 'Dispatch and fleet management'),
  ('DRIVER', 'Mobile driver with delivery execution'),
  ('ACCOUNTANT', 'Financial and invoice management'),
  ('HELPER', 'Auxiliary crew member')
ON CONFLICT (name) DO NOTHING;

-- Role-Permission mappings
WITH role_ids AS (SELECT id, name FROM public.roles),
     perm_ids AS (SELECT id, key FROM public.permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
-- SUPER_ADMIN gets all permissions
SELECT r.id, p.id FROM role_ids r, perm_ids p WHERE r.name = 'SUPER_ADMIN'
UNION ALL
-- ADMIN gets all permissions
SELECT r.id, p.id FROM role_ids r, perm_ids p WHERE r.name = 'ADMIN'
UNION ALL
-- DISPATCHER
SELECT r.id, p.id FROM role_ids r, perm_ids p
WHERE r.name = 'DISPATCHER'
  AND p.key IN ('MONITOR_OPERATIONS', 'MANAGE_FLEET', 'MANAGE_CUSTOMERS',
                'MANAGE_DRIVERS', 'MANAGE_VEHICLES', 'CREATE_DELIVERY',
                'ASSIGN_DRIVER', 'UPDATE_DELIVERY_STATUS', 'VIEW_ANALYTICS',
                'OPTIMIZE_DISPATCH', 'MANAGE_INVOICES')
UNION ALL
-- DRIVER
SELECT r.id, p.id FROM role_ids r, perm_ids p
WHERE r.name = 'DRIVER'
  AND p.key IN ('VIEW_ASSIGNED_TASKS', 'UPDATE_DELIVERY_STATUS', 'UPLOAD_POD')
UNION ALL
-- ACCOUNTANT
SELECT r.id, p.id FROM role_ids r, perm_ids p
WHERE r.name = 'ACCOUNTANT'
  AND p.key IN ('VIEW_ANALYTICS', 'MANAGE_INVOICES', 'MONITOR_OPERATIONS')
UNION ALL
-- HELPER
SELECT r.id, p.id FROM role_ids r, perm_ids p
WHERE r.name = 'HELPER'
  AND p.key IN ('VIEW_ASSIGNED_TASKS')
ON CONFLICT DO NOTHING;

-- Create admin user (password: admin123 - will need to hash with argon2 in-app)
-- This is a placeholder; the actual password should be set via the API
INSERT INTO public.users (email, name, password_hash, role_id, active_status)
SELECT 'admin@entregapro.com', 'Admin Master',
       '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
       id, true
FROM public.roles WHERE name = 'SUPER_ADMIN'
ON CONFLICT (email) DO NOTHING;

-- Create dispatcher user
INSERT INTO public.users (email, name, password_hash, role_id, active_status)
SELECT 'despachante@entregapro.com', 'Despachante Padrão',
       '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
       id, true
FROM public.roles WHERE name = 'DISPATCHER'
ON CONFLICT (email) DO NOTHING;

-- Create driver user
INSERT INTO public.users (email, name, password_hash, role_id, active_status)
SELECT 'motorista@entregapro.com', 'Motorista Padrão',
       '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
       id, true
FROM public.roles WHERE name = 'DRIVER'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- POSTGIS SPATIAL REFERENCE SYSTEM (required for PostGIS)
-- ============================================================
-- The spatial_ref_sys table is automatically created by PostGIS extension.
-- Include entries if needed for custom projections.

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Active deliveries with customer and driver names
CREATE OR REPLACE VIEW public.v_active_deliveries AS
SELECT
  d.id,
  d.delivery_number,
  d.status,
  d.material_type,
  d.quantity,
  d.delivery_address,
  d.latitude,
  d.longitude,
  d.scheduled_time,
  d.eta_minutes,
  d.created_at,
  c.name AS customer_name,
  c.phone AS customer_phone,
  u.name AS driver_name,
  v.vehicle_number
FROM public.deliveries d
LEFT JOIN public.customers c ON d.customer_id = c.id
LEFT JOIN public.drivers dr ON d.driver_id = dr.id
LEFT JOIN public.users u ON dr.user_id = u.id
LEFT JOIN public.vehicles v ON d.vehicle_id = v.id
WHERE d.deleted_at IS NULL
  AND d.status NOT IN ('DELIVERED', 'CANCELLED');

-- Executive dashboard summary
CREATE OR REPLACE VIEW public.v_executive_summary AS
SELECT
  (SELECT COUNT(*) FROM public.deliveries WHERE status NOT IN ('DELIVERED', 'CANCELLED') AND deleted_at IS NULL AND created_at >= CURRENT_DATE) AS daily_count,
  (SELECT COUNT(*) FROM public.deliveries WHERE status NOT IN ('DELIVERED', 'CANCELLED') AND scheduled_time < now() AND deleted_at IS NULL) AS delayed_count,
  (SELECT COUNT(*) FROM public.drivers WHERE is_online = true AND deleted_at IS NULL) AS active_drivers,
  (SELECT COUNT(*) FROM public.deliveries WHERE status = 'DELIVERED' AND deleted_at IS NULL AND created_at >= CURRENT_DATE) AS completed_today;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
