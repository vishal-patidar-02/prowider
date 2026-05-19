# Prowider Frontend Context Window (Comprehensive)

Complete descriptive documentation of all frontend code, routing, styling, components, state management, and UX flows in the Prowider project.

---

## 1) Frontend Architecture Overview

The Prowider frontend is built on **Next.js 16 App Router** with:
- TypeScript for type safety
- React 19 for component logic
- Tailwind CSS v4 for styling
- No external state management (React hooks + local component state)
- SSE (Server-Sent Events) for real-time updates
- Server components where data-fetching is needed

---

## 2) File Structure and Purpose

```
app/
├── layout.tsx                 # Root layout with Navigation
├── page.tsx                   # Home/landing page
├── globals.css                # Global styles + design tokens
├── favicon.ico
├── components/
│   └── navigation.tsx         # Sticky top nav bar with links + badge
├── request-service/
│   ├── page.tsx              # Service request form server wrapper
  └── lead-request-form.tsx  # Lead form client component
├── dashboard/
│   └── page.tsx              # Live provider dashboard with SSE
└── test-tools/
    └── page.tsx              # QA tools for testing allocation/webhook
```

---

## 3) Root Layout (`app/layout.tsx`)

### Purpose
Root layout that wraps all pages with metadata and global styling.

### Key exports
- Metadata: sets title to "Prowider", description to "Smart leads. Right providers."
- RootLayout component:
  - Imports Google fonts (`Inter`, `Geist Mono`)
  - Wraps children with Navigation component
  - Applies font CSS variables to `<html>` tag
  - Sets `antialiased` class for font rendering

### Fonts
- `Inter` (variable: `--font-inter`) - primary sans-serif
- `Geist Mono` (variable: `--font-geist-mono`) - monospace for code/logs

---

## 4) Global Styles (`app/globals.css`)

### Design Token System
Custom CSS variables defined in `:root`:
- `--brand-primary`: `#0f4c81` (dark blue)
- `--brand-accent`: `#f97316` (orange)
- `--brand-success`: `#16a34a` (green)
- `--brand-warning`: `#d97706` (amber)
- `--brand-danger`: `#dc2626` (red)
- `--brand-surface`: `#f8fafc` (light gray background)
- `--brand-card`: `#ffffff` (white)
- `--brand-border`: `#e2e8f0` (light border)
- `--brand-text`: `#1e293b` (dark text)
- `--brand-muted`: `#64748b` (gray text)

Theme variables alias the above for Tailwind integration.

### Utility Classes
- `.card` - white background, border, border-radius, subtle shadow
- `.surface` - light gray background (for page backgrounds)
- `.muted-text` - applies `--brand-muted` color
- `.input-base` - form input styling (border, focus states, padding)
- `.button-primary` - blue background, white text
- `.button-accent` - orange background, white text
- `.button-outline` - transparent with blue border
- `.badge-pill` - inline badge with flex, gap, rounded-full, padding

### Animations
- `.skeleton` - shimmer animation for loading states (background gradient sweep)
- `.live-pulse` - pulse animation for "live" indicators (scale + opacity cycle)

### Base Styles
- `html`, `body` background and color set from theme vars
- Typography: font inheritance, heading weights
- Button reset: removes default border, sets cursor, adds border-radius, smooth transition
- Focus-visible outlines for accessibility (2px solid `--brand-primary`)
- Text rendering optimizations (antialiasing, font smoothing)

---

## 5) Navigation Component (`app/components/navigation.tsx`)

### Type
**Client component** (uses "use client")

### Purpose
Persistent sticky header with brand logo and navigation links.

### Visual Structure
- Fixed at top, `z-50`, sticky positioning
- Left: Prowider brand logo + name + tagline
- Center: Navigation links
- Height: 64px (16 units)

### Navigation Items (Hard-coded)
```typescript
[
  { href: "/request-service", label: "Request Service", icon: DocumentIcon, badge: undefined },
  { href: "/dashboard", label: "Live Dashboard", icon: GridIcon, badge: undefined },
  { href: "/test-tools", label: "Test Tools", icon: FlaskIcon, badge: "QA" }
]
```

---

## 6) Home Page (`app/page.tsx`)

### Type
**Server component** (no "use client")

### Purpose
Landing page introducing the platform and calling users to action.

### Content Structure
1. Hero section (max-width 600px)
   - Badge: "Lead Distribution Platform"
   - H1: "Connect customers to the right service provider — instantly."
   - Subtext: value proposition
   - Two CTAs:
     - Primary button → `/request-service`
     - Outline button → `/dashboard`

---

## 7) Request Service Page (`app/request-service/page.tsx`)

### Type
**Server component** that fetches services

### Props
None (routes to `RequestServicePage()`)

### Server-side Logic
- Marks route as `force-dynamic` (disables caching)
- Fetches services from DB using `runWithPrismaRetry()`:
  ```typescript
  const services = await runWithPrismaRetry(() =>
    prisma.service.findMany({ orderBy: { id: "asc" } })
  );
  ```

---

## 8) Lead Request Form (`app/request-service/lead-request-form.tsx`)

### Type
**Client component** (uses "use client")

### Props
```typescript
{
  services: Array<{ id: number; name: string }>
}
```

---

## 9) Dashboard Page (`app/dashboard/page.tsx`)
