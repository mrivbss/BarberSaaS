# BarberSaaS Production Readiness Assessment

## Document status

| Field | Value |
|---|---|
| Assessment target | BarberSaaS used by paying customers in production |
| Current readiness decision | **NO-GO** |
| Scope | Application source, configuration, SQL artifacts, operational scripts, and repository-visible controls |
| Evidence boundary | Repository evidence only; the hosted Supabase and Vercel projects were not queried |
| Companion documents | [`01_ARCHITECTURE_REVIEW.md`](./01_ARCHITECTURE_REVIEW.md), [`02_BUSINESS_REVIEW.md`](./02_BUSINESS_REVIEW.md) |
| Application code changes | None |

This assessment evaluates the system as though it were about to receive real customer credentials, appointment data, tenant data, and financial records. A control is considered absent or unverified when it is not represented in the repository. A live platform setting may exist outside the repository, but it is not treated as evidence until it is exported, tested, and incorporated into the release process.

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Assessment method and severity model](#2-assessment-method-and-severity-model)
3. [Readiness scorecard](#3-readiness-scorecard)
4. [Security](#4-security)
5. [Authentication](#5-authentication)
6. [Authorization](#6-authorization)
7. [Multi-tenant isolation](#7-multi-tenant-isolation)
8. [Row Level Security](#8-row-level-security)
9. [Database integrity](#9-database-integrity)
10. [Environment variables](#10-environment-variables)
11. [Secrets management](#11-secrets-management)
12. [Logging](#12-logging)
13. [Monitoring](#13-monitoring)
14. [Error handling](#14-error-handling)
15. [Backups](#15-backups)
16. [Disaster recovery](#16-disaster-recovery)
17. [Performance](#17-performance)
18. [Scalability](#18-scalability)
19. [Deployment](#19-deployment)
20. [Operational risks](#20-operational-risks)
21. [Business risks](#21-business-risks)
22. [Launch blockers](#22-launch-blockers)
23. [Prioritized action plan](#23-prioritized-action-plan)
24. [Production acceptance checklist](#24-production-acceptance-checklist)
25. [Final readiness decision](#25-final-readiness-decision)

---

## 1. Executive summary

BarberSaaS is **not ready for paying customers in production**.

The frontend compiles successfully and the product has a clear operational scope, but production readiness is blocked by failures in identity, authorization, tenant isolation, schema reproducibility, and transactional integrity.

The most serious conditions are:

1. **The active login does not use Supabase Auth.** It queries `public.usuarios` by email and password and then treats a browser-created object as authentication.
2. **A clean login leaves database requests anonymous.** `tenant_session` is not a Supabase JWT and is not recognized by PostgREST or RLS.
3. **The repository does not represent active tenant-isolating RLS.** Historical and current snippets disable RLS, while the production snapshot grants broad access to `anon` and `authenticated`.
4. **Tenant and role claims are editable browser state.** `barberia_id` and `rol` are trusted from `localStorage` and are passed into database reads and writes.
5. **The database cannot be reproduced from the repository.** Base schema, numbered migration, manual snippets, ignored production snapshot, and frontend contracts are mutually incompatible.
6. **Core production flows are schema-incompatible.** Login requires a missing `password` column; public booking requires a missing `slug`, assumes tenant-owned services, and omits a required barber.
7. **Financial recording is not atomic.** Charging marks an appointment complete before inserting the corresponding gain, and the gain is not linked back through `cita_id`.
8. **Cross-tenant relational integrity is absent.** Foreign keys confirm row existence but do not prove that an appointment, barber, service, gain, and tenant belong together.
9. **Backups, restore testing, monitoring, alerting, incident response, and disaster-recovery controls are not represented.** Live vendor defaults are unknown and unverified.
10. **The release process lacks production gates.** There is no CI, automated test suite, schema deployment path, environment separation, rollback procedure, or post-deployment verification.

### 1.1 Production decision

| Decision | Meaning |
|---|---|
| **NO-GO** | Do not onboard paying customers or store real customer credentials, appointment data, or financial records under the repository-visible architecture |

### 1.2 Positive readiness signals

The assessment also found several useful foundations:

- The project is small and traceable.
- React route intent is clear.
- Static Vercel deployment is operationally simple.
- The UI has a typed reusable component layer.
- Most tenant reads already include explicit `barberia_id` filters.
- Monetary values use PostgreSQL numeric types in the available schema.
- Core timestamps use `TIMESTAMPTZ`.
- Tenant columns on the original tables have indexes.
- TypeScript checking succeeds for covered files.
- An in-memory Vite production build succeeds.
- Agenda batches its independent initial queries with `Promise.all`.
- There is no application-level N+1 loop in the main data-access paths.

These qualities do not offset the launch blockers because production security must be enforced by authenticated database requests and database policies, not by UI intent.

---

## 2. Assessment method and severity model

### 2.1 Evidence sources

The assessment uses:

- React entrypoint and routing.
- Route-level views.
- Browser-side service modules.
- Supabase client configuration.
- Base schema and migrations.
- Current and historical Supabase snippets.
- Ignored production-schema snapshot.
- Local setup, seed, and inspection scripts.
- npm, TypeScript, Vite, Vercel, Tailwind, and environment configuration.
- Successful TypeScript and in-memory Vite build checks from the repository review.

It does not assume the correctness of uninspected hosted settings.

### 2.2 Severity definitions

| Severity | Definition | Launch meaning |
|---|---|---|
| **Critical** | A condition can directly cause cross-tenant exposure, credential compromise, financial corruption, total feature failure, or an unrecoverable production state | Must be resolved and verified before any paying-customer launch |
| **High** | A condition can cause material data loss, unauthorized business operations, prolonged outages, undetected incidents, or inability to operate the service reliably | Must be resolved before general availability; only explicitly risk-accepted exceptions may remain in a tightly controlled non-production pilot |
| **Medium** | A condition affects scale, maintainability, user trust, accessibility, or operational efficiency but is not by itself an immediate catastrophic failure | Address before scale or within a time-bounded post-blocker release plan |
| **Low** | A hygiene, consistency, or polish issue with limited immediate operational impact | Address as normal engineering maintenance |

### 2.3 Finding state

| State | Meaning |
|---|---|
| Confirmed | Directly represented by repository code or SQL |
| Not evidenced | No repository artifact demonstrates the control |
| Unknown live state | The hosted platform may have a setting, but it was not inspected or exported |
| Inconsistent | Repository sources describe incompatible behaviors or schemas |

---

## 3. Readiness scorecard

| Area | Readiness | Highest severity | Repository conclusion |
|---|---|---|---|
| Security | Not ready | Critical | Anonymous access and client-controlled identity undermine the security boundary |
| Authentication | Not ready | Critical | Active login bypasses Supabase Auth and depends on an absent password column |
| Authorization | Not ready | Critical | Role and tenant checks are client-side and not authoritative |
| Multi-tenant isolation | Not ready | Critical | Tenant filtering exists in UI queries but is not enforced at the database boundary |
| RLS | Not ready | Critical | RLS is commented out, disabled, permissive, or absent in available artifacts |
| Database integrity | Not ready | Critical | Schema drift, cross-tenant consistency gaps, and non-atomic financial writes |
| Environment configuration | Not ready | High | Runtime ignores declared Vite environment variables and is tied to one hosted project |
| Secrets management | Partially understood, not ready | High | Public anon key is expected; local secret keys are tracked; production secret process is not represented |
| Logging | Not ready | High | Console statements and alerts only; no structured or security-aware logging |
| Monitoring | Not ready | High | No frontend, API, database, uptime, or business-metric alerting represented |
| Error handling | Not ready | High | Errors are inconsistent and some failures appear as successful empty states |
| Backups | Not evidenced | High | No retention, PITR, export, encryption, or restore-test evidence |
| Disaster recovery | Not ready | High | No RTO, RPO, recovery runbook, ownership, or exercise evidence |
| Performance | Unvalidated | High | No load tests, query-plan evidence, pagination, or compound query indexes |
| Scalability | Unvalidated | High | Shared database path depends on absent isolation and untested access patterns |
| Deployment | Not ready | High | No CI/CD gates, migration deployment, environment separation, rollback, or smoke tests |
| Operational readiness | Not ready | High | No alert ownership, incident response, audit trail, or runbooks |
| Business readiness | Not ready | Critical | Login, public booking, and financial correctness are not production-safe |

### 3.1 Consolidated findings by priority

#### Critical findings

| ID | Finding | Primary sections |
|---|---|---|
| C-01 | Active login queries the application user table by email and password instead of using Supabase Auth | Security, Authentication |
| C-02 | The custom `tenant_session` is accepted as identity and tenant authority without signature, expiry, or server validation | Authentication, Multi-tenant isolation |
| C-03 | Private database operations execute as `anon` after the active login on a clean browser | Authentication, Authorization, RLS |
| C-04 | Broad anonymous/authenticated privileges and disabled or absent RLS leave tenant data without a represented database security boundary | Security, Multi-tenant isolation, RLS |
| C-05 | Roles are not enforced and caller-controlled tenant, barber, and role values reach database operations | Authorization, Multi-tenant isolation |
| C-06 | Cross-tenant consistency between users, appointments, services, gains, and tenants is not enforced | Multi-tenant isolation, Database integrity |
| C-07 | The repository cannot reproduce one canonical database schema | Database integrity, Deployment |
| C-08 | Active login and public booking depend on missing or incompatible schema fields | Authentication, Database integrity, Business risks |
| C-09 | Appointment completion and revenue creation are separate, non-idempotent operations | Database integrity, Error handling, Business risks |
| C-10 | Public booking has no database-enforced collision behavior and omits the required barber under available schemas | Database integrity, Scalability, Business risks |

#### High findings

| ID | Finding | Primary sections |
|---|---|---|
| H-01 | Auth state, profile state, custom session state, and route state can diverge | Authentication |
| H-02 | Logout does not clear all identity state and can create conflicting redirects | Authentication, Error handling |
| H-03 | Employee provisioning is client-authorized and split across non-atomic Auth/profile operations | Authentication, Authorization |
| H-04 | Public booking has no represented abuse or rate-control layer | Security, Scalability |
| H-05 | Common compound query paths and multiple foreign-key columns lack represented indexes | Database integrity, Performance |
| H-06 | Runtime configuration ignores declared environment variables and has no environment separation | Environment variables, Deployment |
| H-07 | No production secret lifecycle, scanning, rotation, or privileged-operation boundary is documented | Secrets management |
| H-08 | Logging is console-only and no security or financial audit trail exists | Logging, Operational risks |
| H-09 | No application, database, uptime, business-invariant, or backup monitoring is represented | Monitoring |
| H-10 | Error handling is inconsistent and infrastructure failures can look like valid empty business data | Error handling |
| H-11 | Backup schedule, retention, PITR, and restore validation are not evidenced | Backups |
| H-12 | RPO, RTO, recovery runbooks, incident ownership, and recovery exercises are absent | Disaster recovery |
| H-13 | Performance and concurrency behavior are untested, and growing lists are unpaginated | Performance, Scalability |
| H-14 | No CI/CD, schema release gate, environment promotion, rollback, or deployment smoke test exists | Deployment |
| H-15 | Dashboard reporting can be inaccurate because of silent failures, timezone handling, stale status display, and a hardcoded rating | Error handling, Business risks |
| H-16 | Hard appointment deletion and missing actor attribution weaken operational accountability | Logging, Operational risks, Business risks |

#### Medium findings

| ID | Finding | Primary sections |
|---|---|---|
| M-01 | No dependency, secret, static security, or license scanning is automated | Security, Deployment |
| M-02 | No environment template, configuration catalogue, or Node engine declaration exists | Environment variables, Deployment |
| M-03 | Local service credentials are tracked even though they target localhost | Secrets management |
| M-04 | Database diagnostic extensions exist without repository-defined dashboards, thresholds, or ownership | Monitoring |
| M-05 | Missing tenant values and malformed local state can leave pages loading or produce rendering errors | Error handling |
| M-06 | Dashboard requests independent data sequentially and aggregates revenue in the browser | Performance |
| M-07 | All route code is eagerly loaded and the largest pages combine data, business, and presentation logic | Performance, Scalability |
| M-08 | No cache or realtime synchronization keeps different staff sessions current | Scalability |
| M-09 | Generated CLI metadata is tracked while critical SQL state is ignored | Operational risks |
| M-10 | No commercial subscription, tenant lifecycle, or platform-administration implementation exists | Business risks |
| M-11 | Accessibility and mobile-navigation limitations affect staff and public workflows | Prioritized action plan |
| M-12 | Domain types are incomplete because complex `.jsx` code is unchecked and Supabase types are not generated | Database integrity, Prioritized action plan |

#### Low findings

| ID | Finding | Primary sections |
|---|---|---|
| L-01 | Fonts are loaded through both HTML and CSS | Prioritized action plan |
| L-02 | Global heading CSS conflicts with the configured serif heading style | Prioritized action plan |
| L-03 | `.gitignore` repeats exact snippet rules | Operational risks, Prioritized action plan |
| L-04 | Release revision and environment metadata are not visible to operators | Deployment, Prioritized action plan |
| L-05 | Navigation, calendar, and styling implementations contain duplicated or inactive refactor remnants | Prioritized action plan |

---

## 4. Security

### 4.1 Critical: effective security boundary is in the browser

**Status:** Confirmed  
**Evidence:** [`src/App.tsx`](../src/App.tsx), [`src/views/Login.tsx`](../src/views/Login.tsx), [`src/config/supabaseClient.ts`](../src/config/supabaseClient.ts)

The application treats a truthy JSON object in `localStorage` as an authenticated session. That object contains the user ID, tenant ID, and role and can be created or edited through browser developer tools.

The UI then passes those identifiers into PostgREST filters and mutation payloads. Browser filtering is not a security control because a user can bypass the UI and call the public Supabase API directly.

**Production impact:**

- Session fabrication.
- Tenant impersonation.
- Role impersonation.
- Cross-tenant query attempts.
- Unauthorized mutation attempts.
- No reliable attribution of business actions.

**Production exit criteria:**

- Every private request carries a verified Supabase Auth identity.
- Tenant and role membership are resolved from database-controlled state tied to `auth.uid()`.
- Browser-supplied tenant or role values are treated only as request inputs and are independently authorized by the database.
- Negative tests prove that modified local storage does not change accessible data or capabilities.

### 4.2 Critical: public data privileges are broader than the product requires

**Status:** Confirmed in repository SQL; live state unknown  
**Evidence:** [`estructura_produccion.sql`](../estructura_produccion.sql), [historical RLS disable snippet](<../supabase_old/snippets/Untitled query 870.sql>), [service grants](<../supabase/snippets/Untitled query 288.sql>)

The production snapshot grants broad table privileges to `anon` and `authenticated`. Historical snippets explicitly disable RLS on original tables, and a current ignored snippet disables RLS on `servicios`.

The local `check-tables.mjs` script demonstrates anonymous selection of complete barber-shop and user tables.

The product only requires narrow public capabilities for booking, but the represented privileges cover private user, appointment, and financial data.

**Production impact:**

- User enumeration.
- Tenant data exposure.
- Appointment exposure.
- Revenue exposure.
- Unauthorized service or booking mutation.
- Increased impact of any frontend or direct-API abuse.

**Production exit criteria:**

- `anon` has only the minimum public booking permissions.
- Private user, appointment, and financial tables deny anonymous reads and writes.
- `authenticated` privileges are paired with restrictive RLS rather than relied on alone.
- Direct REST tests verify denied access without a valid user and across tenants.

### 4.3 High: no application security headers are represented

**Status:** Not evidenced  
**Evidence:** [`vercel.json`](../vercel.json) contains only an SPA rewrite

No repository configuration represents:

- Content Security Policy.
- Frame restrictions.
- Referrer policy.
- Permissions policy.
- MIME sniffing protection.
- Application-specific transport/security header verification.

Some transport controls may be supplied by Vercel, but they are not documented or tested in the repository.

**Production exit criteria:**

- Required response headers are defined or platform-managed and verified in deployed environments.
- External font origins and Supabase endpoints are explicitly accounted for in the policy.
- A deployed header test is part of release verification.

### 4.4 High: no abuse controls for public booking are represented

**Status:** Confirmed absent from application source

The public page directly inserts appointments and contains no represented:

- CAPTCHA or equivalent human-verification control.
- Rate-limiting workflow.
- Booking verification.
- Idempotency key.
- Per-tenant booking quota.
- Duplicate-request protection.

Platform-level controls may exist outside the repository but are unknown.

**Production impact:**

- Spam appointments.
- Automated slot exhaustion.
- Resource consumption.
- Noisy business data.
- Customer-service burden.

### 4.5 Medium: no dependency or security scanning is represented

**Status:** Not evidenced

There is no CI configuration for:

- Dependency vulnerability scanning.
- Secret scanning.
- Static application security testing.
- License checking.
- Container or infrastructure scanning.

The lockfile is committed, which improves reproducibility, but no automated security gate uses it.

---

## 5. Authentication

### 5.1 Critical: active login bypasses Supabase Auth

**Status:** Confirmed  
**Evidence:** [`src/views/Login.tsx`](../src/views/Login.tsx)

The active login performs:

```text
SELECT * FROM usuarios
WHERE email = submitted email
AND password = submitted password
```

It does not call `supabase.auth.signInWithPassword`.

There is no hashing or password-verification function in the repository. Direct string comparison implies that any compatible deployed column would contain a directly comparable credential representation.

Because `select('*')` is used, a deployed `password` field can also be returned to the browser with the matching row.

PostgREST filters are normally conveyed as request query parameters, increasing the possibility that credential values appear in intermediary request logs or diagnostics.

**Production impact:**

- Credential disclosure.
- Absence of standard password hashing and breach protections.
- No Auth token issuance.
- No trusted identity for RLS.
- No Auth-level rate limiting or lifecycle.

**Production exit criteria:**

- The active login uses Supabase Auth or another production-grade identity provider.
- Passwords are never stored or queried in application tables.
- Successful login yields a verifiable Auth session.
- Failed-login behavior is tested for rate limiting and information leakage.
- The `usuarios` profile stores business metadata only.

### 5.2 Critical: active login is incompatible with repository schemas

**Status:** Confirmed inconsistent  
**Evidence:** [`db/schema.sql`](../db/schema.sql), [`estructura_produccion.sql`](../estructura_produccion.sql)

Neither available `usuarios` definition contains `password`. A database created from repository SQL cannot support the active login query.

**Production impact:**

- Login failure in a recreated environment.
- Undocumented dependency on manually altered hosted state.
- No reliable staging/production parity.

### 5.3 Critical: route session is not validated

**Status:** Confirmed  
**Evidence:** [`src/App.tsx`](../src/App.tsx)

`App` accepts any successfully parsed `tenant_session` object. It does not call:

- `getSession`.
- `getUser`.
- `onAuthStateChange`.

The custom session has no expiry, issuer, signature, revocation, or validation mechanism.

### 5.4 High: Supabase Auth and custom identity can diverge

**Status:** Confirmed architectural possibility

The Supabase client enables Auth persistence, while routing relies on separate custom storage. A persisted Supabase Auth session can represent one user while `tenant_session` represents another.

**Production impact:**

- UI authorization and database authorization can operate under different identities.
- Incidents become difficult to attribute.
- Tenant metadata can be paired with the wrong Auth user.

### 5.5 High: logout does not terminate identity correctly

**Status:** Confirmed  
**Evidence:** [`src/views/Dashboard.jsx`](../src/views/Dashboard.jsx), [`src/App.tsx`](../src/App.tsx)

Logout removes custom storage and navigates, but does not:

- Clear `App.usuario`.
- Call `supabase.auth.signOut`.
- Reconcile the Dashboard session.

The login and dashboard guards can redirect against each other.

### 5.6 High: Auth/profile synchronization is not authoritative

**Status:** Confirmed

The base schema only comments that `usuarios.id` should equal `auth.uid()`. There is no represented:

- Foreign key to `auth.users`.
- Profile-creation trigger.
- Profile deletion lifecycle.
- Email synchronization.
- User status synchronization.

The local setup script manually assigns all missing Auth users to the first tenant as administrators.

### 5.7 High: employee provisioning is client-authorized and non-atomic

**Status:** Confirmed in dormant code  
**Evidence:** [`src/services/registerEmployee.ts`](../src/services/registerEmployee.ts)

The unused provisioning function trusts `adminSession.rol`, calls browser-side `signUp`, and then inserts a profile with the supplied tenant and role.

Auth account creation and profile creation are separate operations.

**Production exit criteria for employee provisioning:**

- Only a verified tenant administrator can invoke provisioning.
- Tenant and assignable roles are derived or validated server-side.
- The Auth/profile lifecycle has defined compensation for partial failure.
- Invitation, activation, deactivation, and removal states are auditable.

---

## 6. Authorization

### 6.1 Critical: role is data, not enforced authorization

**Status:** Confirmed

`usuarios.rol` allows `admin` and `barbero`, but the active application does not use the value to restrict routes or mutations.

Both roles can access:

- Dashboard.
- Agenda.
- Appointment creation.
- Appointment charging.
- Appointment deletion.
- Services.
- Service creation.
- Finance data.

The database artifacts contain no role-aware policies.

**Production impact:**

- Barbers can exercise administrative capabilities.
- Financial visibility is not role-scoped.
- Destructive operations are not role-scoped.
- The role field creates an appearance of authorization without enforcing it.

### 6.2 Critical: authorization inputs come from the caller

The browser supplies:

- `barberia_id`.
- `barbero_id`.
- Employee role in dormant provisioning.
- Gain ownership identifiers.

No authoritative layer proves those values belong to the authenticated user or tenant.

### 6.3 High: operation filters are inconsistent

Appointment deletion filters by appointment ID and tenant ID. Appointment charging updates by appointment ID alone.

Service creation inserts a complete browser-supplied object.

The inconsistency means some operations provide an additional application filter while others do not. Neither pattern replaces RLS.

### 6.4 High: no authorization matrix or automated permission tests exist

There is no represented specification or test suite for:

- Anonymous customer capabilities.
- Barber capabilities.
- Tenant administrator capabilities.
- Platform operator capabilities.
- Service-role-only capabilities.

**Production exit criteria:**

- A documented route/API/table operation matrix exists.
- RLS policies encode the matrix.
- Automated tests cover positive and negative access for every role.
- Tests include user-to-user and tenant-to-tenant denial cases.

---

## 7. Multi-tenant isolation

### 7.1 Critical: tenant identity is editable local state

**Status:** Confirmed

`barberia_id` is loaded from `tenant_session` and used in most reads and writes. A browser user can change it.

Explicit `.eq('barberia_id', ...)` filters are useful query constraints but do not establish isolation.

### 7.2 Critical: cross-tenant relational integrity is absent

**Status:** Confirmed  
**Evidence:** [`db/schema.sql`](../db/schema.sql)

The schema has independent foreign keys:

- `citas.barbero_id → usuarios.id`.
- `citas.barberia_id → barberias.id`.
- `ganancias.cita_id → citas.id`.
- `ganancias.barbero_id → usuarios.id`.
- `ganancias.barberia_id → barberias.id`.

It does not enforce that the referenced user, appointment, service, and gain share the same tenant.

Structurally valid cross-tenant rows can therefore exist.

### 7.3 Critical: service tenancy is inconsistent

The numbered migration models tenant-owned services. The manual creation snippet and production snapshot model a global service table without `barberia_id`. The frontend requires Spanish field names plus tenant ownership.

There is no reproducible service model that provides both the active UI contract and tenant isolation.

### 7.4 High: no tenant lifecycle is represented

There is no production workflow for:

- Tenant creation.
- Initial administrator assignment.
- Tenant suspension.
- Tenant deletion review.
- Data export.
- Tenant offboarding.
- Retention after cancellation.

Deleting a barber shop cascades through tenant-linked users, appointments, and gains under the base schema.

### 7.5 Required isolation test suite

Production acceptance requires tests proving that:

- An anonymous client cannot read private tenant rows.
- Authenticated tenant A cannot read, insert, update, or delete tenant B rows.
- A barber cannot assign an appointment to another tenant’s barber.
- A gain cannot reference another tenant’s appointment or barber.
- A service cannot be attached across tenants.
- Changing `tenant_session` does not alter accessible data.
- Direct PostgREST calls are denied even when the UI is bypassed.
- Service-role operations remain confined to trusted server-side tooling.

---

## 8. Row Level Security

### 8.1 Critical: tenant RLS is not active in repository artifacts

**Status:** Confirmed

Repository evidence includes:

- A commented-out future RLS example in [`db/schema.sql`](../db/schema.sql).
- Historical snippets disabling RLS on `barberias`, `usuarios`, `citas`, and `ganancias`.
- A current ignored snippet disabling RLS on `servicios`.
- Permissive `SELECT USING (true)` policies in the production snapshot.
- No `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements in that snapshot.
- Broad grants to `anon` and `authenticated`.

The `SET row_security = off` line in the dump is a dump-session setting rather than table policy state. The absence of table-level enable statements is the relevant evidence.

### 8.2 Required production RLS scope

Every tenant or user data table requires an explicit policy model:

| Table | Anonymous access | Authenticated access required for production |
|---|---|---|
| `barberias` | Only fields necessary to resolve/display a public booking page | Tenant members read their tenant; tenant administration follows role matrix |
| `usuarios` | None | User reads own profile; tenant-scoped staff reads only if business-required; role changes restricted |
| `servicios` | Read only active services for a public tenant page | Tenant-scoped management according to role matrix |
| `citas` | Narrow insert for validated public booking; no broad anonymous select/update/delete | Tenant-scoped read/write according to role and ownership |
| `ganancias` | None | Tenant-scoped financial access restricted by role |

The final policy design must reflect the chosen business authorization matrix; the current repository does not define that matrix.

### 8.3 RLS implementation requirements

- Enable RLS on every exposed tenant table.
- Use both `USING` and `WITH CHECK` where appropriate so writes cannot assign unauthorized tenant IDs.
- Resolve membership from `auth.uid()` and database-controlled rows.
- Wrap stable Auth calls as `(select auth.uid())` in policies so they can be evaluated once per statement.
- Index columns used by policy predicates, especially `usuarios.id`, `usuarios.barberia_id`, and tenant keys.
- Keep security-definer helpers minimal, schema-qualified, and configured with a safe `search_path` if complex membership checks are needed.
- Ensure service-role credentials are never present in browser code.
- Test policies through the same anon and authenticated API roles used by the application.
- Verify table-owner and privileged-role behavior separately from normal application roles.

### 8.4 RLS rollout dependency

RLS cannot be meaningfully validated against the active login because active login produces no Supabase Auth identity. Authentication and profile membership must be made authoritative before private RLS policies can use `auth.uid()`.

### 8.5 RLS performance requirements

Policy correctness precedes optimization, but launch validation must also check:

- Index usage on tenant and membership columns.
- Query plans for tenant list and dashboard paths under RLS.
- Policy helper execution frequency.
- Absence of row-by-row unindexed membership subqueries.
- Query latency for realistic tenant sizes.

---

## 9. Database integrity

### 9.1 Critical: there is no canonical database source of truth

**Status:** Confirmed inconsistent

Material schema state is divided among:

- [`db/schema.sql`](../db/schema.sql).
- [`db/migrations/001_servicios.sql`](../db/migrations/001_servicios.sql).
- Current manual snippets.
- Historical snippets.
- Ignored [`estructura_produccion.sql`](../estructura_produccion.sql).

The active `supabase` directory has no migration chain or current `config.toml`.

**Production impact:**

- Environments cannot be reproduced deterministically.
- Staging and production can drift silently.
- Rollback state is unclear.
- Application contracts cannot be verified in CI.
- Security policies can exist only as manual hosted state.

**Production exit criteria:**

- One versioned migration chain recreates the complete schema from an empty database.
- The live schema is diffed against that chain and reconciled.
- Migrations include tables, constraints, indexes, grants, policies, functions, and seed-independent reference data.
- A clean ephemeral environment can apply every migration and run contract tests.

### 9.2 Critical: service schema is internally incompatible

| Source | Primary key | Tenant | Columns |
|---|---|---|---|
| Numbered migration | UUID | Present | `name`, `duration_minutes`, `price`, `description`, `active` |
| Manual/production model | Bigint | Absent | `nombre`, `duracion`, `precio` |
| Frontend | Numeric behavior | Required | `nombre`, `duracion`, `precio`, `barberia_id` |

The migration uses `CREATE TABLE IF NOT EXISTS`; applying it to an existing divergent service table does not correct the table.

### 9.3 Critical: active feature contracts are absent from schema

- `usuarios.password` is required by active login but absent.
- `barberias.slug` is required by public booking but absent.
- `citas.servicio_id` and `citas.estado` are absent from the base schema.
- Public booking omits `barbero_id`, which is required in both schema snapshots.
- Agenda expects duplicate-slot uniqueness, but no such constraint is represented.

### 9.4 Critical: charging is not transactional or idempotent

**Evidence:** [`src/appointments/getAppointments.ts`](../src/appointments/getAppointments.ts)

Current sequence:

```text
UPDATE appointment to completed
        │
        ▼
INSERT gain
```

Failure scenarios:

- Appointment completed, gain missing.
- Retried operation inserts more than one gain.
- Gain exists without `cita_id` attribution.
- Concurrent requests both charge the same appointment.

**Production exit criteria:**

- One database transaction performs the state transition and gain creation.
- The row is conditionally transitioned from the allowed source state.
- The gain records `cita_id`.
- A uniqueness/idempotency rule reflects the chosen payment model.
- Concurrent and retry tests prove exactly-once business behavior.
- The operation returns a complete success/failure result to the client.

### 9.5 High: cross-tenant constraints are missing

Required integrity decisions include:

- Whether a barber must belong to the appointment tenant.
- Whether a service must belong to the appointment tenant.
- Whether a gain’s barber and appointment must belong to the gain tenant.
- Whether only users with role `barbero` can be assigned.

The final schema must encode those decisions through composite keys, foreign keys, triggers, or transaction functions rather than relying only on UI behavior.

### 9.6 High: domain constraints are incomplete

No represented database constraints enforce:

- Allowed appointment states.
- Positive gain amount.
- Unique tenant slug.
- Appointment collision rules.
- One or more payments per appointment according to a defined model.
- Public-booking assignment requirements.

The numbered service migration includes better price, duration, and per-tenant name constraints, but it is incompatible with the deployed-looking schema.

### 9.7 High: foreign-key indexes are incomplete

PostgreSQL does not automatically index referencing foreign-key columns. No represented indexes cover:

- `citas.barbero_id`.
- `citas.servicio_id`.
- `ganancias.barbero_id`.
- `ganancias.cita_id`.

This affects joins, foreign-key checks, cascades, and delete/update performance as tables grow.

### 9.8 High: common compound access paths lack represented indexes

Observed query shapes include:

- Tenant plus appointment date and ordered time.
- Tenant plus gain creation timestamp.
- Tenant plus service creation order.
- Public tenant slug lookup.

Only single-column tenant indexes are represented on the original tables.

Candidate indexes must be chosen from verified query plans, with equality columns before range/order columns. Examples of access patterns to evaluate include:

- `(barberia_id, fecha, hora)` for agenda and upcoming appointments.
- `(barberia_id, creado_en)` for revenue ranges.
- Unique `slug` for public tenant resolution.
- Tenant ownership keys used by RLS.

### 9.9 Medium: data types are partly sound but inconsistent

Positive aspects:

- Monetary values use `NUMERIC`/`DECIMAL` rather than floating point.
- Creation timestamps use `TIMESTAMPTZ`.
- Core entity IDs use UUIDs.

Inconsistencies:

- Service IDs differ between UUID and bigint schemas.
- Appointment state is unconstrained `VARCHAR`.
- String fields use varying text types and naming conventions.
- The application has no generated types to surface these differences.

---

## 10. Environment variables

### 10.1 High: declared environment variables are ignored

**Status:** Confirmed  
**Evidence:** [`vite-env.d.ts`](../vite-env.d.ts), [`src/config/supabaseClient.ts`](../src/config/supabaseClient.ts)

The repository declares:

- `VITE_SUPABASE_URL`.
- `VITE_SUPABASE_ANON_KEY`.

The client instead embeds fixed values in source. The ignored `.env` currently contains matching values but is not consumed.

**Production impact:**

- Preview, staging, and production builds can target the same Supabase project.
- Configuration drift is hidden.
- Rotating the project reference requires a code change and rebuild.
- A developer preview can act on production data.

### 10.2 High: no environment separation is represented

There is no repository-visible configuration contract for:

- Development.
- Test.
- Preview.
- Staging.
- Production.

There is no startup validation that required variables exist or point to the expected environment.

### 10.3 Medium: no environment template or configuration documentation exists

`.env` is correctly ignored, but no `.env.example` or documented variable catalogue is present.

The production readiness contract must document:

- Variable name.
- Whether it is public or secret.
- Owning system.
- Allowed environments.
- Rotation behavior.
- Validation behavior.

---

## 11. Secrets management

### 11.1 Public anon key classification

The hosted Supabase anon key embedded in browser source is not a confidential server secret. Supabase browser applications necessarily expose their publishable/anon credential.

The security failure is not the visibility of this key; it is the excessive database capability available to the role behind it.

### 11.2 Medium: local service credentials are tracked

[`setup-data.mjs`](../setup-data.mjs) and [`seed-dashboard.mjs`](../seed-dashboard.mjs) embed a local secret/service key for `127.0.0.1`.

Because the URL is local, this does not establish exposure of a hosted production service role. It does establish a credential-management pattern in tracked source.

### 11.3 Critical requirement: service-role credentials must never enter browser code

No hosted service-role credential was found in the browser client. Production readiness requires preserving that boundary.

Any privileged employee-provisioning, data-repair, or platform-administration operation must run in trusted server-side infrastructure rather than the Vite bundle.

### 11.4 High: no production secret lifecycle is represented

There is no repository evidence for:

- Secret storage provider.
- Secret rotation.
- Access control.
- Audit history.
- Emergency revocation.
- Environment-specific injection.
- CI masking.
- Secret scanning.

**Production exit criteria:**

- Public and confidential configuration are classified.
- Confidential values are injected through a managed secret store.
- Browser bundles are checked to ensure no privileged credentials are present.
- Rotation and revocation are documented and tested.
- Repository and CI secret scanning are active.

---

## 12. Logging

### 12.1 High: application logging is console-only

The application uses:

- `console.log`.
- `console.error`.
- Browser alerts.
- Browser confirmation dialogs.

There is no structured logging transport.

### 12.2 High: no security or audit logging is represented

The system does not record an auditable event stream for:

- Login success or failure.
- Employee creation.
- Role changes.
- Appointment creation.
- Appointment deletion.
- Appointment charging.
- Gain creation.
- Tenant configuration changes.
- Access-denied events.
- Public-booking abuse.

Database row timestamps do not identify the acting user or request.

### 12.3 High: sensitive debug context can reach browser logs

Agenda logs session and identifier information during appointment creation. Active login uses `select('*')`, which risks unnecessarily handling credential fields if they exist.

### 12.4 Required production logging properties

Production logging must define:

- Structured event schema.
- Timestamp and environment.
- Request or correlation ID.
- Authenticated actor ID.
- Tenant ID.
- Operation name.
- Outcome and error category.
- Redaction rules.
- Retention period.
- Access control.
- Audit-event immutability expectations.

Passwords, access tokens, refresh tokens, service-role keys, and sensitive customer data must not be logged.

---

## 13. Monitoring

### 13.1 High: no application monitoring is represented

There is no repository integration for:

- Frontend exception tracking.
- Performance monitoring.
- Supabase API error-rate monitoring.
- Uptime checks.
- Synthetic login or booking checks.
- Release health.

### 13.2 High: no operational alerting is represented

There are no defined alerts for:

- Login failure spikes.
- Public-booking failure rate.
- Cross-tenant access denials.
- Database connection saturation.
- Slow queries.
- Storage growth.
- Backup failure.
- Elevated error rates.
- Deployment regressions.
- Revenue/appointment consistency failures.

### 13.3 Medium: database diagnostic capability exists but is unused

The production snapshot includes `pg_stat_statements`, but the repository contains no monitoring queries, dashboards, thresholds, or ownership for it.

Production database observation should cover:

- Most frequent queries.
- Highest total execution time.
- Highest mean execution time.
- Sequential scans on growing tables.
- Connection counts and states.
- Lock waits.
- Dead tuples and autovacuum activity.
- Table and index growth.
- Cache hit behavior.

### 13.4 Required service-level indicators

At minimum, paying-customer operation requires defined measurements for:

- Application availability.
- Login success rate and latency.
- Dashboard load success rate and latency.
- Appointment creation success rate and latency.
- Public booking success rate and latency.
- Charge transaction success rate and latency.
- Cross-tenant authorization denials.
- Database error rate.
- Backup success and last verified restore.

Alert ownership and escalation paths must be explicit.

---

## 14. Error handling

### 14.1 High: errors have inconsistent semantics

| Area | Current behavior |
|---|---|
| Dashboard services | Log and return zero or empty data |
| Appointment services | Throw errors |
| Finance services | Throw errors |
| Service-catalog services | Throw errors |
| Dormant login service | Return `null` |
| Dormant employee service | Return `false` |
| Views | Show browser alerts or log errors |

### 14.2 High: failures can appear as valid business states

Dashboard database failures appear as:

- Zero appointments.
- Zero revenue.
- No upcoming appointments.

The user cannot distinguish an actual empty day from an outage or authorization failure.

### 14.3 Critical: partial financial failure is possible

The charge flow can complete its first mutation and fail its second. The error alert reports a generic failure, but the appointment has already changed state.

### 14.4 High: no global exception boundary exists

There is no React error boundary, centralized request error model, or user-facing degraded-state strategy.

### 14.5 Medium: missing tenant values can cause indefinite loading or rendering errors

- DashboardHome can remain loading when no tenant ID is present.
- Servicios can remain loading when no tenant ID is present.
- `TenantBadge` assumes a string and can call `substring` on `undefined`.
- Only `App` catches malformed custom-session JSON.

### 14.6 Production error-handling requirements

- Distinguish authentication, authorization, validation, conflict, connectivity, and server errors.
- Preserve consistent typed error semantics across service modules.
- Never convert infrastructure failure into valid zero business data.
- Provide retry-safe behavior for idempotent reads and mutations.
- Surface a trace/correlation reference without exposing sensitive details.
- Capture unhandled frontend errors centrally.
- Define recoverable and unrecoverable UI states.

---

## 15. Backups

### 15.1 High: backup controls are not evidenced

The repository contains no evidence of:

- Automated backup schedule.
- Retention duration.
- Point-in-time recovery.
- Geographic redundancy.
- Backup encryption verification.
- Backup access controls.
- Tenant export capability.
- Restore testing.
- Backup failure alerts.

Supabase plan-level backup features may exist in the hosted project, but their current configuration was not inspected and cannot be credited by this assessment.

### 15.2 Data requiring backup coverage

Production backup scope must include:

- Supabase Auth identities and metadata as supported by the platform recovery process.
- `barberias`.
- `usuarios` profiles and memberships.
- `servicios`.
- `citas`.
- `ganancias`.
- Database functions.
- Triggers.
- RLS policies.
- Grants.
- Extensions required by the schema.
- Deployment migration state.

### 15.3 Restore validation requirements

Backup existence alone is insufficient. A production-ready process must demonstrate:

- Restoration into an isolated environment.
- Complete schema and policy restoration.
- Auth/profile consistency.
- Tenant isolation after restore.
- Application smoke tests against restored data.
- Measured restore duration.
- Documented last successful restore exercise.

---

## 16. Disaster recovery

### 16.1 High: no recovery objectives are represented

There is no documented:

- Recovery Point Objective (RPO).
- Recovery Time Objective (RTO).
- Maximum tolerable downtime.
- Data-loss acceptance.
- Incident severity model.

### 16.2 High: no disaster-recovery runbook exists

No repository documentation covers:

- Supabase outage response.
- Vercel outage response.
- Accidental data deletion.
- Credential compromise.
- Failed migration rollback.
- Cross-tenant exposure containment.
- Region-level service failure.
- DNS or domain failure.
- Corrupted release rollback.

### 16.3 High: no recovery ownership is defined

There is no represented on-call owner, escalation route, status communication process, or incident commander role.

### 16.4 Production disaster-recovery acceptance

- Business-approved RPO and RTO exist.
- Backup retention supports the RPO.
- A restore exercise demonstrates the RTO.
- Deployment and migration rollback procedures are tested.
- Credential-compromise rotation is rehearsed.
- A cross-tenant exposure incident has a containment and notification runbook.
- Customer communication ownership is defined.

---

## 17. Performance

### 17.1 High: production performance is untested

There are no represented:

- Load tests.
- Query-plan captures.
- Latency budgets.
- Bundle-size budgets.
- Performance regression tests.
- Real-user performance monitoring.

The in-memory Vite build transformed approximately 2,268 modules successfully, but build success is not a performance test.

### 17.2 High: unpaginated tenant queries

Agenda and finance retrieve complete tenant datasets.

Consequences as tenants grow:

- Larger network responses.
- More browser memory and rendering work.
- Longer initial load.
- Exposure to PostgREST row caps.
- Incomplete results when the API cap is reached.

The historical local Data API limit is 1,000 rows.

### 17.3 High: indexes do not match all common query shapes

Tenant-column indexes are present on original tables, but no represented compound indexes match tenant-plus-date/time query patterns.

Index requirements must be validated with `EXPLAIN (ANALYZE, BUFFERS)` against realistic data. Specific observations to test include:

- Sequential scans.
- Rows removed by filters.
- Sort spill behavior.
- Repeated nested-loop work.
- RLS predicate cost.

### 17.4 Medium: dashboard performs independent calls sequentially

Dashboard statistics and upcoming appointments are loaded one after the other. Agenda correctly batches independent initial reads.

### 17.5 Medium: all routes are eagerly imported

Login, dashboard, Agenda, Services, Finance, and Public Booking are part of the static import graph. The two largest route views contain extensive UI logic.

### 17.6 Medium: daily metrics perform client-side aggregation

Daily revenue rows are transferred to the browser and summed there. Finance also transfers every gain and aggregates in the browser.

### 17.7 Medium: timezone calculation affects performance correctness

The current date is derived in UTC, then local day boundaries are rebuilt and converted back to ISO. This is primarily a correctness risk but also complicates query and index predictability around day boundaries.

### 17.8 Positive performance observations

- No obvious application-level N+1 loop exists in the active data paths.
- Supabase embedded relations are used for appointments/services and appointments/users.
- Dashboard appointment count uses a head-only exact count rather than transferring rows.
- Upcoming appointments are limited to five.
- Agenda initial appointment and service reads execute concurrently.
- Static assets can be served through Vercel’s CDN architecture.

---

## 18. Scalability

### 18.1 Frontend scalability

The frontend is stateless static content and is structurally suited to horizontal delivery through Vercel.

Scaling limits are more likely to occur in:

- Database access patterns.
- Public booking traffic.
- Table and index growth.
- RLS policy execution.
- Browser rendering of unpaginated data.

### 18.2 High: database scalability is unvalidated

No evidence establishes behavior for:

- Large numbers of tenants.
- Large appointment histories.
- High public-booking concurrency.
- Concurrent charging.
- Large financial histories.
- RLS overhead.
- Connection saturation.

### 18.3 Connection management

The browser uses Supabase’s HTTP Data API rather than opening raw PostgreSQL connections. Production connection pooling and limits are therefore primarily hosted Supabase configuration concerns.

The historical local configuration has the database pooler disabled. This does not prove hosted production configuration.

Production validation must inspect:

- Supabase project compute tier.
- Direct versus pooled connections used by any future server-side workloads.
- Maximum connection capacity.
- Active and idle connection counts.
- Workload-specific timeouts.
- Connection alerts.

### 18.4 High: public-booking concurrency has no integrity control

Two customers can select and submit the same visible slot. There is no represented availability query or database constraint that guarantees a single booking.

### 18.5 Medium: shared-schema tenancy depends on policy/index discipline

Shared-schema multi-tenancy can support many tenants, but production behavior depends on:

- Correct RLS.
- Indexed tenant predicates.
- Tenant-aware composite indexes.
- Per-tenant pagination.
- Cross-tenant integrity constraints.
- Load tests with skewed tenant sizes.

### 18.6 Medium: no cache or realtime synchronization layer exists

Every route mount performs fresh reads, while updates from other users are not reflected until refetch or remount. This is a consistency and load consideration rather than an immediate launch blocker after core security issues are resolved.

---

## 19. Deployment

### 19.1 Positive deployment characteristics

- Vite produces a static SPA.
- Vercel rewrite configuration supports deep client routes.
- The package lockfile is committed.
- TypeScript and Vite builds succeed in the inspected environment.
- Runtime dependencies resolve.

### 19.2 High: no CI/CD pipeline is represented

There is no automated pipeline for:

- Clean dependency installation.
- Type checking.
- Production build.
- Tests.
- Linting.
- Security scanning.
- Migration validation.
- Deployment approval.
- Smoke tests.
- Rollback.

### 19.3 Critical: database deployment is manual and non-reproducible

The repository has no current Supabase migration chain. Important changes exist as manually named snippets, some of which are ignored by Git.

A frontend deployment can therefore be released independently of its required database contract with no automated compatibility check.

### 19.4 High: environment promotion is not represented

The browser client is tied to a single hardcoded hosted project. No staging-to-production promotion path is defined.

### 19.5 High: rollback is not represented

There is no documented rollback for:

- Frontend release.
- Database migration.
- RLS policy change.
- Grant change.
- Auth configuration change.

Database rollback is especially important because destructive schema and data mutations cannot always be reversed by redeploying frontend assets.

### 19.6 High: no post-deployment verification exists

There are no automated smoke tests for:

- Login.
- Tenant isolation.
- Dashboard loading.
- Internal appointment creation.
- Public booking.
- Charging.
- Finance visibility.
- Logout.

### 19.7 Medium: Node engine is not declared

Locked React Router and Supabase packages require Node 20 or newer, but `package.json` contains no engine declaration. The inspected environment used Node 24.15.0.

### 19.8 Medium: no release metadata or health endpoint exists

The static application exposes no visible build revision, release identifier, health endpoint, or environment marker for operational diagnosis.

---

## 20. Operational risks

### 20.1 High: no incident-response process

There is no represented process for:

- Detection.
- Triage.
- Containment.
- Customer communication.
- Recovery.
- Post-incident review.

### 20.2 High: no audit trail

The system cannot reliably answer:

- Who created or deleted an appointment.
- Who charged an appointment.
- Who created or changed a service.
- Who created an employee.
- Who changed a role.
- Which tenant context was used.

### 20.3 High: operational scripts use first-row selection

Local setup and seed scripts select the first tenant and first user without deterministic ordering. The scripts target localhost, but their logic is not safe as a production administration model.

### 20.4 High: live configuration is undocumented

Critical hosted state may exist only in the Supabase dashboard:

- Schema changes.
- Policies.
- Grants.
- Auth configuration.
- Backup settings.
- Compute tier.
- Rate limits.

The repository cannot currently reconstruct or audit that state.

### 20.5 Medium: generated CLI artifacts are tracked while critical SQL is ignored

Tracked `.temp`, branch, and pgdelta artifacts provide little operational control, while materially relevant production SQL and snippets are ignored.

### 20.6 Medium: no ownership map

No repository documentation identifies owners for:

- Application release.
- Database migration.
- Supabase Auth.
- Security policies.
- Customer support.
- Backups and restore.
- Incident response.

### 20.7 Medium: user-facing operational feedback is weak

Browser alerts and silent defaults do not provide durable incident references or reliable degraded-state communication.

---

## 21. Business risks

### 21.1 Critical: customer and tenant data exposure

Broad anonymous access combined with absent tenant RLS can expose:

- Staff emails.
- Appointments and customer names.
- Tenant identities.
- Revenue records.
- Service data.

For a multi-tenant paid product, cross-tenant disclosure is a direct trust, contractual, and potentially regulatory event.

### 21.2 Critical: credential compromise

Direct password filtering through the public data API is not a production-grade credential model. A compatible database implementation would create material breach risk.

### 21.3 Critical: booking failure or double booking

Public booking depends on missing schema fields and supplies an incomplete appointment payload. Even if hosted schema differences allow it to run, no availability or uniqueness control prevents concurrent duplicate bookings.

### 21.4 Critical: financial inconsistency

An appointment can become completed without a gain, and repeated operations can create ambiguous revenue. The finance page then treats all gain rows as charged services.

### 21.5 High: inaccurate dashboard reporting

- Database errors display as zero data.
- “Next appointment” can select an earlier same-day appointment.
- Daily boundaries mix UTC and local calculations.
- Status is shown statically.
- Rating is hardcoded.

### 21.6 High: administrator and barber capabilities are indistinguishable

The active product does not enforce the business distinction implied by its roles.

### 21.7 High: no customer contact channel

Public appointments capture only a name. The business has no represented way to confirm, remind, reschedule, or contact the customer.

### 21.8 High: hard deletion removes business history

Appointment deletion has no cancellation or audit record. This weakens dispute handling, reporting, and operational accountability.

### 21.9 High: no backup or recovery evidence

Loss or corruption of appointment and financial records could leave the business unable to restore service within any known objective.

### 21.10 Medium: incomplete SaaS commercial model

The repository contains no plans, subscription billing, trials, usage enforcement, tenant suspension, or platform administration. This does not prevent a manually managed pilot, but it does mean the codebase does not yet implement the commercial lifecycle implied by the product name.

---

## 22. Launch blockers

Every item in this section blocks a paying-customer production launch.

| ID | Severity | Blocker | Required evidence for closure |
|---|---|---|---|
| LB-01 | Critical | Active login bypasses Supabase Auth | Active route uses verified Auth session; no password field/query in application tables; login integration tests pass |
| LB-02 | Critical | Custom local session is accepted as identity | Route/session lifecycle derives from verified Auth; forged storage does not grant access |
| LB-03 | Critical | Anonymous/private table privileges are overly broad | Least-privilege grants exported in migrations; direct anon tests prove private operations denied |
| LB-04 | Critical | Tenant RLS is absent or disabled | RLS enabled on every exposed tenant table with tested `USING` and `WITH CHECK` policies |
| LB-05 | Critical | Cross-tenant relational consistency is unenforced | Schema constraints or transactional validation prevent mixed-tenant references; negative tests pass |
| LB-06 | Critical | No canonical database migration history | Clean database can be recreated deterministically and matches the application contract |
| LB-07 | Critical | Login, service, and public-booking schema contracts conflict | One schema contract is selected, migrated, typed, and verified in staging |
| LB-08 | Critical | Public booking omits required barber and depends on missing slug | End-to-end public booking passes against recreated schema with defined assignment and collision behavior |
| LB-09 | Critical | Appointment charging and gain creation are non-atomic | One idempotent transaction handles both records and links gain to appointment |
| LB-10 | High | Role authorization is not enforced | Role matrix is implemented in policies/server-side operations and tested |
| LB-11 | High | Logout and session synchronization are broken | Login, refresh, expiry, revocation, and logout integration tests pass |
| LB-12 | High | No backup/restore proof | Backup configuration documented and a successful timed restore exercise completed |
| LB-13 | High | No monitoring or incident alerting | Production dashboards, alerts, ownership, and test incidents are documented |
| LB-14 | High | No deploy/migration/rollback pipeline | CI/CD validates app and schema, deploys by environment, runs smoke tests, and supports rollback |
| LB-15 | High | No production error model | Failures are observable, distinguishable from empty data, and correlated in logs |
| LB-16 | High | No load or concurrency validation | Representative load, RLS, booking-race, and charge-concurrency tests meet documented thresholds |

---

## 23. Prioritized action plan

### 23.1 Phase 0 — Critical security and data correctness

These actions are prerequisites for handling any real customer data.

### P0-01 Establish one canonical schema and migration chain

**Addresses:** LB-06, LB-07

Actions:

1. Export and review the actual hosted schema without customer data.
2. Select one service ID type and one naming model.
3. Define required fields for `barberias`, `usuarios`, `servicios`, `citas`, and `ganancias`.
4. Encode all tables, constraints, indexes, functions, grants, and policies in versioned migrations.
5. Remove operational dependence on manually named or ignored SQL snippets.
6. Recreate an empty environment solely from migrations.
7. Generate Supabase database types from that schema.
8. Run application contract tests against the recreated database.

Acceptance criteria:

- Empty-database migration succeeds.
- Repeated environment creation is deterministic.
- Staging schema diff is empty after migration.
- Frontend field names and types compile against generated types.

### P0-02 Replace the active credential lookup with authoritative authentication

**Addresses:** LB-01, LB-02, LB-11

Actions:

1. Use Supabase Auth for the active login path.
2. Remove application-table password storage and password filters.
3. Drive application session state from Auth session events.
4. Load tenant membership and role using the authenticated UUID.
5. Define behavior for missing, disabled, or inconsistent profiles.
6. Implement complete sign-out and session-expiry handling.
7. Prevent a custom storage object from establishing identity.

Acceptance criteria:

- Login yields a valid Auth session.
- Refresh preserves the correct authenticated identity.
- Forged or altered tenant storage grants no access.
- Logout terminates Auth state and returns to a stable login screen.
- Expired/revoked sessions lose private access.

### P0-03 Define and enforce the authorization matrix

**Addresses:** LB-10

Actions:

1. Define capabilities for anonymous customers, barbers, tenant administrators, and trusted platform operators.
2. Decide which roles can read finances, delete appointments, manage services, and manage employees.
3. Encode the matrix in RLS and trusted server-side operations.
4. Remove reliance on route visibility as authorization.
5. Add positive and negative permission tests.

Acceptance criteria:

- Every table operation has an owning role rule.
- Unauthorized direct API calls fail.
- Barber and admin behavior matches the documented matrix.

### P0-04 Implement least-privilege grants and tenant RLS

**Addresses:** LB-03, LB-04

Actions:

1. Revoke broad anonymous and authenticated grants not required by the product.
2. Enable RLS on all exposed tenant tables.
3. Add `USING` policies for reads/updates/deletes.
4. Add `WITH CHECK` policies for inserts/updates.
5. Resolve tenant membership through `auth.uid()` and database-controlled profile data.
6. Limit public booking to the exact public read/insert surface.
7. Index every RLS predicate column.
8. Test policies through anon and authenticated PostgREST clients.

Acceptance criteria:

- Anonymous requests cannot access private tables.
- Tenant A cannot access tenant B through any CRUD operation.
- A caller cannot insert or update a row into another tenant by changing payload IDs.
- Policy tests run automatically in CI.

### P0-05 Enforce tenant-consistent relationships

**Addresses:** LB-05

Actions:

1. Define tenant-aware relationships for appointments, barbers, services, and gains.
2. Enforce that referenced users and services belong to the row tenant.
3. Enforce that gains and appointments share the same tenant.
4. Define whether appointment assignment requires the `barbero` role.
5. Add indexes for referencing foreign-key columns.
6. Add migration validation against existing data before enforcing constraints.

Acceptance criteria:

- Cross-tenant reference inserts fail at the database boundary.
- Cascades and joins use appropriate indexes.
- Existing data passes integrity audits.

### P0-06 Make charging transactional and idempotent

**Addresses:** LB-09

Actions:

1. Define the appointment/payment state transition.
2. Execute appointment update and gain creation in one short database transaction or RPC.
3. Lock or conditionally update the appointment from its allowed source state.
4. Populate `ganancias.cita_id`.
5. Define whether one or multiple gains per appointment are valid.
6. Add an idempotency or uniqueness rule consistent with that decision.
7. Test retry and concurrent-charge behavior.

Acceptance criteria:

- Partial completion cannot occur.
- Identical retries do not duplicate revenue.
- Concurrent attempts produce one valid business outcome.
- Gain and appointment are traceably linked.

### P0-07 Reconcile and validate public booking

**Addresses:** LB-08

Actions:

1. Add and constrain the tenant slug in the canonical schema.
2. Define public-safe barber-shop fields.
3. Define how a public booking receives a barber assignment.
4. Define slot collision behavior using database enforcement.
5. Ensure service ownership matches the selected tenant.
6. Normalize appointment states.
7. Add public request validation and abuse controls.
8. Test booking through the anon role against the final RLS policies.

Acceptance criteria:

- Tenant lookup succeeds by a unique slug.
- Public service discovery returns only the tenant’s bookable services.
- Booking produces a complete, valid appointment.
- Concurrent duplicate-slot attempts have a deterministic outcome.
- Anonymous users cannot list private appointments.

### 23.2 Phase 1 — High operational readiness

### P1-01 Establish environment separation and configuration validation

Actions:

1. Consume Vite environment variables rather than source constants.
2. Define separate Supabase projects or isolated environments for development, test, preview, staging, and production.
3. Add an environment-variable contract and startup/build validation.
4. Prevent preview deployments from targeting production by default.
5. Document public versus confidential variables.

Acceptance criteria:

- Each deployment identifies and validates its environment.
- Preview/staging cannot mutate production data.
- Missing or invalid variables fail the build or startup clearly.

### P1-02 Establish secrets governance

Actions:

1. Store confidential values in managed secret stores.
2. Keep service-role credentials in trusted server-side environments only.
3. Add repository and CI secret scanning.
4. Define access, rotation, revocation, and audit procedures.
5. Verify built assets contain no confidential credentials.

### P1-03 Build CI/CD and database release gates

Actions:

1. Run clean dependency installation.
2. Run TypeScript, linting, tests, and production build.
3. Create an ephemeral database from migrations.
4. Run schema, RLS, and integration tests.
5. Run dependency and secret scans.
6. Promote through staging before production.
7. Apply migrations through a controlled release step.
8. Run post-deployment smoke tests.
9. Define frontend and database rollback behavior.

### P1-04 Implement structured error handling and logging

Actions:

1. Define shared typed request errors.
2. Stop converting query failures into zero business data.
3. Add a React error boundary.
4. Add structured, redacted logging with actor, tenant, operation, and correlation ID.
5. Add audit events for destructive, financial, role, and employee operations.
6. Remove credential/session debug logging.

### P1-05 Implement monitoring and alerting

Actions:

1. Add frontend exception and release monitoring.
2. Add synthetic login, dashboard, public-booking, and charging checks.
3. Monitor PostgREST/database error rates and latency.
4. Use `pg_stat_statements` to identify expensive and frequent queries.
5. Monitor connection usage, storage growth, locks, and autovacuum.
6. Define alert thresholds, owners, and escalation routes.
7. Monitor business invariants such as completed appointments without gains.

### P1-06 Establish backups and disaster recovery

Actions:

1. Verify the production Supabase backup and PITR configuration.
2. Define retention, encryption, and access policies.
3. Define business-approved RPO and RTO.
4. Document restoration and migration rollback runbooks.
5. Restore into an isolated environment.
6. Run tenant isolation and application smoke tests on restored data.
7. Record restore duration and last successful exercise.
8. Configure backup-failure alerts.

### P1-07 Validate performance and concurrency

Actions:

1. Seed realistic tenant-size distributions.
2. Capture `EXPLAIN (ANALYZE, BUFFERS)` for critical queries under RLS.
3. Add indexes based on verified plans.
4. Add cursor/keyset pagination to growing lists.
5. Load-test public booking and dashboard reads.
6. Concurrency-test appointment collision and charging.
7. Establish latency and error-rate budgets.
8. Inspect hosted connection and compute limits.

### 23.3 Phase 2 — Medium maintainability, scale, and trust

### P2-01 Complete type safety

- Generate Supabase database types.
- Type every query and mutation.
- Remove `any` and double casts from domain data.
- Bring `.jsx` business views under TypeScript or enable appropriate checking.
- Define one shared authenticated session/profile type.

### P2-02 Establish consistent data-access boundaries

- Place all table access behind a consistent module boundary.
- Standardize error behavior.
- Separate UI state from business transaction orchestration.
- Remove direct private-table queries from route components.

### P2-03 Add pagination and scalable reporting

- Paginate Agenda and finance history.
- Define stable sort keys and cursors.
- Move aggregate reporting to database queries or controlled RPCs where appropriate.
- Validate tenant/date indexes with actual plans.

### P2-04 Complete operational business workflows

- Define cancellation versus deletion.
- Preserve appointment history and acting-user attribution.
- Define service active/inactive lifecycle.
- Define employee invitation, activation, suspension, and removal.
- Define customer contact and confirmation requirements.

### P2-05 Address accessibility and responsive navigation

- Ensure keyboard-operable selectors and calendars.
- Add accessible labels to icon-only actions.
- Provide functional mobile route navigation.
- Add accessibility tests for login, booking, and dashboard workflows.

### P2-06 Reduce duplicated and inactive code

- Consolidate duplicate calendar/time-slot logic.
- Consolidate navigation metadata.
- Remove or activate unused services and components.
- Remove debug-only state and imports.
- Resolve competing styling systems.

### 23.4 Phase 3 — Low-priority hygiene and polish

- Eliminate duplicate font loading.
- Align global heading styles with component typography.
- Remove duplicate `.gitignore` rules.
- Stop tracking generated Supabase CLI temp artifacts.
- Add release metadata visible to operators.
- Add a complete README and operational ownership map.
- Document domain terminology and business metric definitions.

---

## 24. Production acceptance checklist

The launch decision remains **NO-GO** until every Critical item and required High launch control is checked with evidence.

### 24.1 Identity and access

- [ ] Active login uses verified Supabase Auth.
- [ ] No application table stores or queries passwords.
- [ ] Session restoration validates Auth state.
- [ ] Logout terminates all application and Auth state.
- [ ] Role and tenant membership are database-controlled.
- [ ] Anonymous, barber, admin, and operator capabilities are documented.
- [ ] Automated authorization tests cover allowed and denied operations.

### 24.2 Tenant isolation and RLS

- [ ] RLS is enabled on every exposed tenant table.
- [ ] `USING` and `WITH CHECK` policies cover each operation.
- [ ] Anonymous privileges are limited to the public booking surface.
- [ ] Tenant A cannot access tenant B through direct API calls.
- [ ] Browser-modified tenant IDs do not change accessible data.
- [ ] Policy predicate columns are indexed.
- [ ] Cross-tenant foreign-key combinations fail.

### 24.3 Database correctness

- [ ] One migration chain recreates the database from empty state.
- [ ] Live schema matches the versioned schema.
- [ ] Service IDs, names, and tenant fields have one canonical model.
- [ ] Unique tenant slug exists.
- [ ] Appointment state values are constrained and normalized.
- [ ] Booking collision behavior is enforced by the database.
- [ ] Charging is transactional and idempotent.
- [ ] Gains link to appointments according to the defined payment model.
- [ ] Foreign-key and common query indexes are validated.

### 24.4 Public booking

- [ ] Tenant resolves by slug.
- [ ] Only public-safe tenant fields are readable anonymously.
- [ ] Only the tenant’s active services are visible.
- [ ] Barber assignment is defined and valid.
- [ ] Duplicate/concurrent booking behavior is tested.
- [ ] Abuse controls are active.
- [ ] Public users cannot read private appointment data.

### 24.5 Environment and secrets

- [ ] Development, preview, staging, and production are isolated.
- [ ] Required environment variables are validated.
- [ ] No preview build points to production by default.
- [ ] Service-role credentials exist only in trusted server-side systems.
- [ ] Secret scanning and rotation procedures are active.
- [ ] Production bundle inspection finds no confidential credentials.

### 24.6 Reliability and operations

- [ ] Structured logging is active and redacted.
- [ ] Security and financial audit events are recorded.
- [ ] Frontend and database monitoring are active.
- [ ] Alerts have owners and escalation paths.
- [ ] Backup retention and PITR are verified.
- [ ] A successful restore drill is documented.
- [ ] RPO and RTO are approved.
- [ ] Incident and rollback runbooks are tested.

### 24.7 Performance and scalability

- [ ] Critical queries have reviewed query plans under RLS.
- [ ] Growing lists use pagination.
- [ ] Compound and foreign-key indexes are validated.
- [ ] Booking concurrency tests pass.
- [ ] Charging concurrency and retry tests pass.
- [ ] Load tests meet defined latency and error budgets.
- [ ] Hosted database connection and compute capacity are monitored.

### 24.8 Release process

- [ ] CI runs type checks, linting, tests, build, and security scans.
- [ ] CI creates and validates an ephemeral migrated database.
- [ ] Staging smoke tests cover all critical workflows.
- [ ] Production deployment is approval-gated.
- [ ] Frontend and database rollback paths are tested.
- [ ] Release health and revision are observable.

---

## 25. Final readiness decision

**Current decision: NO-GO for paying-customer production use.**

The system’s current repository-visible architecture does not provide an authoritative identity, enforced authorization, proven tenant isolation, reproducible database schema, or atomic financial workflow. These are foundational controls rather than post-launch enhancements.

The static frontend and basic operational workflows provide a workable development foundation. Production readiness begins when authentication, RLS, database contracts, and transactional integrity are rebuilt as verifiable server-enforced guarantees, followed by backup, monitoring, deployment, and recovery controls with documented evidence.

This assessment must be revisited after Phase 0 and Phase 1 controls are implemented and validated against an environment created from the canonical migration chain.
