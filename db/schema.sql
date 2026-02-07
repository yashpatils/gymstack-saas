-- GymStack SaaS: multi-tenant schema with row-level security

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('single_gym', 'chain')),
  name TEXT NOT NULL,
  branding JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  address TEXT,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE users (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL CHECK (role IN ('platform_admin', 'tenant_admin', 'trainer', 'member')),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, email)
);

CREATE TABLE membership_plans (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  interval TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE memberships (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  status TEXT NOT NULL,
  renew_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, member_id) REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, plan_id) REFERENCES membership_plans(tenant_id, id)
);

CREATE TABLE trainers_members (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  trainer_id UUID NOT NULL,
  member_id UUID NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, trainer_id) REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, member_id) REFERENCES users(tenant_id, id)
);

CREATE TABLE workout_plans (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data_json JSONB NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, member_id) REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, trainer_id) REFERENCES users(tenant_id, id)
);

CREATE TABLE meal_plans (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data_json JSONB NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, member_id) REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, trainer_id) REFERENCES users(tenant_id, id)
);

CREATE TABLE progress_logs (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL,
  metrics_json JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, member_id) REFERENCES users(tenant_id, id)
);

CREATE TABLE messages (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, sender_id) REFERENCES users(tenant_id, id),
  FOREIGN KEY (tenant_id, recipient_id) REFERENCES users(tenant_id, id)
);

CREATE TABLE platform_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  limits_json JSONB NOT NULL
);

CREATE TABLE platform_subscriptions (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stripe_subscription_id TEXT NOT NULL,
  plan_id UUID NOT NULL REFERENCES platform_plans(id),
  status TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_locations ON locations
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_membership_plans ON membership_plans
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_memberships ON memberships
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_trainers_members ON trainers_members
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_workout_plans ON workout_plans
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_meal_plans ON meal_plans
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_progress_logs ON progress_logs
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_messages ON messages
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_platform_subscriptions ON platform_subscriptions
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
