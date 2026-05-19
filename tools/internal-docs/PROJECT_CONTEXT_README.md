# Prowider Project Context Window (Temporary)

This file is a complete, descriptive context window for the current project state in this workspace. It is designed to be pasted into AI tools or shared with collaborators for fast onboarding.

---

## 1) Project Identity

- Project name: `prowider`
- Type: Full-stack Next.js app (App Router) with API routes and PostgreSQL persistence through Prisma.
- Primary purpose: Lead distribution platform that accepts customer service requests and assigns each lead to providers using deterministic business rules, quota controls, and concurrency-safe allocation.
- Current UX surfaces:
  - Public home page
  - Service request flow
  - Real-time operations dashboard
  - QA/Test tools page

---

## 2) Tech Stack and Runtime

### Core stack
- Next.js: `16.2.6`
- React: `19.2.4`
- TypeScript: `6.0.3`
- Prisma ORM: `7.8.0`
- PostgreSQL driver: `pg` with `@prisma/adapter-pg`
- Styling: Tailwind CSS v4 + custom CSS variables in `app/globals.css`

### Notable tooling
- ESLint configured via `eslint.config.mjs` (Next core-web-vitals rules).
- `tsx` used for seed/scripts.
- Prisma config in `prisma.config.ts`.

### NPM scripts (from `package.json`)
- `npm run dev` -> start Next dev server
- `npm run build` -> production build
- `npm run start` -> run production server
- `npm run lint` -> lint project
- `npm run prisma:generate` -> generate Prisma client
- `npm run db:seed` -> seed database

---

## 3) Directory Map and Purpose

- `app/`
  - UI routes + API routes (App Router)
  - `app/page.tsx`: Home/landing page
  - `app/request-service/`: customer lead submission flow
  - `app/dashboard/`: live provider operations dashboard
  - `app/test-tools/`: QA panel for reset, idempotency, concurrency tests
  - `app/api/`: server routes
- `lib/`
  - Shared server logic (Prisma client, retry helper, allocator, event bus)
- `prisma/`
  - Prisma schema and seed
- `scripts/`
  - Manual diagnostic and verification scripts
- root config files:
  - `next.config.mjs`, `tsconfig.json`, `eslint.config.mjs`, `prisma.config.ts`

---

## 4) Database Model (Prisma Schema)

### `Service`
- Fields: `id`, `name`, `createdAt`
- Relations:
  - one-to-many with `Lead`
  - one-to-one with `AllocationState`

### `Provider`
- Fields: `id`, `name`, `monthlyQuota`, `leadsReceivedThisMonth`, `createdAt`
- Relations:
  - one-to-many with `LeadAssignment`

### `Lead`
- Fields: `id`, `customerName`, `phone`, `city`, `description`, `serviceId`, `createdAt`
- Relations:
  - many-to-one with `Service`
  - one-to-many with `LeadAssignment`
- Constraint:
  - `@@unique([phone, serviceId])` to prevent duplicate requests for the same service by same phone.

### `LeadAssignment`
- Fields: `id`, `leadId`, `providerId`, `assignedAt`
- Relations:
  - many-to-one `Lead`
  - many-to-one `Provider`
- Constraint:
  - `@@unique([leadId, providerId])` to prevent duplicate assignment rows for the same lead/provider pair.

### `AllocationState`
- Fields: `id`, `serviceId`, `lastAssignedIndex`
- Purpose: Stores round-robin pointer per service for pool allocation.
- Constraint: `serviceId` is unique.

### `WebhookEvent`
- Fields: `id`, `eventId`, `processedAt`
- Purpose: idempotency ledger for reset webhook.
- Constraint: unique `eventId`.

---

## 5) Core Business Logic

## 5.1 Lead creation and assignment flow
1. Client submits request from request form (`/request-service`).
2. `POST /api/leads` validates required fields and service existence.
3. Lead row is inserted.
4. Allocation engine `assignProviders(leadId, serviceId)` runs in DB transaction.
5. Assigned providers are returned in response (HTTP 201).
6. Event `lead-assigned` emitted for real-time dashboard refresh.

## 5.2 Allocation rules (`lib/allocate.ts`)
Hard-coded service configs:
- Service 1:
  - mandatory: provider `[1]`
  - pool: `[2,3,4]`
- Service 2:
  - mandatory: provider `[5]`
  - pool: `[6,7,8]`
- Service 3:
  - mandatory: providers `[1,4]`
  - pool: `[2,3,5,6,7,8]`

Algorithm highlights:
- Locks `AllocationState` row with `FOR UPDATE` inside transaction.
- Reads eligible provider snapshots and in-memory usage map seeded from `provider.leadsReceivedThisMonth`.
- Tries mandatory providers first.
- Fills remaining slots from round-robin pool using `lastAssignedIndex`.
- Enforces quota atomically using guarded `updateMany` condition:
  - only increments if `leadsReceivedThisMonth < monthlyQuota`.
- Writes `LeadAssignment` rows for selected providers.
- Updates `AllocationState.lastAssignedIndex` based on pool picks.

Behavioral note:
- Target is exactly 3 assignments per lead when capacity exists.
- Fewer than 3 can occur if pool/mandatory candidates are exhausted by quota limits.

## 5.3 Quota reset webhook (`/api/webhook/reset-quota`)
Input:
- `eventId` (string)
- `providerId` (integer)

Flow:
1. Validate request body.
2. Transaction start.
3. If `eventId` already exists in `WebhookEvent` -> return `already processed` (HTTP 200).
4. Verify provider exists.
5. Delete provider assignments older than 1 month (`assignedAt < oneMonthAgo`).
6. Reset `provider.leadsReceivedThisMonth = 0`.
7. Insert `WebhookEvent` record for dedupe.
8. Commit and emit `quota-reset` event.

Idempotency model:
- `WebhookEvent.eventId` unique constraint + pre-check handles retries.

---

## 6) API Endpoints (Current)

### `POST /api/leads`
- File: `app/api/leads/route.ts`
- Creates lead + attempts provider assignment.
- Returns 201 with lead payload and `assignedProviders`.
- Returns 409 for Prisma P2002 duplicate key (`phone+serviceId`).
- Returns 400 for invalid input/service.

### `GET /api/providers`
- File: `app/api/providers/route.ts`
- Returns provider IDs + names for selector UIs.

### `GET /api/dashboard`
- File: `app/api/dashboard/route.ts`
- Returns per-provider dashboard payload:
  - quota totals/used/remaining
  - current-month assigned leads with service details
- Uses `provider.leadsReceivedThisMonth` as quota used source.

### `GET /api/dashboard/stream`
- File: `app/api/dashboard/stream/route.ts`
- SSE endpoint for near-real-time dashboard updates.
- Sends initial snapshot + heartbeat comments + periodic refresh.
- Reacts immediately to in-process event bus events:
  - `lead-assigned`
  - `quota-reset`

### `POST /api/webhook/reset-quota`
- File: `app/api/webhook/reset-quota/route.ts`
- Idempotent reset handler for provider monthly counters.

---

## 7) Frontend Surfaces

### Home page (`app/page.tsx`)
- Marketing-style intro and CTA links to request flow and dashboard.
