# BarberSaaS Architecture Review

## Document status

| Field | Value |
|---|---|
| Purpose | Record the current technical architecture and repository behavior for future maintainers |
| Scope | All first-party application source, configuration, SQL, Supabase artifacts, and operational scripts present in the repository |
| Perspective | As-is review; observations and conclusions only |
| Application code changes | None |
| Live infrastructure access | None; the hosted Supabase project was not queried |

This document describes the repository as it exists. Generated dependency and build-output contents under `node_modules` and `dist` are not treated as application source. The ignored production-schema snapshot and ignored SQL snippets are included because they materially affect the inferred database architecture.

## Table of contents

1. [Executive assessment](#1-executive-assessment)
2. [Repository overview](#2-repository-overview)
3. [Overall architecture](#3-overall-architecture)
4. [Technology stack, build, and deployment](#4-technology-stack-build-and-deployment)
5. [Folder structure](#5-folder-structure)
6. [React application lifecycle](#6-react-application-lifecycle)
7. [Routing](#7-routing)
8. [Feature-level application flows](#8-feature-level-application-flows)
9. [State management](#9-state-management)
10. [Supabase integration](#10-supabase-integration)
11. [Authentication and session flow](#11-authentication-and-session-flow)
12. [Multi-tenant implementation](#12-multi-tenant-implementation)
13. [Database model](#13-database-model)
14. [Database interaction patterns](#14-database-interaction-patterns)
15. [RLS, privileges, and security boundary](#15-rls-privileges-and-security-boundary)
16. [Schema and migration drift](#16-schema-and-migration-drift)
17. [Architectural issues](#17-architectural-issues)
18. [Code-quality observations](#18-code-quality-observations)
19. [Testing, automation, and documentation](#19-testing-automation-and-documentation)
20. [Verification results](#20-verification-results)
21. [Current architectural baseline](#21-current-architectural-baseline)

---

## 1. Executive assessment

BarberSaaS is a single-package, client-rendered React application built with Vite and deployed as a static single-page application. The browser communicates directly with Supabase through `@supabase/supabase-js`; there is no custom backend, API server, Supabase Edge Function layer, or server-side application authorization component.

Its primary functions are:

- Barber-shop dashboarding.
- Appointment management.
- Service-catalog management.
- Revenue tracking.
- Public appointment booking through a tenant slug.

The intended tenant model is shared-schema multi-tenancy:

- Each barber shop is represented by a `barberias` row.
- Users belong to one barber shop through `barberia_id`.
- Appointments, gains, and the intended service records carry the same tenant discriminator.

The main architectural conclusions are:

1. The active login screen does not use Supabase Auth. It queries `public.usuarios` directly using email and password.
2. A custom `tenant_session` object in `localStorage` is treated as authentication and as the source of tenant identity.
3. On a clean browser, the active login does not create a Supabase JWT, so subsequent PostgREST calls continue under the `anon` role.
4. Tenant filtering is implemented mainly in browser queries. The repository does not represent active tenant-isolating Row Level Security.
5. The SQL artifacts do not describe one reproducible database state. Core tables and columns have incompatible definitions across the base schema, numbered migration, manual snippets, and production snapshot.
6. Several active application flows depend on columns or constraints absent from all available schema definitions.
7. Authentication state is duplicated between `App`, `Dashboard`, `localStorage`, and the Supabase client.
8. Multi-step operations such as charging an appointment and provisioning an employee are not transactional.
9. The codebase is small and traceable, and the typed UI primitive layer is reasonably cohesive, but the most complex route views are unchecked JavaScript and contain duplicated business and UI logic.
10. TypeScript checking and an in-memory Vite production build both succeed, but those checks do not validate the live Supabase schema or most `.jsx` business logic.

---

## 2. Repository overview

The repository is a single private npm package rather than a monorepo. Its identity is declared in [`package.json`](../package.json).

Approximate application-source composition:

| File type | File count | Approximate lines |
|---|---:|---:|
| `.tsx` | 19 | 1,150 |
| `.ts` | 9 | 356 |
| `.jsx` | 6 | 971 |
| CSS | 1 | 81 |

There are approximately 35 source files under `src`.

The repository contains:

- React application source.
- Reusable UI primitives.
- Supabase query wrappers.
- SQL schema and manually executed snippets.
- Local Supabase setup and seeding scripts.
- Static deployment configuration.
- Generated or ignored operational artifacts.

The repository does not contain:

- A server application.
- API route handlers.
- Supabase Edge Functions.
- A billing or subscription subsystem.
- A tenant-administration control plane.
- A generated Supabase database type file.
- A test suite.
- Continuous integration configuration.
- A README or pre-existing architecture guide.

---

## 3. Overall architecture

### 3.1 Runtime topology

```text
Vercel static hosting
        │
        ▼
    index.html
        │
        ▼
 ReactDOM.createRoot
        │
        ▼
 React.StrictMode
        │
        ▼
  BrowserRouter
        │
        ▼
       App
   ┌────┴─────────────┐
   │                  │
Public booking    Protected-looking
  route           dashboard routes
   │                  │
Direct Supabase    Views and service
queries             wrappers
   └────────┬─────────┘
            │
            ▼
  Supabase browser client
            │
            ├─ Supabase Auth APIs
            │  (present in unused services)
            │
            └─ PostgREST Data API
                       │
                       ▼
                    PostgreSQL
```

The main bootstrap path is:

1. [`index.html`](../index.html) provides the React root element.
2. [`src/main.tsx`](../src/main.tsx) mounts the application.
3. `BrowserRouter` wraps [`src/App.tsx`](../src/App.tsx).
4. `App` reconstructs a custom session from browser storage.
5. Route views load and mutate Supabase data directly from the browser.

### 3.2 Architectural style

The project uses a thin-client/BaaS architecture:

- React supplies routing, rendering, forms, and client state.
- Supabase supplies the hosted database, Auth APIs, and PostgREST interface.
- There is no intermediary application server.
- Business operations are generally coordinated inside React components or browser-side service functions.
- Database permissions and RLS are therefore the only possible authoritative server-side security boundary.

### 3.3 Functional scope

The represented domain is an operational barbershop application:

- Tenant/barber-shop records.
- Employees and roles.
- Appointments.
- Service catalogue.
- Revenue records.
- Public booking.

Although the project is named BarberSaaS, the repository does not contain code for:

- Plans.
- Subscription billing.
- Trial periods.
- Usage limits.
- Tenant lifecycle administration.
- Cross-tenant platform administration.
- SaaS analytics or metering.

---

## 4. Technology stack, build, and deployment

### 4.1 Runtime dependencies

The main dependencies are declared in [`package.json`](../package.json).

| Dependency | Purpose | Installed version |
|---|---|---:|
| React | UI runtime | 18.3.1 |
| React DOM | DOM rendering | 18.3.1 |
| React Router DOM | Client routing | 7.18.1 |
| Supabase JS | Auth and database API client | 2.108.2 |
| Framer Motion | Page and navigation animations | 12.42.2 |
| Lucide React | Icons | 1.23.0 |
| `clsx` | Conditional class composition | 2.1.1 |
| `tailwind-merge` | Tailwind class conflict resolution | 3.6.0 |

Development tooling includes:

- Vite 4.5.14.
- TypeScript 5.9.3.
- Tailwind CSS 3.4.19.
- PostCSS.
- Autoprefixer.
- React type definitions.

The locked React Router and Supabase packages require Node.js 20 or newer. The package itself does not declare an `engines` requirement. The inspected environment used Node.js 24.15.0.

### 4.2 npm scripts

Only three npm scripts exist:

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

The setup, seed, and database-inspection scripts are not exposed through npm scripts and are executed directly with Node.

### 4.3 TypeScript configuration

[`tsconfig.json`](../tsconfig.json) enables:

- Strict TypeScript checking.
- `noUnusedLocals`.
- `noUnusedParameters`.
- `noFallthroughCasesInSwitch`.
- Bundler-style module resolution.
- `noEmit`.
- React JSX transformation.

JavaScript is allowed through `allowJs`, but `checkJs` is not enabled. Consequently:

- `.ts` and `.tsx` files receive strict checking.
- The complex `.jsx` route components are compiled but do not receive equivalent semantic checking.
- Unused imports and unsafe data access inside `.jsx` files are not reported by TypeScript.

### 4.4 Vite and Vercel

Vite configuration is minimal and only enables the React plugin: [`vite.config.ts`](../vite.config.ts).

Vercel rewrites every route to `index.html`, allowing browser-history URLs such as `/dashboard/agenda` to load directly: [`vercel.json`](../vercel.json).

### 4.5 Styling

Styling uses:

- Tailwind utility classes.
- Custom theme tokens in [`tailwind.config.js`](../tailwind.config.js).
- Global styles in [`src/styles/index.css`](../src/styles/index.css).
- Reusable class merging through [`src/lib/cn.ts`](../src/lib/cn.ts).

Two styling directions coexist:

- Neutral, token-based “premium” styling in the Tailwind theme and some reusable components.
- Hard-coded slate, amber, emerald, and heavy-border “brutalist” styling in active pages and the Navbar.

Fonts are loaded twice:

- Through `<link>` elements in [`index.html`](../index.html).
- Through a CSS `@import` in [`src/styles/index.css`](../src/styles/index.css).

The Tailwind theme includes Playfair Display as a serif family, and `PageHeader` applies `font-serif`, but the global heading rule forces all headings to the sans-serif family with `!important`.

---

## 5. Folder structure

```text
BarberSaaS/
├─ .env
├─ .gitignore
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
├─ vite-env.d.ts
├─ tailwind.config.js
├─ postcss.config.js
├─ vercel.json
├─ index.html
│
├─ public/
│  └─ favicon.png
│
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  │
│  ├─ config/
│  │  └─ supabaseClient.ts
│  │
│  ├─ views/
│  │  ├─ Login.tsx
│  │  ├─ Dashboard.jsx
│  │  ├─ DashboardHome.jsx
│  │  ├─ Agenda.jsx
│  │  ├─ Servicios.jsx
│  │  ├─ Finanzas.jsx
│  │  └─ PublicLandingPage.tsx
│  │
│  ├─ services/
│  │  ├─ login.ts
│  │  ├─ registerEmployee.ts
│  │  ├─ dashboard.ts
│  │  ├─ finances.ts
│  │  └─ services.ts
│  │
│  ├─ appointments/
│  │  └─ getAppointments.ts
│  │
│  ├─ components/
│  │  ├─ HistorialCaja.jsx
│  │  ├─ layout/
│  │  │  ├─ Navbar.tsx
│  │  │  ├─ Sidebar.tsx
│  │  │  ├─ PageTransition.tsx
│  │  │  └─ PlaceholderView.tsx
│  │  └─ ui/
│  │     ├─ Badge.tsx
│  │     ├─ Button.tsx
│  │     ├─ Card.tsx
│  │     ├─ EmptyState.tsx
│  │     ├─ Input.tsx
│  │     ├─ Loading.tsx
│  │     ├─ PageHeader.tsx
│  │     ├─ SectionTitle.tsx
│  │     ├─ Skeleton.tsx
│  │     ├─ StatCard.tsx
│  │     ├─ Table.tsx
│  │     └─ index.ts
│  │
│  ├─ lib/
│  │  └─ cn.ts
│  │
│  └─ styles/
│     └─ index.css
│
├─ db/
│  ├─ schema.sql
│  └─ migrations/
│     └─ 001_servicios.sql
│
├─ supabase/
│  ├─ snippets/
│  ├─ .branches/
│  └─ .temp/
│
├─ supabase_old/
│  ├─ config.toml
│  ├─ snippets/
│  ├─ .branches/
│  └─ .temp/
│
├─ estructura_produccion.sql
├─ check-tables.mjs
├─ setup-data.mjs
└─ seed-dashboard.mjs
```

### 5.1 Source folder responsibilities

| Folder | Responsibility |
|---|---|
| `src/views` | Route-level screens and most feature orchestration |
| `src/components/layout` | Navigation and route-layout presentation |
| `src/components/ui` | Typed reusable UI primitives |
| `src/services` | Partial Supabase data-access layer |
| `src/appointments` | Appointment data access, functionally another service module |
| `src/config` | Supabase singleton |
| `src/lib` | Tailwind class helper |
| `src/styles` | Global CSS and Tailwind layers |
| `db` | Base schema and one numbered migration |
| `supabase` | Current manual SQL snippets and CLI metadata |
| `supabase_old` | Historical local Supabase configuration and snippets |

### 5.2 Unused or incomplete files

Repository-wide symbol inspection found the following inactive code:

- [`src/components/layout/Sidebar.tsx`](../src/components/layout/Sidebar.tsx) has no consumer.
- [`src/components/layout/PlaceholderView.tsx`](../src/components/layout/PlaceholderView.tsx) has no consumer.
- `PlaceholderView` declares an `icon` prop but does not render it.
- [`src/components/ui/Loading.tsx`](../src/components/ui/Loading.tsx) has no active consumer.
- `TableSkeleton` is exported but unused.
- [`src/services/login.ts`](../src/services/login.ts) is unused.
- [`src/services/registerEmployee.ts`](../src/services/registerEmployee.ts) is unused.
- [`src/components/HistorialCaja.jsx`](../src/components/HistorialCaja.jsx) is empty.
- The active Navbar and inactive Sidebar duplicate the same route registry.

---

## 6. React application lifecycle

### 6.1 Bootstrap

[`src/main.tsx`](../src/main.tsx) creates the root and renders:

```text
React.StrictMode
└─ BrowserRouter
   └─ App
```

Because Strict Mode is active, mount effects can execute twice during development. The relevant mount effects perform reads rather than direct mutations.

### 6.2 Initial session restoration

`App` owns:

- `usuario`.
- A temporary `loading` flag.

On mount, it reads `tenant_session` from `localStorage` in [`src/App.tsx`](../src/App.tsx).

Behavior:

1. If the item exists, it is parsed.
2. The parsed object is accepted as the current user.
3. Malformed JSON is removed.
4. The loading flag is cleared.
5. Routes are rendered only after this bootstrap finishes.

No Supabase session or token is checked during this process.

### 6.3 Route rendering

After session restoration:

- A truthy `usuario` opens the dashboard route.
- A falsy `usuario` opens the login route.
- The public `/b/:slug` route is available independently of session state.

### 6.4 Dashboard shell

[`src/views/Dashboard.jsx`](../src/views/Dashboard.jsx) creates a second session state.

It:

1. Reads `tenant_session` again.
2. Redirects to login if storage is empty.
3. Stores the parsed session in its own local state.
4. Renders the Navbar and nested `<Outlet>` when that state is populated.

This duplicates the session state already owned by `App`.

### 6.5 Child route data loading

Dashboard children obtain identity inconsistently:

- `DashboardHome` receives `usuario` from `App`.
- `Agenda` reads `tenant_session` itself.
- `Servicios` reads `tenant_session` itself.
- `Finanzas` reads `tenant_session` itself.

Only `App` protects JSON parsing with `try/catch`. Other views parse storage directly.

### 6.6 Code loading

All route views are statically imported in [`src/App.tsx`](../src/App.tsx). The initial application bundle therefore includes Dashboard, Agenda, Services, Finance, Public Booking, and Login. There is no route-level lazy loading.

---

## 7. Routing

Routes are defined in [`src/App.tsx`](../src/App.tsx).

| URL | Access condition | Rendered component | Notes |
|---|---|---|---|
| `/b/:slug` | Always public | `PublicLandingPage` | Tenant resolved through database slug |
| `/login` | `usuario` must be falsy | `Login` | Truthy session redirects to dashboard |
| `/dashboard` | `usuario` must be truthy | `Dashboard` + `DashboardHome` | Nested index route |
| `/dashboard/agenda` | Inherits dashboard guard | `Agenda` | Appointment management |
| `/dashboard/servicios` | Inherits dashboard guard | `Servicios` | Service catalogue |
| `/dashboard/finanzas` | Inherits dashboard guard | `Finanzas` | Revenue history |
| `*` | Always matched as fallback | Redirect | Destination depends on `usuario` |

### 7.1 Route authorization

The route guard is a truthiness check against a local object. It does not verify:

- A Supabase Auth token.
- Session expiry.
- User existence.
- Tenant existence.
- Role.
- Database membership.

No routes distinguish between `admin` and `barbero`.

### 7.2 Navigation

The active [`src/components/layout/Navbar.tsx`](../src/components/layout/Navbar.tsx) links to all dashboard routes.

Active state uses:

- Exact matching for `/dashboard`.
- Prefix matching for nested routes.

The Navbar hides navigation links below the `md` breakpoint. The inactive Sidebar contains a mobile-compatible route list but is not rendered. On smaller screens, the active dashboard layout exposes the logout control but not the main route links.

There is no dedicated not-found screen. Unknown URLs redirect to login or dashboard.

---

## 8. Feature-level application flows

### 8.1 Login

The active login screen is [`src/views/Login.tsx`](../src/views/Login.tsx).

Runtime flow:

```text
User submits email and password
        │
        ▼
SELECT * FROM usuarios
WHERE email = submitted email
AND password = submitted password
        │
        ▼
Construct { id, email, barberia_id, rol }
        │
        ├─ Store as tenant_session
        ├─ Update App.usuario
        └─ Navigate to /dashboard
```

Important behavior:

- It does not call `supabase.auth.signInWithPassword`.
- It performs direct equality against the submitted password.
- No hashing or password-verification function appears.
- It uses `select('*')`.
- The repository schemas do not contain the queried `password` column.
- Failed queries and absent rows both appear as “Credenciales incorrectas.”

### 8.2 Dashboard home

[`src/views/DashboardHome.jsx`](../src/views/DashboardHome.jsx) receives the current user as a prop.

It sequentially calls:

1. `getDashboardStats`.
2. `getUpcomingAppointments`.

The dashboard displays:

- Revenue for the current day.
- Number of appointments for the current day.
- A hard-coded rating of `4.8`.
- The time of the first returned appointment.
- Up to five upcoming appointments.

Observed details:

- The appointment query filters only by `fecha >= hoy`; an earlier appointment on the current date can still become the displayed “next” appointment.
- The count includes all appointments for the day regardless of status.
- The visible appointment status is always rendered as “Pendiente,” rather than using the record’s state.
- Dashboard service errors are logged and converted to zero or empty data, making a failed query visually resemble an empty tenant.
- If `usuario.barberia_id` is absent, the data effect returns without clearing `loadingData`.
- `TenantBadge` expects a string and calls `substring`; a missing tenant ID can cause a rendering failure.

### 8.3 Agenda

[`src/views/Agenda.jsx`](../src/views/Agenda.jsx) is the largest component at approximately 504 lines.

It owns:

- Appointment list state.
- Service list state.
- Loading and mutation flags.
- Customer, service, date, and time fields.
- Custom service dropdown state.
- Custom calendar state.
- Custom time-dropdown state.
- Calendar navigation helpers.
- Charge and delete confirmation workflows.

Initial loading uses `Promise.all` to retrieve appointments and services concurrently.

#### Appointment creation

The form:

1. Validates that all fields are present.
2. Reads the custom session again.
3. Uses `sesion.barbero_id` or falls back to `sesion.id`.
4. Uses `sesion.barberia_id`.
5. Inserts the appointment.
6. Refetches the complete appointment list.

The appointment service adds lowercase `estado: 'pendiente'` in [`src/appointments/getAppointments.ts`](../src/appointments/getAppointments.ts).

The UI catches PostgreSQL unique-violation errors for duplicate schedules, although no matching unique constraint appears in the SQL artifacts.

#### Scheduling behavior

- Time slots are generated from 08:00 through 20:00.
- Slots occur every 30 minutes.
- Service duration is displayed but not used to determine availability or slot length.
- Availability is not queried before presenting or submitting a slot.
- Past dates and earlier current-day times are not disabled.

#### Charging

Charging:

1. Reads the service price.
2. Asks for confirmation.
3. Updates the appointment state to `completada`.
4. Inserts a gain.
5. Refetches appointments.

The two writes are separate PostgREST requests.

The gain payload contains:

- Amount.
- Barber ID.
- Tenant ID.
- Concept.

It does not include the appointment’s `cita_id`, despite the database model containing that relationship.

The appointment update filters only by appointment ID, not by tenant ID.

#### Deletion

Deletion filters by appointment ID and tenant ID. After successful deletion, the component removes the row locally instead of refetching.

#### Unused state and imports

`fallbackIds` is initialized and updated but never read. Several imported UI primitives are unused because the component renders equivalent raw elements.

### 8.4 Servicios

[`src/views/Servicios.jsx`](../src/views/Servicios.jsx) reads the tenant from `localStorage`.

It:

- Fetches tenant services.
- Displays service cards.
- Opens a service-creation form.
- Inserts a service with `nombre`, `precio`, `duracion`, and `barberia_id`.
- Prepends the returned row to local state.

Observed runtime behavior:

- If no tenant ID exists, `fetchServicios` returns before clearing the initial loading flag.
- Successful creation never resets `saving` to `false`; the submit button remains disabled and displays its loading state.
- `saving` is reset only in the error branch.
- The visible edit and delete buttons do not have event handlers.
- The service description is static presentation text rather than database data.

The frontend service contract is defined in [`src/services/services.ts`](../src/services/services.ts).

### 8.5 Finanzas

[`src/views/Finanzas.jsx`](../src/views/Finanzas.jsx) reads the tenant from `localStorage` and fetches all matching `ganancias` rows.

It computes in the browser:

- Total revenue.
- Number of gain records.

Observed details:

- There is no pagination.
- There is no explicit ordering.
- Errors are logged but not represented in the UI as distinct from empty data.
- The number of records is labelled “Servicios Cobrados,” although the schema also allows gains not associated with appointments.

### 8.6 Public booking

[`src/views/PublicLandingPage.tsx`](../src/views/PublicLandingPage.tsx) is available without a custom application session.

Flow:

1. Read `slug` from `/b/:slug`.
2. Query `barberias` by `slug`.
3. Query `servicios` by the returned `barberia.id`.
4. Present customer, service, date, and time fields.
5. Insert a row into `citas`.
6. Show a success message.

The payload contains:

- Customer name.
- Service ID.
- Date.
- Time.
- Tenant ID.
- `estado: 'Pendiente'`.

It omits `barbero_id`, even though the available schema definitions declare that column `NOT NULL`.

Additional observations:

- `barberias.slug` is not defined in any available schema.
- The public service query assumes `servicios.barberia_id`, which is absent from the production snapshot’s services table.
- Status capitalization differs from the internal lowercase `pendiente`.
- No barber is selected.
- No customer email or phone is collected.
- No availability query occurs.
- The same calendar and time-slot implementation used by Agenda is duplicated here.
- Public booking depends on anonymous read and insert privileges.

---

## 9. State management

The project has no Redux, Zustand, React Context application store, reducer-based state architecture, server-state cache, query invalidation library, or realtime subscription state.

State is distributed among:

| State owner | Data |
|---|---|
| `App` | `usuario`, initial loading |
| `localStorage` | Custom `tenant_session` |
| `Dashboard` | A second session object |
| `DashboardHome` | Statistics, appointments, loading |
| `Agenda` | Appointments, services, forms, calendar, dropdowns, mutation flags |
| `Servicios` | Services, form state, loading, saving |
| `Finanzas` | Gains and loading |
| `PublicLandingPage` | Tenant, services, booking form, calendar, success/error state |
| Supabase client | Optional persisted Supabase Auth session |

### 9.1 Session state duplication

The same session is represented independently by:

1. `App.usuario`.
2. `Dashboard.session`.
3. `localStorage.tenant_session`.
4. Potential Supabase Auth storage.

These states are not synchronized through one authoritative lifecycle.

### 9.2 Server-state synchronization

Mutation behavior varies by page:

- Agenda refetches after create and charge.
- Agenda updates local state after delete.
- Servicios prepends the confirmed inserted record.
- Other pages load only on mount.
- No query cache coordinates data across routes.
- No realtime channel updates other browser sessions.

### 9.3 Error state

Error handling is inconsistent:

- Some service functions throw.
- Dashboard services log and return default values.
- Auth helper services catch and return `null` or `false`.
- Views use `alert`.
- Views use `console.error`.
- There is no shared error representation.
- There is no React error boundary.

---

## 10. Supabase integration

### 10.1 Browser client

The singleton client is defined in [`src/config/supabaseClient.ts`](../src/config/supabaseClient.ts).

It uses:

- A hardcoded hosted Supabase URL.
- A hardcoded anon key.
- `persistSession: true`.
- `autoRefreshToken: true`.
- `detectSessionInUrl: false`.

The anon key is expected to be public in a Supabase browser application. Its capabilities depend on table grants and RLS policies.

### 10.2 Environment variables

[`vite-env.d.ts`](../vite-env.d.ts) declares:

- `VITE_SUPABASE_URL`.
- `VITE_SUPABASE_ANON_KEY`.

The ignored `.env` contains both values, and they match the hardcoded client values. The application does not read them.

### 10.3 Local Supabase scripts

Three root scripts target `http://127.0.0.1:54321`.

#### `check-tables.mjs`

[`check-tables.mjs`](../check-tables.mjs):

- Uses a local anon/publishable key.
- Reads all `barberias`.
- Reads all `usuarios`.
- Logs results.
- Contains no assertions.

#### `setup-data.mjs`

[`setup-data.mjs`](../setup-data.mjs):

- Uses a local secret/service key.
- Selects or creates the first barber shop.
- Lists Supabase Auth users with the admin API.
- Reads public user IDs.
- Inserts missing public profiles.
- Assigns all missing users to the chosen barber shop.
- Assigns all missing users the `admin` role.
- Uses the first existing barber shop without deterministic ordering.

#### `seed-dashboard.mjs`

[`seed-dashboard.mjs`](../seed-dashboard.mjs):

- Uses a local secret/service key.
- Selects the first barber shop.
- Selects the first user in that tenant.
- Inserts example appointments.
- Inserts example gains.
- Uses no deterministic ordering for the selected tenant or user.

### 10.4 Unused Supabase capabilities

No application code uses:

- Realtime subscriptions.
- Storage.
- RPC.
- SQL functions.
- Edge Functions.
- Webhooks.
- Generated `Database` types.

The historical local configuration enables Realtime and other Supabase services, but the React application does not consume them.

---

## 11. Authentication and session flow

### 11.1 Active authentication implementation

The active authentication implementation is a public-table lookup:

```text
email/password form
        │
        ▼
PostgREST query to usuarios
        │
        ▼
custom localStorage session
        │
        ▼
truthy route guard
```

It is not a Supabase Auth login.

On a clean browser:

- The Supabase client begins with the anon key.
- The login query runs as `anon`.
- Successful lookup stores only custom JSON.
- No Supabase access token is issued.
- Later database operations continue as `anon`.

### 11.2 Custom session structure

The custom session contains:

```ts
{
  id,
  email,
  barberia_id,
  rol
}
```

It is stored under `tenant_session`.

The session is:

- Editable by the browser user.
- Not signed.
- Not encrypted.
- Not validated against Supabase Auth.
- Not expired.
- Trusted as the source of tenant and role information.

### 11.3 Dormant Supabase Auth implementation

The unused `loginUser` in [`src/services/login.ts`](../src/services/login.ts) performs:

1. `supabase.auth.signInWithPassword`.
2. Lookup of `rol` and `barberia_id` by `authData.user.id`.
3. Construction of the same custom session object.
4. Storage in `tenant_session`.

This flow is not imported by the active login screen.

### 11.4 Dual identity possibility

Because the Supabase client persists Auth sessions while the route guard uses a separate custom object, two identities can coexist:

- Supabase Auth may persist user A.
- `tenant_session` may describe user B.
- The application UI trusts user B.
- PostgREST may authenticate requests as user A.

No synchronization logic detects or resolves this condition.

### 11.5 User/profile relationship

The base schema comments that `usuarios.id` is expected to match `auth.uid()`.

However:

- There is no foreign key from `public.usuarios.id` to `auth.users.id`.
- There is no profile-creation trigger.
- There is no Auth deletion/profile deletion lifecycle.
- There is no email synchronization.
- Local setup scripts perform manual reconciliation.

### 11.6 Employee registration

The unused employee-registration service:

1. Accepts an `adminSession` argument.
2. Checks `adminSession.rol === 'admin'` in browser code.
3. Calls `supabase.auth.signUp`.
4. Inserts a public profile.
5. Copies `barberia_id` from the supplied session.
6. Accepts either `admin` or `barbero` as the new role.

Auth creation and profile creation are separate operations. A failure after Auth signup leaves an Auth account without a public profile.

### 11.7 Logout

[`src/views/Dashboard.jsx`](../src/views/Dashboard.jsx) implements logout by removing `tenant_session` and navigating to `/login`.

It does not:

- Call `supabase.auth.signOut`.
- Clear `App.usuario`.
- Clear its own `session` state directly.
- Use the `setUsuario` prop that `App` attempts to pass.

Because `App.usuario` remains truthy:

1. Navigation reaches `/login`.
2. The login route redirects back to `/dashboard`.
3. The remounted Dashboard finds no storage session.
4. Dashboard redirects to `/login`.
5. The two guards can conflict or loop.

The underlying prop mismatch is hidden by `const DashboardComponent = Dashboard as any` in [`src/App.tsx`](../src/App.tsx).

### 11.8 Missing authentication lifecycle elements

The active application has no calls to:

- `signOut`.
- `getSession`.
- `getUser`.
- `onAuthStateChange`.

It also has no represented UI flow for:

- Password reset.
- Email confirmation.
- Employee invitation acceptance.
- Account deletion.
- Auth session expiry.
- Tenant switching.

---

## 12. Multi-tenant implementation

### 12.1 Intended tenancy model

The intended pattern is shared database tables with `barberia_id` as the tenant key.

```text
barberias
├─ usuarios
├─ citas
├─ ganancias
└─ servicios (intended migration model)
```

Each user belongs to one barber shop through a non-null `barberia_id`.

### 12.2 Tenant source in the application

For dashboard routes, the tenant ID originates from:

```text
usuarios lookup
      │
      ▼
tenant_session.barberia_id
      │
      ▼
browser query filters and insert payloads
```

The browser can edit this value.

### 12.3 Read filtering

Most core read paths explicitly filter by `barberia_id`:

- Dashboard appointment count.
- Dashboard revenue.
- Upcoming appointments.
- Agenda list.
- Service list.
- Finance list.

This is consistent application-level tenant filtering.

### 12.4 Write scoping

Writes generally copy IDs from browser state:

- Appointment creation accepts `barberia_id` and `barbero_id`.
- Service creation inserts the supplied object directly.
- Gain insertion accepts `barberia_id` and `barbero_id`.
- Employee registration copies the session tenant.
- Appointment deletion includes both row ID and tenant ID.
- Appointment charging updates by row ID alone.

With the represented database privileges and RLS state, knowledge or substitution of tenant UUIDs can redirect operations.

### 12.5 Role model

`usuarios.rol` is constrained to `admin` or `barbero`.

The role is descriptive application data rather than an enforced authorization boundary. No route, active query, or represented RLS policy uses the role. Both roles receive the same dashboard routes and capabilities.

### 12.6 Membership model

A user has one `barberia_id` directly on `usuarios`.

The represented model does not support:

- One user belonging to multiple tenants.
- Explicit membership records.
- Tenant-specific roles for the same user.
- Invitations with pending membership state.

### 12.7 Cross-tenant relational integrity

Foreign keys validate referenced row existence but not tenant equality.

Examples:

- `citas.barbero_id` references a user.
- `citas.barberia_id` separately references a barber shop.
- Nothing proves the referenced barber belongs to that barber shop.
- A gain’s barber can belong to a different tenant.
- A gain’s appointment can belong to a different tenant.
- A service can be associated with an appointment in a different tenant.
- A `barbero_id` can reference a user whose role is `admin`.

These combinations remain structurally valid under the represented constraints.

---

## 13. Database model

### 13.1 `barberias`

Defined in [`db/schema.sql`](../db/schema.sql).

| Column | Type | Characteristics |
|---|---|---|
| `id` | UUID | Primary key, generated UUID |
| `nombre` | `VARCHAR(255)` | Required |
| `comuna` | `VARCHAR(255)` | Required |
| `creado_en` | `TIMESTAMPTZ` | Defaults to current time |

The public page expects a `slug` column, but none is represented.

### 13.2 `usuarios`

| Column | Type | Characteristics |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | `VARCHAR(255)` | Unique and required |
| `rol` | `VARCHAR(50)` | Required, check constraint |
| `barberia_id` | UUID | Required tenant FK |
| `creado_en` | `TIMESTAMPTZ` | Defaults to current time |

Important omissions:

- No foreign key to `auth.users`.
- No `password` column.
- No tenant-membership table.
- No role-enforced authorization.

### 13.3 `citas`

| Column | Type | Characteristics |
|---|---|---|
| `id` | UUID | Primary key |
| `cliente` | `VARCHAR(255)` | Required |
| `fecha` | Date | Required |
| `hora` | Time | Required |
| `barbero_id` | UUID | Required user FK |
| `barberia_id` | UUID | Required tenant FK |
| `creado_en` | `TIMESTAMPTZ` | Defaults to current time |

Later manual artifacts add:

- `servicio_id BIGINT`.
- `estado VARCHAR DEFAULT 'pendiente'`.

There is no represented:

- Unique appointment-slot constraint.
- Check constraint for appointment status.
- Composite tenant/barber relationship.
- Customer contact information.

### 13.4 `ganancias`

| Column | Type | Characteristics |
|---|---|---|
| `id` | UUID | Primary key |
| `monto` | `DECIMAL(10,2)` | Required |
| `concepto` | `VARCHAR(255)` | Required |
| `cita_id` | UUID | Optional appointment FK |
| `barbero_id` | UUID | Required user FK |
| `barberia_id` | UUID | Required tenant FK |
| `creado_en` | `TIMESTAMPTZ` | Defaults to current time |

There is no represented:

- Positive-amount check.
- Uniqueness or idempotency constraint per appointment.
- Composite tenant consistency constraint.

The active charging flow does not populate `cita_id`.

### 13.5 `servicios`

The repository contains two incompatible service models.

#### Numbered migration model

[`db/migrations/001_servicios.sql`](../db/migrations/001_servicios.sql) defines:

| Column | Type |
|---|---|
| `id` | UUID |
| `barberia_id` | UUID |
| `name` | `VARCHAR(255)` |
| `description` | Text |
| `duration_minutes` | Integer |
| `price` | `DECIMAL(10,2)` |
| `active` | Boolean |
| `created_at` | `TIMESTAMPTZ` |

It includes a positive duration check, positive price check, per-tenant unique service name, and tenant index.

#### Manual/production model

The tracked snippet and production snapshot define:

| Column | Type |
|---|---|
| `id` | Bigint identity |
| `nombre` | Text |
| `precio` | Numeric |
| `duracion` | Integer |
| `created_at` | `TIMESTAMPTZ` |

This model has no `barberia_id`.

#### Frontend model

The frontend expects:

- Bigint-like numeric ID behavior.
- `nombre`.
- `precio`.
- `duracion`.
- `created_at`.
- `barberia_id`.

It therefore matches neither SQL model completely.

### 13.6 Represented indexes

The base schema includes:

- `usuarios(barberia_id)`.
- `citas(barberia_id)`.
- `ganancias(barberia_id)`.

The numbered services migration includes `servicios(barberia_id)`.

No represented composite indexes match common access patterns such as:

- `citas(barberia_id, fecha, hora)`.
- `ganancias(barberia_id, creado_en)`.

No represented indexes cover several foreign-key columns:

- `citas.barbero_id`.
- `citas.servicio_id`.
- `ganancias.barbero_id`.
- `ganancias.cita_id`.

---

## 14. Database interaction patterns

All regular application data access goes through the Supabase browser client and PostgREST.

### 14.1 Query inventory

| Module or view | Table | Operation |
|---|---|---|
| `Login.tsx` | `usuarios` | Select by email and password |
| `services/login.ts` | `usuarios` | Select profile by Auth UUID |
| `registerEmployee.ts` | `usuarios` | Insert profile |
| `dashboard.ts` | `citas` | Exact count for tenant and date |
| `dashboard.ts` | `ganancias` | Select amount for tenant/day range |
| `dashboard.ts` | `citas` | Select upcoming rows with user relation |
| `getAppointments.ts` | `citas` | Select tenant rows with service relation |
| `getAppointments.ts` | `citas` | Insert, update, delete |
| `getAppointments.ts` | `ganancias` | Insert |
| `services.ts` | `servicios` | Select and insert |
| `finances.ts` | `ganancias` | Select all tenant rows |
| `PublicLandingPage.tsx` | `barberias` | Select by slug |
| `PublicLandingPage.tsx` | `servicios` | Select by tenant |
| `PublicLandingPage.tsx` | `citas` | Public insert |

### 14.2 Dashboard queries

`getDashboardStats` performs two requests:

1. Exact head-only count of appointments filtered by tenant and date.
2. Selection of gain amounts filtered by tenant and timestamp range.

`getUpcomingAppointments`:

- Selects appointment columns.
- Embeds related `usuarios.email`.
- Filters by tenant.
- Filters by `fecha >= hoy`.
- Orders by date, then time.
- Limits to five.

The two dashboard calls are made sequentially by the view even though they are independent.

### 14.3 Agenda queries

Agenda initially loads services and appointments concurrently.

Appointment selection:

- Uses `select('*')`.
- Embeds `servicios(nombre, precio)`.
- Filters by tenant.
- Orders by date and time.
- Has no pagination.

### 14.4 Mutation atomicity

Two important flows contain multiple independent remote operations.

#### Appointment charging

```text
UPDATE citas SET estado = 'completada'
        │
        ▼
INSERT INTO ganancias
```

A failure after the update leaves the appointment completed without a gain. A repeated attempt can create repeated gain records because no represented idempotency relationship is used.

#### Employee provisioning

```text
Supabase Auth signUp
        │
        ▼
INSERT INTO public.usuarios
```

A profile-insert failure leaves an Auth user without a public profile.

### 14.5 Pagination and limits

Agenda and finance request complete tenant datasets without pagination.

The historical local Supabase configuration sets `api.max_rows = 1000` in [`supabase_old/config.toml`](../supabase_old/config.toml). The hosted project’s current row limit cannot be established from the repository.

### 14.6 Date and timezone behavior

Dashboard uses `new Date().toISOString().split('T')[0]` to determine the date, which produces a UTC calendar date.

It then creates local-time start and end timestamps from that string and converts them back to ISO timestamps. This mixes UTC-derived date selection with local-time day boundaries. Around timezone boundaries, the day used for `citas.fecha` and the range used for `ganancias.creado_en` can diverge from the local business day.

The upper bound uses `23:59:59`, which does not include fractional timestamp values later within that final second.

### 14.7 Error handling at the data layer

| Module | Error behavior |
|---|---|
| Dashboard services | Log error and return zero/empty data |
| Appointment services | Throw |
| Finance services | Throw |
| Service-catalog services | Throw |
| `loginUser` | Catch and return `null` |
| `registerEmployee` | Catch and return `false` |
| Direct views | Use alerts and logs |

This makes database failure semantically inconsistent across features.

---

## 15. RLS, privileges, and security boundary

### 15.1 Base schema

The only tenant RLS example in [`db/schema.sql`](../db/schema.sql) is commented out and applies only to `citas`. The comments describe RLS as a future security measure rather than an active part of the schema.

### 15.2 Historical snippets

Historical snippets explicitly disable RLS on `barberias`, `usuarios`, `citas`, and `ganancias`: [historical RLS snippet](<../supabase_old/snippets/Untitled query 870.sql>).

Another historical snippet disables RLS on `usuarios` and grants reads to both `anon` and `authenticated`: [historical user-access snippet](<../supabase_old/snippets/Untitled query 406.sql>).

### 15.3 Current service snippet

A current ignored snippet explicitly disables RLS on `servicios`: [service RLS snippet](<../supabase/snippets/Untitled query 380.sql>).

Other snippets grant:

- Service `SELECT`, `INSERT`, `UPDATE`, and `DELETE` to `anon` and `authenticated`.
- Sequence usage to `anon` and `authenticated`.
- Gain `SELECT` and `INSERT` to `anon` and `authenticated`.

### 15.4 Production snapshot

The ignored production snapshot contains policies named “Enable read access for all users” on `barberias`, `citas`, `ganancias`, and `usuarios`. Each uses `USING (true)`: [`estructura_produccion.sql`](../estructura_produccion.sql).

The snapshot contains no table-level `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements. Therefore, those policies are inert in the dumped state.

Its `SET row_security = off` statement is a setting for the dump session; it is not itself a table-level RLS declaration.

The same snapshot grants broad table privileges to both `anon` and `authenticated`.

### 15.5 Effective represented boundary

The effective security model represented in the repository is:

```text
Browser-supplied tenant ID
        │
        ▼
Client-side .eq('barberia_id', ...)
        │
        ▼
Broadly accessible PostgREST tables
```

This is application-level filtering rather than database-enforced isolation.

The local `check-tables.mjs` script demonstrates anonymous selection of all barber shops and users.

Because the active login does not establish an Auth session, any functionality relying solely on `authenticated` privileges would fail for a clean browser. The represented application behavior instead aligns with anonymous table access.

---

## 16. Schema and migration drift

The repository does not encode one canonical, reproducible database state.

### 16.1 Database artifacts

Material schema information is distributed across:

- [`db/schema.sql`](../db/schema.sql).
- [`db/migrations/001_servicios.sql`](../db/migrations/001_servicios.sql).
- Current `supabase/snippets`.
- Historical `supabase_old/snippets`.
- Ignored [`estructura_produccion.sql`](../estructura_produccion.sql).

The active `supabase` folder has snippets and CLI metadata but no `config.toml` or migration chain. The only Supabase CLI configuration is under `supabase_old`.

### 16.2 Service-table conflict

| Source | ID | Tenant column | Field naming |
|---|---|---|---|
| Numbered migration | UUID | Present | English |
| Manual creation snippet | Bigint identity | Absent | Spanish |
| Production snapshot | Bigint identity | Absent | Spanish |
| Frontend | Numeric behavior | Required | Spanish |

The numbered migration uses `CREATE TABLE IF NOT EXISTS`. If applied after the manually created bigint table already exists, it does not reconcile the divergent structure.

### 16.3 Appointment conflict

The base schema lacks `servicio_id` and `estado`. Manual snippets and the production snapshot add both. The frontend depends on both.

The service migration defines UUID service IDs, while the appointment snippet defines `servicio_id BIGINT`.

### 16.4 Active login conflict

The active login queries `usuarios.password`. Neither the base schema nor production snapshot defines `password`. If a deployed-only password column exists, it is not represented by the repository.

### 16.5 Public booking conflict

The public page queries `barberias.slug`. Neither the base schema nor production snapshot defines `slug`.

The public insert omits `barbero_id`, while both schema representations define it as required.

### 16.6 Duplicate-slot conflict

Agenda explicitly handles PostgreSQL error `23505` for duplicate appointment times. No appointment uniqueness constraint is represented in any schema artifact.

### 16.7 Ignored database state

`.gitignore` explicitly ignores `estructura_produccion.sql` and several current SQL snippets. Therefore, materially relevant database state exists in the working directory without being represented in tracked history.

The `.gitignore` also repeats the same rule for one snippet multiple times.

### 16.8 CLI metadata

Tracked Supabase CLI artifacts include:

- Current branch metadata.
- CLI-version metadata.
- A large historical pgdelta catalogue.

These generated artifacts coexist with the absence of a current migration history.

### 16.9 Live database uncertainty

The application points to a hosted Supabase project. This review did not query that live database.

The hosted schema may contain manually added columns, constraints, or policies not represented locally. The repository alone cannot prove the live database state.

---

## 17. Architectural issues

The following are architectural observations, not change proposals.

### 17.1 Authentication is not authoritative

The active application treats a local JSON object as authentication while Supabase continues to see an anonymous client.

### 17.2 Tenant identity is caller-controlled

`barberia_id` is loaded from editable browser storage and passed into reads and writes.

### 17.3 Database isolation is not represented

The repository contains commented-out, disabled, permissive, or absent RLS rather than active tenant-isolating policies.

### 17.4 Authentication implementations compete

The active direct-table login and unused Supabase Auth login represent incompatible identity models.

### 17.5 Session sources can disagree

`App`, `Dashboard`, route views, custom storage, and the Supabase client can hold different identity state.

### 17.6 Logout has conflicting route behavior

Removing storage without clearing `App.usuario` leaves the route guard truthy and can create repeated redirects between login and dashboard.

### 17.7 Role is not authorization

The `rol` field is stored but does not affect routes, active queries, or represented database policies. Admin and barber receive the same capabilities.

### 17.8 Database state is not reproducible

The checked-in artifacts do not form a consistent migration sequence capable of recreating the schema expected by the UI.

### 17.9 Core contracts disagree

The UI expects `usuarios.password`, `barberias.slug`, tenant-owned Spanish-column services, and public appointment creation without a barber. No available schema supports that complete contract.

### 17.10 Cross-tenant integrity is not enforced

Independent foreign keys permit related rows to carry different tenant identities.

### 17.11 Multi-step operations are non-atomic

Charging and employee provisioning can leave partial state after intermediate success.

### 17.12 Public booking relies on broad anonymous access

The public route directly reads tenants and services and inserts appointments from the browser.

### 17.13 Public scheduling is not availability-aware

The application presents fixed slots without querying current bookings or using service duration.

### 17.14 Database errors can masquerade as empty business data

Dashboard services return zeros and empty arrays after query errors.

### 17.15 Server-state ownership is fragmented

Each view independently loads and mutates server data without a shared cache or subscription mechanism.

### 17.16 Route components combine many responsibilities

Large views contain data access, session parsing, domain rules, calendar calculations, mutation orchestration, validation, and presentation.

### 17.17 Route code is eagerly loaded

All views are part of the initial static import graph.

### 17.18 Date calculations are timezone-sensitive

UTC date derivation is mixed with local-day timestamp construction.

### 17.19 Data retrieval is unpaginated

Agenda and finance load complete tenant datasets and can encounter Supabase row limits.

### 17.20 Mobile navigation is incomplete

The active Navbar hides route links on small screens while the alternative Sidebar is unused.

---

## 18. Code-quality observations

### 18.1 Positive qualities

- The repository is compact and easy to trace.
- Domain naming is generally understandable.
- Route-level intent is clear.
- Core table queries are grouped into small service modules in several features.
- Main tenant reads consistently include explicit tenant filters.
- Agenda loads its independent initial datasets concurrently.
- Most async UI operations use `try/finally`.
- UI primitives use typed props.
- `forwardRef` is used appropriately in reusable inputs, buttons, cards, and table rows.
- The `cn` helper provides consistent Tailwind class merging.
- The UI barrel file exposes a clear shared component surface.
- TypeScript checking succeeds.
- Vite can transform the full production application successfully.

### 18.2 Type-safety limitations

- Most complex dashboard views are `.jsx`.
- `allowJs` is enabled without `checkJs`.
- Core Supabase records are not generated or typed from the database.
- `PublicLandingPage` uses `any` for tenants and services.
- `getUpcomingAppointments` uses a double cast to `Appointment[]`.
- `Dashboard as any` hides a real prop mismatch.
- Session types are independently declared in `App`, `Login`, and the unused login service.

Schema contradictions therefore receive no compile-time detection.

### 18.3 Partial abstraction boundaries

Data access is inconsistent:

- Dashboard, finance, appointments, and services use wrapper modules.
- Login queries Supabase directly.
- Public booking queries Supabase directly.
- Appointment services live outside the `services` folder.

Error behavior also differs by module.

### 18.4 Component size and duplication

Large files include:

- `Agenda.jsx`: approximately 504 lines.
- `PublicLandingPage.tsx`: approximately 362 lines.
- `Servicios.jsx`: approximately 189 lines.

Agenda and Public Landing duplicate:

- Month state.
- Spanish month and weekday constants.
- Date formatting.
- Month navigation.
- Day-grid calculation.
- Date selection.
- Fixed half-hour slot generation.
- Custom dropdown presentation.

The active Navbar and inactive Sidebar duplicate navigation metadata.

### 18.5 Dead code and unused symbols

Inactive elements include:

- `Sidebar`.
- `PlaceholderView`.
- `Loading`.
- `TableSkeleton`.
- `loginUser`.
- `registerEmployee`.
- Empty `HistorialCaja`.
- Agenda’s `fallbackIds`.

Unchecked `.jsx` imports include unused UI components in Agenda, Servicios, and DashboardHome.

### 18.6 Concrete runtime inconsistencies

- Servicios never clears `saving` after successful creation.
- Service edit/delete buttons have no handlers.
- Appointment state uses both `pendiente` and `Pendiente`.
- Dashboard renders a static pending status.
- Dashboard rating is hard-coded.
- The dashboard comment describes `estado` as absent even though a later manual snippet adds it.
- Some loading paths remain active forever when tenant data is missing.
- `TenantBadge` assumes a defined string.
- Only `App` safely handles malformed session JSON.

### 18.7 Accessibility observations

- Custom dropdown options are clickable `<div>` elements without native keyboard semantics.
- Some icon-only service action buttons lack accessible labels.
- The active small-screen layout lacks navigation links.
- Several custom popovers rely primarily on mouse click behavior.

### 18.8 Styling consistency

The project contains two visual systems:

1. Token-based neutral styling in Tailwind and reusable UI components.
2. Hard-coded slate/amber/brutalist styling in active views.

Other styling observations:

- Fonts are loaded twice.
- Global heading CSS overrides the serif heading class.
- Some reusable primitives are imported but bypassed in favor of raw controls.
- The unused Sidebar follows a different styling direction from the active Navbar.

### 18.9 Logging and user feedback

The application relies on:

- `console.log`.
- `console.error`.
- `alert`.
- `window.confirm`.

Agenda contains debug logging for clicks and session IDs. There is no centralized notification or error-display mechanism.

---

## 19. Testing, automation, and documentation

The repository contains no:

- Unit tests.
- Integration tests.
- Component tests.
- Browser/end-to-end tests.
- Test dependencies.
- Test scripts.
- Coverage configuration.
- ESLint configuration.
- Prettier configuration.
- Biome configuration.
- Storybook.
- Continuous integration workflows.
- README.
- Database migration workflow documentation.
- Pre-existing architecture documentation.

The only automated verification represented by package scripts is:

```text
TypeScript check
      │
      ▼
Vite production build
```

`check-tables.mjs` is a manual inspection utility rather than a test because it contains no assertions, prints complete query data, and does not produce pass/fail semantics beyond request errors.

---

## 20. Verification results

### 20.1 TypeScript

`tsc --noEmit` completed successfully.

This validates the `.ts` and `.tsx` portions covered by the TypeScript configuration. It does not fully validate `.jsx` internals because `checkJs` is disabled.

### 20.2 Vite production transformation

An in-memory production build was executed with file output disabled.

Result:

- Successful.
- Approximately 2,268 modules transformed.
- No repository files written by the build.

This proves that Vite can currently parse, transform, and bundle the source. It does not verify runtime database compatibility.

### 20.3 Dependency graph

Installed top-level dependencies resolved successfully through the existing lockfile and `node_modules`.

### 20.4 Repository state

The repository was clean before documentation creation. The architecture audit itself made no application or configuration changes.

---

## 21. Current architectural baseline

BarberSaaS is presently a compact React/Supabase operational prototype with a clear functional direction:

- Dashboard.
- Appointment management.
- Services.
- Finance tracking.
- Public booking.
- Tenant IDs carried through domain rows.

Its current effective architecture is browser-centric:

```text
React UI
  ├─ Custom local session
  ├─ Client-side role and tenant data
  ├─ Client-side business workflows
  └─ Direct Supabase PostgREST operations
```

The intended database architecture is shared-schema multi-tenancy, but the repository does not represent database-enforced tenant isolation. Authentication, tenant identity, role data, and database requests are not tied together by one authoritative session model.

The strongest structural characteristic is database source-of-truth drift. The React application, base schema, numbered migration, manual snippets, historical Supabase folder, and ignored production snapshot describe incompatible contracts. As a result, a successful frontend build does not establish that the application can execute correctly against a database recreated from this repository.

The codebase remains understandable because of its small size, readable feature naming, route separation, and reusable UI primitives. Its dominant architectural and quality signals are:

- Competing authentication flows.
- Duplicated session ownership.
- Client-controlled tenant identity.
- Absent represented tenant RLS.
- Inconsistent schema artifacts.
- Non-atomic multi-step operations.
- Substantial unchecked JSX.
- Large route components with duplicated booking UI.
- Partial data-access abstractions.
- Dead or incomplete refactor artifacts.
- No automated test, lint, CI, or prior documentation layer.

This document represents the current as-is architectural baseline.
