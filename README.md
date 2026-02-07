# GymStack SaaS — Multi-Tenant Multi-Gym Membership Platform

## 1. Multi-Tenant Architecture Overview
**Goal:** A scalable, production-grade SaaS platform where each gym or gym chain operates inside a fully isolated tenant workspace.

**Tenant types**
- **Single Gym**: One location, one tenant.
- **Gym Chain**: Multiple locations under a parent organization; still a single tenant with multiple locations.

**High-level architecture (SaaS, multi-tenant):**
- **Frontend:** Next.js (App Router) with tenant-aware routing and branding.
- **API:** Node.js (NestJS) with strict tenant scoping in all queries.
- **Database:** PostgreSQL with tenant_id in every table + row-level security (RLS).
- **Auth:** JWT + RBAC, tenant-bound claims.
- **Realtime:** WebSockets (NestJS gateway) with tenant-aware channels.
- **Payments:** Stripe (two billing flows: platform billing for gyms, gym billing for members).
- **Infra:** Dockerized services, CI/CD, and managed Postgres.

**Tenant isolation model:**
- Every record has a **tenant_id**.
- All queries include **tenant_id** via middleware/ORM hooks.
- PostgreSQL RLS policies enforce tenant_id at the database level.
- JWTs include **tenant_id** and **role**.

---

## 2. Database Schema (Tenant Isolation)
**All tables include tenant_id, and tenant_id is part of every unique/foreign key relationship.**

### Core entities
- **tenants**
  - id (UUID, PK)
  - type (single_gym | chain)
  - name
  - branding (logo_url, primary_color)
  - status (active | suspended)
  - created_at

- **locations**
  - id (UUID, PK)
  - tenant_id (FK → tenants.id)
  - name, address

- **users**
  - id (UUID, PK)
  - tenant_id (FK → tenants.id)
  - role (platform_admin | tenant_admin | trainer | member)
  - email, password_hash
  - status

- **memberships** (gym membership subscriptions)
  - id (UUID, PK)
  - tenant_id (FK)
  - member_id (FK → users.id)
  - plan_id (FK → membership_plans.id)
  - status, renew_at

- **membership_plans**
  - id (UUID, PK)
  - tenant_id (FK)
  - name, price, interval

- **trainers_members** (assignment)
  - id (UUID, PK)
  - tenant_id (FK)
  - trainer_id (FK → users.id)
  - member_id (FK → users.id)

- **workout_plans**
  - id (UUID, PK)
  - tenant_id (FK)
  - member_id (FK)
  - trainer_id (FK)
  - version, data_json

- **meal_plans**
  - id (UUID, PK)
  - tenant_id (FK)
  - member_id (FK)
  - trainer_id (FK)
  - version, data_json

- **progress_logs**
  - id (UUID, PK)
  - tenant_id (FK)
  - member_id (FK)
  - metrics_json, notes

- **messages**
  - id (UUID, PK)
  - tenant_id (FK)
  - sender_id (FK → users.id)
  - recipient_id (FK → users.id)
  - body

- **platform_subscriptions** (gym → platform)
  - id (UUID, PK)
  - tenant_id (FK)
  - stripe_subscription_id
  - plan_id (FK → platform_plans.id)
  - status

- **platform_plans**
  - id (UUID, PK)
  - name, price, limits_json

**Tenant data isolation:**
- All foreign keys include tenant_id.
- Unique constraints are composite (tenant_id, id) when needed.
- RLS policies enforce tenant_id from session context.

---

## 3. Auth & Authorization Flow
1. **Login** → user credentials validated → JWT issued with:
   - user_id
   - tenant_id
   - role
2. **API middleware** verifies JWT and injects `tenantId` into request context.
3. **RBAC guard** checks role against required permission.
4. **Database queries** are scoped to tenant_id.
5. **Postgres RLS** enforces tenant_id even if query is malformed.

**Role permissions:**
- **Platform Admin:** global access across tenants.
- **Tenant Admin:** full access within tenant.
- **Trainer:** access only assigned members.
- **Member:** access only self.

---

## 4. API Endpoints (Tenant & Role Checks)
**Platform admin (global):**
- `GET /platform/tenants` (Platform Admin)
- `POST /platform/plans` (Platform Admin)

**Tenant admin:**
- `GET /tenant/members` (Tenant Admin)
- `POST /tenant/membership-plans` (Tenant Admin)
- `POST /tenant/trainers/assign` (Tenant Admin)

**Trainer:**
- `GET /trainer/members` (Trainer)
- `POST /trainer/workout-plans` (Trainer)

**Member:**
- `GET /member/plans` (Member)
- `POST /member/progress` (Member)

Each route uses tenant-aware guards and query filters.

---

## 5. Example Backend Middleware
```ts
// NestJS Guard Example
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.tenantId) throw new UnauthorizedException();
    req.tenantId = user.tenantId;
    return true;
  }
}
```

---

## 6. Example Frontend Structure (Next.js)
```
/app
  /[tenant]
    /dashboard
    /members
    /trainers
    /billing
  /platform
    /tenants
    /plans
```

- Tenant-aware routing uses `[tenant]` param.
- Branding is loaded via `tenant_id`.

---

## 7. Frontend Local Preview
The frontend lives in `frontend/` and uses Next.js App Router. To run locally:

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` to view the landing page. Tenant and platform
pages are accessible at:

- `http://localhost:3000/acme/dashboard`
- `http://localhost:3000/acme/members`
- `http://localhost:3000/acme/trainers`
- `http://localhost:3000/acme/billing`
- `http://localhost:3000/platform`
- `http://localhost:3000/platform/tenants`
- `http://localhost:3000/platform/plans`

---

## 8. Billing Logic
**Platform Billing (Gym → SaaS):**
- Stripe subscription per tenant.
- Plan limits enforced (members, trainers, locations).
- Usage enforcement in API layer.

**Gym Billing (Member → Gym):**
- Tenant-defined membership plans.
- Stripe products created per tenant.
- Webhooks scoped by tenant_id.

---

## 9. Security & Scaling Considerations
- Postgres RLS and strict tenant_id scoping.
- JWT short TTL + refresh tokens.
- Rate limiting per tenant.
- Audit logs for admin actions.
- Horizontal scaling with stateless API.

---

## 9. MVP vs Full SaaS Roadmap
**MVP:**
- Tenant isolation (single gym only)
- Member management
- Trainer assignments
- Stripe billing for gyms
- Workout & meal plans

**Full SaaS:**
- Gym chains (multi-location)
- Advanced analytics
- Real-time chat
- Usage-based plan limits
- White-label branding

---

## 10. Tech Stack Justification
- **Next.js:** fast SSR, modular routing.
- **NestJS:** structured architecture and RBAC middleware.
- **Postgres + RLS:** enforce tenant boundaries at DB level.
- **Stripe:** reliable subscription billing.
- **WebSockets:** real-time trainer-member chat.

---

**This architecture ensures strict tenant isolation, scalability, and production readiness.**
