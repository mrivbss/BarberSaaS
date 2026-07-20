# BarberSaaS Business and Domain Review

## Document status

| Field | Value |
|---|---|
| Purpose | Record the product behavior, domain model, user journeys, business rules, and business-level risks represented by the repository |
| Scope | Current React application, data-access code, SQL artifacts, and local operational scripts |
| Perspective | As-is behavior; no future-state assumptions or change proposals |
| Companion document | [`01_ARCHITECTURE_REVIEW.md`](./01_ARCHITECTURE_REVIEW.md) |
| Live production validation | Not performed; hosted Supabase state was not queried |

This document describes the business system encoded by the repository. Where the user interface and SQL artifacts disagree, both representations are documented. A behavior described by React code is not assumed to be operational against the hosted database unless the repository contains a compatible database contract.

## Table of contents

1. [Product definition](#1-product-definition)
2. [Business scope](#2-business-scope)
3. [Actors and roles](#3-actors-and-roles)
4. [Tenant and ownership model](#4-tenant-and-ownership-model)
5. [Business entities](#5-business-entities)
6. [Route and capability map](#6-route-and-capability-map)
7. [Authentication and access journey](#7-authentication-and-access-journey)
8. [Dashboard and business metrics](#8-dashboard-and-business-metrics)
9. [Appointment-management lifecycle](#9-appointment-management-lifecycle)
10. [Service-catalog lifecycle](#10-service-catalog-lifecycle)
11. [Financial lifecycle](#11-financial-lifecycle)
12. [Public booking journey](#12-public-booking-journey)
13. [Employee provisioning](#13-employee-provisioning)
14. [Local setup and demonstration data](#14-local-setup-and-demonstration-data)
15. [Encoded business rules](#15-encoded-business-rules)
16. [Business state models](#16-business-state-models)
17. [Data ownership and business isolation](#17-data-ownership-and-business-isolation)
18. [Functional completeness matrix](#18-functional-completeness-matrix)
19. [Business-data and workflow inconsistencies](#19-business-data-and-workflow-inconsistencies)
20. [Operational and business risks](#20-operational-and-business-risks)
21. [User-experience observations](#21-user-experience-observations)
22. [Business terminology](#22-business-terminology)
23. [Current business baseline](#23-current-business-baseline)

---

## 1. Product definition

BarberSaaS represents a multi-tenant barbershop operations product. Its implemented and partially implemented capabilities cover:

- Barber-shop identity and location.
- Barber-shop users and employee roles.
- Service catalogues.
- Appointment scheduling.
- Appointment completion and charging.
- Revenue history.
- Daily operational metrics.
- Public self-service appointment booking.

The product is implemented as a browser application backed directly by Supabase. There is no separate operator portal or server-side business layer.

The repository represents an early operational SaaS prototype rather than a complete SaaS commercial platform. The word “SaaS” is present in product naming and multi-tenant intent, but subscription commerce and tenant lifecycle features are not represented.

---

## 2. Business scope

### 2.1 Capabilities represented in the active user interface

- Sign in to a barber-shop dashboard.
- View daily revenue and appointment counts.
- View a short upcoming-appointment list.
- Create appointments internally.
- Associate appointments with a service.
- Mark appointments as charged/completed.
- Delete appointments.
- View the barber shop’s services.
- Create services.
- View revenue transactions and aggregate revenue.
- Open a public tenant-specific booking page.
- Submit a public booking.

### 2.2 Capabilities represented only by dormant code

- Supabase Auth password login.
- Employee registration through Supabase Auth signup.
- Assignment of a new employee to the administrator’s tenant.
- Assignment of either `admin` or `barbero` role to a new employee.

These functions exist in the repository but are not connected to active routes or user-interface controls.

### 2.3 Capabilities presented visually but not operationally implemented

- Editing a service.
- Deleting a service.
- Dashboard rating: a value of `4.8` is displayed without a rating data source.
- “Real-time” agenda behavior: the UI uses that wording but has no Supabase Realtime subscription.

### 2.4 Business areas not represented

The repository contains no workflows for:

- Subscription plans.
- SaaS billing.
- Trial management.
- Tenant signup or guided onboarding.
- Tenant suspension or closure.
- Platform-level tenant administration.
- Usage metering.
- Customer accounts.
- Customer authentication.
- Customer contact management.
- Customer history.
- Barber availability configuration.
- Business hours configuration.
- Breaks, holidays, or blocked periods.
- Service-specific scheduling duration.
- Appointment rescheduling.
- Appointment cancellation as a distinct state.
- Refunds or voided charges.
- Payment methods.
- Taxes.
- Discounts.
- Tips.
- Commissions.
- Payouts.
- Inventory or product sales UI.
- Notifications or reminders.
- Reporting by employee, service, or time period.
- Audit history.

---

## 3. Actors and roles

### 3.1 Barber-shop tenant

A barber shop is the root business organization. It is represented by a row in `barberias` with:

- UUID.
- Name.
- Municipality or locality (`comuna`).
- Creation timestamp.

The public booking route additionally expects a slug, although no available schema defines that field.

The tenant concept is used to scope users, appointments, gains, and the intended service catalogue.

### 3.2 Administrator

`admin` is one of two allowed values for `usuarios.rol`.

The dormant employee-registration service implies that an administrator can:

- Create employees.
- Assign their barber shop.
- Choose `admin` or `barbero` as the employee role.

In the active application, the administrator has no distinct route or permission set. The role is stored in the custom session but is not used to authorize navigation or business operations.

### 3.3 Barber

`barbero` is the second allowed user role.

A barber is used as the responsible employee on:

- Appointments through `citas.barbero_id`.
- Gains through `ganancias.barbero_id`.

The active application does not enforce that a referenced `barbero_id` belongs to a user whose role is actually `barbero`.

The active dashboard grants a barber the same routes and visible controls as an administrator.

### 3.4 Public customer

A public customer does not have an account.

The customer can access `/b/:slug` and submit:

- Name.
- Service.
- Date.
- Time.

The flow does not collect:

- Email.
- Phone number.
- Notes.
- Consent records.
- Preferred barber.
- Payment information.

The customer receives an in-page success message after the appointment insert succeeds.

### 3.5 Platform operator or developer

There is no platform-operator UI. Operational setup is represented only through local scripts that can:

- Create or select a barber shop.
- List Supabase Auth users.
- Insert missing application profiles.
- Assign users to a tenant.
- Seed appointments and gains.
- Inspect barber-shop and user tables.

These scripts target a local Supabase instance and use local credentials.

---

## 4. Tenant and ownership model

### 4.1 Intended ownership hierarchy

```text
Barber shop
├─ Users
│  ├─ Administrators
│  └─ Barbers
├─ Services
├─ Appointments
└─ Gains
```

Each represented application user belongs to exactly one barber shop through a non-null `barberia_id`.

The model does not represent:

- Multi-tenant user membership.
- Invitations awaiting acceptance.
- Multiple roles per user.
- A platform-superadmin role.
- Tenant ownership separate from the `admin` role.

### 4.2 Tenant selection during login

The active login retrieves `barberia_id` from the matching `usuarios` row and stores it in `tenant_session`.

All subsequent dashboard behavior assumes that stored value identifies the current business.

No user-facing tenant selector exists.

### 4.3 Tenant selection for public booking

The public route resolves a tenant using a URL slug:

```text
/b/:slug
    │
    ▼
barberias.slug
    │
    ▼
barberia.id
    │
    ├─ filter services
    └─ assign appointment tenant
```

The expected `slug` field is absent from the available SQL definitions.

### 4.4 Tenant filtering in business operations

The following active reads explicitly filter by `barberia_id`:

- Daily appointment count.
- Daily gains.
- Upcoming appointments.
- Agenda appointments.
- Service catalogue.
- Finance history.

The following active writes accept tenant identity from the browser:

- Appointment creation.
- Service creation.
- Gain creation.
- Appointment deletion.

The dormant employee-registration flow also assigns tenant identity from the caller-supplied administrator session.

### 4.5 Tenant consistency limitations

The database model stores tenant identity redundantly on related rows, but the available constraints do not prove that related records belong to the same tenant.

Examples include:

- An appointment can reference a user from another barber shop while carrying the current barber shop’s `barberia_id`.
- A gain can reference an appointment or barber from another barber shop.
- A service can be associated with an appointment from another tenant if incompatible identifiers are supplied.

---

## 5. Business entities

### 5.1 Barber shop

Business meaning: the tenant organization operating the dashboard and public booking page.

Represented attributes:

- `id`.
- `nombre`.
- `comuna`.
- `creado_en`.

Application-required but schema-absent attribute:

- `slug`.

### 5.2 User

Business meaning: a staff member associated with a barber shop.

Represented attributes:

- `id`.
- `email`.
- `rol`.
- `barberia_id`.
- `creado_en`.

Active-login-required but schema-absent attribute:

- `password`.

The UUID is documented as expected to correspond to Supabase Auth’s user ID, but no database relationship enforces that expectation.

### 5.3 Service

Business meaning: an offering a customer can book and the shop can price.

Frontend attributes:

- Identifier.
- Name.
- Price.
- Duration in minutes.
- Tenant ID.
- Creation timestamp.

The numbered migration additionally models:

- Description.
- Active/inactive status.
- Positive price.
- Positive duration.
- Unique service name within a tenant.

The manual and production service schema does not include tenant identity, description, or active status.

The active service-card UI displays a generic description rather than stored description data.

### 5.4 Appointment

Business meaning: a scheduled service for a named customer at a date and time, assigned to a barber and tenant.

Represented or application-required attributes:

- Identifier.
- Customer name.
- Date.
- Time.
- Barber ID.
- Barber-shop ID.
- Service ID.
- State.
- Creation timestamp.

The base schema lacks service and state fields, while later snippets add them.

The model does not represent customer contact information or a separate customer entity.

### 5.5 Gain

Business meaning: a revenue movement attributed to a barber and barber shop.

Represented attributes:

- Identifier.
- Amount.
- Concept.
- Optional appointment ID.
- Barber ID.
- Barber-shop ID.
- Creation timestamp.

The optional appointment relationship implies that gains can also represent non-appointment revenue, such as product sales. The current UI only creates gains by charging appointments, and it does not populate the appointment relationship.

---

## 6. Route and capability map

| Route | Audience | Business purpose | Main capabilities |
|---|---|---|---|
| `/login` | Staff | Enter the operational dashboard | Direct user-table credential lookup |
| `/dashboard` | Any truthy custom session | Daily operational overview | Today’s revenue, today’s appointments, rating display, upcoming appointments |
| `/dashboard/agenda` | Any truthy custom session | Manage schedule | List, create, charge, and delete appointments |
| `/dashboard/servicios` | Any truthy custom session | Manage offerings | List and create services; edit/delete shown but inactive |
| `/dashboard/finanzas` | Any truthy custom session | Review revenue | Total all gains and list transactions |
| `/b/:slug` | Public customer | Book an appointment | Resolve shop, select service/date/time, submit booking |

There are no role-specific routes. There is no separate platform or tenant-management route.

---

## 7. Authentication and access journey

### 7.1 Active staff login journey

1. The user opens `/login`.
2. The user enters email and password.
3. The browser queries `usuarios` for a row matching both values.
4. If one row is found, the browser builds a session containing user, role, and tenant IDs.
5. The browser saves that object under `tenant_session`.
6. `App` stores the object in memory.
7. The user is navigated to `/dashboard`.

The active journey does not establish a Supabase Auth session.

### 7.2 Returning staff journey

1. The application starts.
2. `App` reads `tenant_session`.
3. Any successfully parsed object is treated as an authenticated user.
4. The dashboard becomes available without revalidating credentials or membership.

The custom session has no represented expiration time.

### 7.3 Access-control semantics

The business UI considers a staff member authenticated when `usuario` is truthy.

It does not verify:

- Current Auth status.
- User activation.
- Current tenant membership.
- Role permissions.
- Tenant status.
- Password changes.
- Session revocation.

### 7.4 Logout journey

1. The user clicks the Navbar logout button.
2. The dashboard removes `tenant_session`.
3. The dashboard navigates to `/login`.
4. `App.usuario` remains populated.
5. The login route considers the user authenticated and redirects to `/dashboard`.
6. Dashboard sees that storage is empty and redirects to login.

This leaves the two session owners in conflict and can produce repeated redirects.

### 7.5 Dormant Auth journey

An unused service represents a different intended flow:

1. Sign in with Supabase Auth.
2. Retrieve the matching `usuarios` profile by Auth UUID.
3. Add role and tenant metadata to the custom session.
4. Persist that custom session.

This flow does not currently drive the login page.

---

## 8. Dashboard and business metrics

The dashboard is intended to provide a concise daily operational view.

### 8.1 “Ingresos del Día”

Definition encoded by the application:

- Query `ganancias` for the current tenant.
- Filter `creado_en` between the generated start and end of the current day.
- Sum `monto` in the browser.

Business implications of the current definition:

- Revenue is based on gain-creation time, not appointment date.
- All gain concepts count equally.
- There is no distinction between service revenue, product revenue, refunds, tips, taxes, or other movements.
- Query failure is displayed as zero revenue.
- Day-boundary calculation is timezone-sensitive.

### 8.2 “Citas hoy”

Definition encoded by the application:

- Count all `citas` for the current tenant where `fecha` equals today.

The count does not distinguish:

- Pending appointments.
- Completed appointments.
- Cancelled appointments.
- Deleted appointments, which no longer exist.
- Paid versus unpaid appointments.

### 8.3 “Calificación”

The displayed rating is always `4.8`.

There is no represented:

- Review table.
- Rating table.
- Rating query.
- Customer-review workflow.
- Tenant-specific rating calculation.

### 8.4 “Cita Próxima”

Definition encoded by the application:

- Fetch appointments with `fecha >= hoy`.
- Sort by date and time.
- Display the first result’s time and customer.

An appointment earlier on the current day remains eligible because only the date is compared.

### 8.5 Upcoming appointment table

The dashboard displays up to five appointments with:

- Customer name.
- Time.
- Static “Pendiente” status.

The table does not display:

- Date.
- Service.
- Barber.
- Actual stored state.
- Price.

---

## 9. Appointment-management lifecycle

### 9.1 Internal appointment creation

The Agenda screen requires:

- Customer name.
- Service.
- Date.
- Time.

It derives:

- Barber ID from `session.barbero_id` or `session.id`.
- Tenant ID from `session.barberia_id`.
- Initial state as lowercase `pendiente`.

The application then inserts the appointment and refetches the full tenant agenda.

### 9.2 Barber assignment

The internal appointment flow does not present a barber selector.

The logged-in user is used as the barber unless the custom session contains a separate `barbero_id`.

The normal active login session contains `id`, not a separate `barbero_id`, so the logged-in user ID is ordinarily assigned.

This behavior applies equally to users whose stored role is `admin`.

### 9.3 Service selection

The selected service supplies:

- Service identifier for the appointment.
- Price used later during charging.
- Name used in the gain concept.

Service duration is displayed but does not affect slot selection or collision behavior.

### 9.4 Appointment schedule

The scheduling UI exposes fixed times:

- Opening slot: 08:00.
- Closing slot: 20:00.
- Interval: 30 minutes.

These hours are hard-coded globally rather than configured per tenant, barber, weekday, or service.

### 9.5 Duplicate bookings

The Agenda error handling recognizes PostgreSQL unique-constraint violations and tells the user that a slot already exists.

No matching uniqueness constraint appears in the repository SQL.

The UI does not remove occupied slots before submission.

### 9.6 Charging an appointment

The charging flow requires:

- A selected service relation.
- A non-zero service price.
- User confirmation.

It then:

1. Marks the appointment `completada`.
2. Inserts a gain with the service price.
3. Uses a concept in the form `Cita: <service> - <customer>`.
4. Refetches the agenda.

The gain does not store the appointment ID.

If the state update succeeds and gain insertion fails, the appointment remains completed without corresponding recorded revenue.

### 9.7 Deleting an appointment

The user confirms deletion through a browser confirmation dialog.

The application deletes the row and removes it from local state.

Deletion is a hard delete. There is no represented cancellation reason, cancelled state, deleted-by identity, or audit record.

### 9.8 Appointment states

The repository represents the following state values:

- `pendiente` in the internal appointment service and SQL default.
- `Pendiente` in public booking.
- `completada` when charged.

There is no database check constraint limiting allowed appointment states.

There are no represented states for:

- Confirmed.
- Cancelled.
- No-show.
- Rescheduled.
- In progress.
- Refunded.

---

## 10. Service-catalog lifecycle

### 10.1 Service listing

The service page requests all services for the current tenant and orders by newest creation time first.

This assumes `servicios.barberia_id` exists.

The manual and production SQL model does not contain that column, while the numbered migration does.

### 10.2 Service creation

The active form captures:

- Name.
- Price.
- Duration in minutes.

The tenant ID is added from the custom browser session.

Client-side validation checks only that the fields are non-empty. HTML number inputs provide basic browser-level input behavior.

The numbered migration models positive price and duration constraints, but the production snapshot does not.

### 10.3 Service display

Each service card displays:

- Name.
- Duration.
- Price.
- A fixed generic description.
- Edit icon.
- Delete icon.

The edit and delete icons have no action handlers.

### 10.4 Active status

The numbered migration contains an `active` field, but the frontend and production snapshot do not use it.

The current UI therefore has no represented ability to retire a service while preserving historical references.

### 10.5 Service-schema variants

The intended business meaning is inconsistent across schema artifacts:

| Source | Tenant-specific | Description | Active flag | Naming |
|---|---|---|---|---|
| Numbered migration | Yes | Yes | Yes | English |
| Manual snippet | No | No | No | Spanish |
| Production snapshot | No | No | No | Spanish |
| Frontend | Yes | No persisted description | No | Spanish |

---

## 11. Financial lifecycle

### 11.1 Revenue creation

The active application creates a gain when an appointment is charged.

The amount is copied from the appointment’s related service price at charge time.

The concept contains the service name and customer name.

The gain is attributed to:

- A barber.
- A barber shop.

The optional appointment relationship is not populated.

### 11.2 Revenue history

The finance page loads all gains for the current tenant.

It displays:

- Concept.
- First eight characters of the gain ID as a reference.
- Amount.

There is no explicit ordering in the query.

### 11.3 Revenue total

The total is computed by summing every loaded gain.

It has no date filter and therefore represents all retrieved tenant revenue rather than a selected accounting period.

The visible count represents the number of gain records and is labelled as charged services.

### 11.4 Financial concepts not represented

The repository does not distinguish:

- Gross versus net revenue.
- Cash versus card payments.
- Taxes.
- Discounts.
- Refunds.
- Voids.
- Tips.
- Barber commissions.
- Platform fees.
- Subscription fees.
- Payout status.
- Settlement date.
- Currency as a stored field.

The UI formats values using Chilean locale conventions and a `$` prefix.

### 11.5 Non-appointment gains

The schema comment describes `cita_id` as optional to allow product sales or other revenue.

No UI exists to create those movements directly. The finance page nevertheless counts every gain row as a charged service.

---

## 12. Public booking journey

### 12.1 Tenant discovery

The customer reaches a tenant-specific URL:

```text
/b/<slug>
```

The page queries `barberias.slug` and displays:

- Barber-shop name.
- Municipality.

The expected slug is not represented in the database definitions.

### 12.2 Service discovery

After resolving the barber shop, the page requests services filtered by its ID.

It displays service name and price.

The public page assumes services are tenant-owned, which conflicts with the production snapshot’s global service table.

### 12.3 Booking form

The customer supplies:

- Name.
- Service.
- Date.
- Time.

The date picker and time list use the same hard-coded behavior as the internal Agenda.

### 12.4 Booking submission

The browser inserts an appointment with:

- Customer name.
- Service ID.
- Date.
- Time.
- Tenant ID.
- Capitalized `Pendiente` state.

It does not supply a barber ID.

Both available appointment schemas require `barbero_id`, so the repository-visible contract cannot accept this payload unless the hosted database differs.

### 12.5 Availability and confirmation semantics

The customer sees every generated time slot regardless of:

- Existing appointments.
- Selected service duration.
- Barber availability.
- Barber count.
- Business hours.
- Holidays.
- Past dates or times.

The page displays success after the insert succeeds. There is no external confirmation, reminder, booking reference, or customer retrieval flow.

### 12.6 Public trust boundary

The public page performs direct anonymous reads and writes through the Supabase client.

No repository code represents:

- CAPTCHA.
- Rate limiting at the application layer.
- Booking verification.
- Customer identity verification.
- Abuse-prevention state.

---

## 13. Employee provisioning

Employee provisioning exists only as an unused service.

### 13.1 Represented flow

1. Receive the current administrator session.
2. Reject the request in client code if `rol !== 'admin'`.
3. Create Supabase Auth credentials through `signUp`.
4. Insert a `usuarios` profile.
5. Assign the administrator’s `barberia_id`.
6. Assign either `admin` or `barbero`.

### 13.2 Authorization semantics

Authorization is based on a caller-supplied browser object. No represented database policy verifies that the current Auth user is a tenant administrator.

### 13.3 Consistency semantics

Auth signup and profile creation are independent.

Possible represented partial state:

- Auth user exists.
- Application profile does not exist.
- User cannot obtain tenant metadata through the dormant Auth login flow.

### 13.4 Missing employee lifecycle

There is no active UI or workflow for:

- Listing employees.
- Editing roles.
- Removing an employee.
- Disabling an employee.
- Moving an employee between tenants.
- Accepting invitations.
- Resetting employee credentials.
- Managing barber schedules.

---

## 14. Local setup and demonstration data

### 14.1 Initial tenant setup

The local setup script:

1. Loads all barber shops.
2. Creates “Barbería Principal” in “Santiago Centro” if none exist.
3. Otherwise chooses the first returned barber shop.
4. Lists all Supabase Auth users.
5. Loads all public user IDs.
6. Inserts any missing users into `usuarios`.
7. Assigns every missing user to the selected tenant.
8. Assigns every missing user the `admin` role.

This is a local operational shortcut rather than a tenant onboarding workflow.

### 14.2 Dashboard seed data

The seed script:

1. Selects the first barber shop.
2. Selects the first user in that tenant.
3. Creates three appointments for the current date.
4. Creates three gain records.

Seed appointments use example customer names and fixed afternoon times.

Seed gains include concepts such as haircut, beard trim, and combined service.

The seeded gains are not linked to the seeded appointments through `cita_id`.

### 14.3 Manual table inspection

The check script selects and prints:

- All barber shops.
- All application users.

It uses the local anonymous key and has no assertions.

---

## 15. Encoded business rules

### 15.1 User rules

- A user has one UUID.
- Email is unique in the base schema.
- A user must belong to one barber shop.
- Role must be `admin` or `barbero`.
- The intended Auth profile uses the same UUID as Supabase Auth, but this is not enforced.

### 15.2 Service rules

Rules vary by schema source.

The numbered migration represents:

- Service belongs to one barber shop.
- Name is required.
- Duration must be positive.
- Price must be positive.
- Service name is unique within the tenant.
- Service is active by default.

The production snapshot represents only required name, price, duration, and creation time, without tenant ownership or positivity checks.

### 15.3 Appointment rules

- Customer name is required.
- Date is required.
- Time is required.
- Internal creation requires a service in the UI.
- Barber ID is required by available schemas.
- Barber-shop ID is required.
- Internal initial state is `pendiente`.
- Public initial state is `Pendiente`.
- Charging changes state to `completada`.
- Internal slot list runs from 08:00 to 20:00 in 30-minute increments.
- No represented database rule prevents duplicate times.
- No represented database rule restricts state values.

### 15.4 Gain rules

- Amount is required.
- Concept is required.
- Barber is required.
- Barber shop is required.
- Appointment is optional.
- Charging uses the related service price as the amount.
- No represented rule requires a positive amount.
- No represented rule limits one gain per appointment.

### 15.5 Dashboard rules

- “Today” is computed from a UTC ISO date.
- Today’s appointment count includes every matching appointment.
- Today’s revenue includes every gain created inside the computed timestamp range.
- Upcoming appointments include dates greater than or equal to today.
- Only five upcoming appointments are shown.
- Rating is constant.

### 15.6 Tenant rules

- Tenant IDs are explicitly passed to most read queries.
- Tenant IDs are supplied by browser state.
- No active represented RLS rule enforces tenant equality.
- Related foreign keys do not enforce common tenant ownership.

---

## 16. Business state models

### 16.1 Appointment state model

The active state flow is:

```text
Internal booking ──► pendiente ──► completada

Public booking ───► Pendiente

Any listed booking ──► hard deletion
```

The capitalization difference creates two textual pending values.

There is no encoded transition validation. Any client with write access can submit other state strings because the database uses unconstrained `VARCHAR` in the production snapshot.

### 16.2 Payment state model

There is no separate payment entity or payment status.

The application infers payment completion from:

- Appointment state `completada`.
- Presence of a gain insert performed immediately afterward.

Those two facts are not transactionally coupled and the gain does not store the appointment ID.

### 16.3 Service state model

The numbered migration supports active/inactive state, but the active application and production snapshot do not.

The visible application effectively treats every returned service as bookable.

### 16.4 User state model

There is no represented application status such as:

- Invited.
- Active.
- Suspended.
- Removed.

The only user classification is role.

### 16.5 Tenant state model

There is no represented tenant status, subscription status, activation state, or lifecycle stage.

---

## 17. Data ownership and business isolation

| Entity | Intended owner | How active UI derives ownership | Database-enforced tenant consistency represented? |
|---|---|---|---|
| User | Barber shop | `usuarios.barberia_id` | Foreign key to shop only |
| Service | Barber shop | Custom session or public shop lookup | Conflicting schemas; production snapshot has no tenant field |
| Appointment | Barber shop | Custom session or public shop lookup | Tenant FK exists, cross-entity tenant consistency absent |
| Gain | Barber shop | Custom session or appointment data | Tenant FK exists, cross-entity tenant consistency absent |

The active application relies on explicit query filters such as `.eq('barberia_id', barberiaId)`.

This creates a business-level assumption that the browser-supplied tenant ID is trustworthy. Under the represented grants and RLS state, that assumption is not enforced by the database.

The tenant UUID is also displayed partially in the dashboard badge, which treats it as an environment identifier.

---

## 18. Functional completeness matrix

| Business capability | Status represented by repository | Details |
|---|---|---|
| Staff login | Active but schema-incompatible | Direct user-table password lookup |
| Supabase Auth login | Dormant | Implemented in unused service |
| Logout | Active but state-conflicted | Clears storage only |
| Tenant-scoped dashboard | Active at UI/query level | Tenant ID from custom session |
| Daily appointment metric | Active | Counts all appointments for computed day |
| Daily revenue metric | Active | Sums gains for computed timestamp range |
| Rating metric | Presentation only | Constant `4.8` |
| Upcoming appointments | Active | Five rows, date-based filtering |
| Internal booking | Active at UI level | Uses logged-in user as barber |
| Public booking | Active UI, schema-incompatible | Missing required barber, missing slug schema |
| Availability checking | Not represented | All fixed slots shown |
| Appointment charging | Active | Two independent mutations |
| Appointment deletion | Active | Hard delete |
| Appointment cancellation | Not represented | No cancellation state or workflow |
| Appointment rescheduling | Not represented | No workflow |
| Service listing | Active, schema-dependent | Assumes tenant-owned Spanish-column service model |
| Service creation | Active, schema-dependent | Success loading state remains set |
| Service editing | Visual only | No handler |
| Service deletion | Visual only | No handler |
| Service activation | Not represented in UI | Only present in one migration model |
| Finance history | Active | Loads all tenant gains |
| Finance reporting periods | Not represented | No filtering |
| Employee registration | Dormant | Unused service only |
| Employee management | Not represented | No UI |
| Customer management | Not represented | Appointment stores name only |
| Notifications | Not represented | No email/SMS workflow |
| Tenant onboarding | Local script only | No production UI lifecycle |
| Subscription billing | Not represented | No plan/payment subsystem |
| Platform administration | Not represented | No cross-tenant operator UI |
| Audit trail | Not represented | Mutations have no actor history |
| Realtime updates | Not represented | No subscriptions despite UI wording |

---

## 19. Business-data and workflow inconsistencies

### 19.1 Login data mismatch

The active business journey requires `usuarios.password`, but no available database schema defines that attribute.

### 19.2 Public tenant discovery mismatch

The public journey requires `barberias.slug`, but no available database schema defines it.

### 19.3 Service ownership mismatch

The UI treats services as tenant-specific. The production snapshot models services as global records without `barberia_id`.

### 19.4 Service identity mismatch

One schema uses UUID service IDs; another uses bigint IDs. Appointments use a bigint foreign key in the production snapshot.

### 19.5 Public appointment mismatch

Public booking omits `barbero_id`, while both appointment schemas require it.

### 19.6 Appointment-state mismatch

Internal and public flows use different capitalization for pending state.

### 19.7 Charging relationship mismatch

The gain schema can link revenue to an appointment, but the active charging workflow omits the link.

### 19.8 Duplicate-slot mismatch

The UI expects a uniqueness error, but the schema does not represent a schedule uniqueness constraint.

### 19.9 Role-capability mismatch

The product stores distinct roles but exposes identical active capabilities to both roles.

### 19.10 Dashboard status mismatch

The upcoming list always displays “Pendiente” rather than the stored appointment state.

### 19.11 Finance-label mismatch

Finance counts all gain records as charged services, although the schema explicitly allows non-appointment gains.

### 19.12 “Real-time” wording mismatch

The Agenda subtitle says “en tiempo real,” but the page loads data on mount and after its own mutations only.

---

## 20. Operational and business risks

The following are as-is risk observations, not change proposals.

### 20.1 Tenant confidentiality risk

Tenant filtering depends on browser-supplied identifiers, while the repository does not represent active tenant-isolating RLS. This affects users, appointments, services, and financial data.

### 20.2 Credential handling risk

The active login performs direct password equality through a publicly accessible data API query. No password hashing behavior appears in the repository.

### 20.3 Identity mismatch risk

The custom session and a persisted Supabase Auth session can describe different users and tenants.

### 20.4 Revenue integrity risk

Appointment completion and gain insertion are not atomic. Business records can show a completed appointment with no revenue, or repeated revenue without a direct appointment relationship.

### 20.5 Scheduling integrity risk

No represented availability query or database uniqueness rule prevents overlapping bookings.

### 20.6 Public-booking operability risk

The public flow depends on missing schema fields and omits a required barber field.

### 20.7 Reporting accuracy risk

Dashboard query errors appear as zero values, and timezone-sensitive day boundaries can affect daily counts and revenue.

### 20.8 Authorization risk

The active UI does not distinguish administrator and barber capabilities. The dormant employee flow trusts a client-supplied role.

### 20.9 Data-reconstruction risk

The repository cannot recreate one proven database state. Business behavior may depend on undocumented hosted changes.

### 20.10 Historical-data risk

Appointments can be hard-deleted, services lack an effective active lifecycle, and no audit trail records who changed business data.

### 20.11 Scale and completeness risk

Agenda and finance retrieve all tenant records without pagination. The historical local API configuration caps responses at 1,000 rows.

### 20.12 Customer-service risk

Public appointments store only a customer name, leaving no represented contact channel for confirmation, reminders, or follow-up.

---

## 21. User-experience observations

### 21.1 Staff experience

- Navigation is simple and route-oriented.
- Dashboard metrics are immediately visible.
- Agenda combines booking and daily control in one screen.
- Charging and deletion use explicit confirmations.
- Most errors use browser alerts.
- Database failures can appear as empty data on some screens.
- The service form remains in a saving state after successful creation.
- Service edit/delete controls appear actionable but are not.
- Small-screen navigation hides dashboard route links.

### 21.2 Public-customer experience

- Tenant branding is limited to barber-shop name and municipality.
- Booking requires only four fields and no account.
- The custom calendar and time picker present a focused booking form.
- The page does not communicate actual availability.
- The page does not provide a booking reference.
- The page does not collect a contact channel.
- Success exists only in the current browser session.

### 21.3 Accessibility observations

- Custom dropdown options use clickable non-button elements.
- Several controls depend primarily on pointer interaction.
- Some icon-only actions lack accessible names.
- Mobile route navigation is absent from the active layout.

---

## 22. Business terminology

| Term | Meaning in this repository |
|---|---|
| `barberia` | Tenant barber shop |
| `barberia_id` | Shared-schema tenant discriminator |
| `usuario` | Barber-shop staff profile; intended to correspond to Supabase Auth user |
| `admin` | Staff role intended to represent tenant administration |
| `barbero` | Barber staff role and appointment/revenue attribution target |
| `servicio` | Bookable offering with name, price, and duration |
| `cita` | Appointment for a named customer, date, time, barber, service, and tenant |
| `ganancia` | Revenue movement attributed to a barber and tenant |
| `pendiente` | Internal initial appointment state |
| `Pendiente` | Public booking’s differently capitalized initial state |
| `completada` | State assigned when the appointment is charged |
| `tenant_session` | Custom browser-stored identity, role, and tenant object |
| `slug` | Public barber-shop URL identifier expected by the UI but absent from schema artifacts |
| “Ingresos del Día” | Sum of tenant gains created inside the computed day range |
| “Citas hoy” | Count of all tenant appointments whose date equals today |
| “Cita Próxima” | First appointment returned with date greater than or equal to today |
| “Servicios Cobrados” | Count of all loaded gain rows, regardless of appointment relationship |

---

## 23. Current business baseline

The business system currently encoded by the repository is a tenant-oriented barbershop operations prototype centered on four workflows:

1. Staff enter a dashboard using a custom local session.
2. Staff manage appointments and mark them as charged.
3. Staff maintain and display a service catalogue.
4. Public customers submit bookings through tenant-specific URLs.

The business data model expresses the core concepts needed for those workflows—barber shops, users, services, appointments, and gains—but its implementations are inconsistent across SQL sources. The application assumes a database contract that is not fully represented anywhere in the repository.

Tenant ownership is visible throughout the domain and most queries, but it is carried and trusted at the browser level. Roles exist as data but do not create different active business capabilities. Appointment completion is treated as the trigger for revenue creation, although the two records are not transactionally or relationally coupled by the active workflow.

The current dashboard provides operational indicators rather than accounting-grade or analytics-grade reporting. The public page provides low-friction booking rather than a complete availability, confirmation, or customer-management workflow. Local scripts supply developer setup and sample data rather than a production tenant onboarding process.

The dominant business-level characteristics are:

- Clear barber-shop operational intent.
- Shared-schema tenant identity throughout the domain.
- Minimal staff and customer journeys.
- A direct relationship between appointment service price and recorded gain.
- No effective distinction between administrator and barber capabilities.
- No complete appointment availability model.
- No durable customer identity or contact model.
- No commercial SaaS billing or tenant lifecycle.
- Incompatible database contracts for login, public booking, and services.
- Business-critical security and integrity assumptions delegated to a database configuration that is not reproducibly represented.

This document records the current as-is business baseline for future maintainers.
