# CONCORDE EVENTS — PLATFORM SPECIFICATION & ARCHITECTURE

## 1. System Architecture
Concorde Events is an enterprise-grade digital rental catalogue and event furniture management platform engineered with Next.js 15 App Router, TypeScript, Tailwind CSS, Framer Motion, and Supabase PostgreSQL.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|  +-----------------------------------------------------------------------------+  |
|  | Modern Responsive Web UI (Next.js 15 App Router / Framer Motion / UI UX Pro)  |  |
|  | - Luxury Catalogue & Quick Preview Modal                                   |  |
|  | - Airbnb-Style Daily Inventory Availability Calendar                         |  |
|  | - Role-Based Responsive Dashboards (Customer / Pro / Admin / Manager)      |  |
|  | - Floating Tinted Glass macOS Dock Navigation & Fluid Menu                  |  |
|  | - Direct WhatsApp Quotation Generator & PDF Download Engine                 |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                                APPLICATION LAYER                                  |
|  +-----------------------+ +-----------------------+ +-------------------------+  |
|  |   Server Actions &    | |  Middleware & Route   | |   State Management &    |  |
|  |    API Controllers    | |   Protection Engine   | |   Mock/Live Context     |  |
|  +-----------------------+ +-----------------------+ +-------------------------+  |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                                 DATA & PERSISTENCE                                |
|  +---------------------------------------+ +-----------------------------------+  |
|  |  Supabase Client & Edge Integration   | | PostgreSQL Schema with RLS        |  |
|  |  (Tables, Views, RPC, Triggers)       | | (Users, Inventory, Rentals, etc)|  |
|  +---------------------------------------+ +-----------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Directory & Folder Structure

```
c:\Users\CEO\Desktop\Concorde Events\
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   │   ├── inventory/
│   │   │   │   ├── users/
│   │   │   │   ├── requests/
│   │   │   │   ├── analytics/
│   │   │   │   ├── rewards/
│   │   │   │   └── cms/
│   │   │   ├── professional/
│   │   │   │   ├── calculator/
│   │   │   │   ├── quotations/
│   │   │   │   ├── history/
│   │   │   │   └── rewards/
│   │   │   ├── customer/
│   │   │   │   ├── requests/
│   │   │   │   └── favorites/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (marketing)/
│   │   ├── catalogue/
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── export-quotation/
│   │   │   └── route.ts
│   │   └── whatsapp/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── loading.tsx
│   └── not-found.tsx
├── components/
│   ├── ui/
│   │   ├── container-scroll-animation.tsx
│   │   ├── fluid-menu.tsx
│   │   ├── dock.tsx
│   │   ├── calendar.tsx
│   │   ├── button.tsx
│   │   ├── modal.tsx
│   │   ├── badge.tsx
│   │   └── card.tsx
│   ├── navigation/
│   │   ├── navbar.tsx
│   │   ├── floating-dock.tsx
│   │   └── footer.tsx
│   ├── catalogue/
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   ├── product-filters.tsx
│   │   ├── quick-preview-modal.tsx
│   │   └── availability-calendar.tsx
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── stats-card.tsx
│   │   ├── inventory-table.tsx
│   │   ├── requests-table.tsx
│   │   ├── user-approvals-table.tsx
│   │   └── analytics-charts.tsx
│   ├── professional/
│   │   ├── rental-calculator.tsx
│   │   ├── quotation-builder.tsx
│   │   └── reward-progress.tsx
│   └── providers/
│       ├── auth-provider.tsx
│       ├── theme-provider.tsx
│       └── app-provider.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── schema.sql
│   ├── data/
│   │   ├── mock-db.ts
│   │   └── sample-furniture.ts
│   ├── utils/
│   │   ├── availability.ts
│   │   ├── formatters.ts
│   │   ├── whatsapp.ts
│   │   └── pdf.ts
│   ├── validators/
│   │   ├── auth.ts
│   │   ├── furniture.ts
│   │   └── rental-request.ts
│   └── types/
│       └── index.ts
├── public/
│   └── assets/
└── middleware.ts
```

---

## 3. PostgreSQL Database Schema

```sql
-- ENUMS
CREATE TYPE user_role AS ENUM ('visitor', 'customer', 'professional', 'editor', 'manager', 'admin', 'super_admin');
CREATE TYPE account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE request_status AS ENUM ('submitted', 'under_review', 'validated', 'confirmed', 'completed', 'cancelled');
CREATE TYPE pro_tier AS ENUM ('bronze', 'silver', 'gold', 'diamond', 'elite');

-- USERS & PROFILES TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  company_name TEXT,
  phone_number TEXT NOT NULL,
  vat_number TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  status account_status NOT NULL DEFAULT 'pending',
  reward_points INTEGER DEFAULT 0,
  pro_tier pro_tier DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CATEGORIES TABLE
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FURNITURE INVENTORY TABLE
CREATE TABLE furniture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  dimensions JSONB NOT NULL, -- { width: 120, height: 80, depth: 60, unit: "cm" }
  color TEXT NOT NULL,
  material TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  rental_price NUMERIC(10, 2) NOT NULL, -- Visible only to Pro / Admin
  professional_price NUMERIC(10, 2) NOT NULL, -- Pro tier discount price
  quantity_owned INTEGER NOT NULL DEFAULT 1,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  minimum_rental_days INTEGER NOT NULL DEFAULT 1,
  featured BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active', -- active, maintenance, retired
  images TEXT[] NOT NULL DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DAILY INVENTORY AVAILABILITY OVERRIDES
CREATE TABLE daily_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  furniture_id UUID NOT NULL REFERENCES furniture(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  quantity_booked INTEGER NOT NULL DEFAULT 0,
  quantity_blocked INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE(furniture_id, date)
);

-- RENTAL REQUESTS TABLE
CREATE TABLE rental_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  company_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  status request_status NOT NULL DEFAULT 'submitted',
  items JSONB NOT NULL, -- Array of { furniture_id, quantity, unit_price }
  estimated_subtotal NUMERIC(10, 2) DEFAULT 0.00,
  notes TEXT,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REWARDS & BADGES
CREATE TABLE reward_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SITE CMS SETTINGS
CREATE TABLE cms_content (
  id TEXT PRIMARY KEY, -- 'homepage', 'faq', 'testimonials'
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Entity Relationship Diagram (Text Schema)

```
[ PROFILES ]
    | 1
    | 
    +---> < RENTAL_REQUESTS > (1:N) --- contains JSONB ---> [ FURNITURE ]
    | 
    +---> < REWARD_LOGS > (1:N)
    | 
    +---> < AUDIT_LOGS > (1:N)

[ CATEGORIES ]
    | 1
    | N
[ FURNITURE ] <1---N> [ DAILY_AVAILABILITY ]

[ CMS_CONTENT ] (Standalone Config)
```

---

## 5. User Flows

### Visitor Flow
1. Landing Page -> High impact visual showcase -> Catalogue.
2. Filter/Search items by Category, Material, Color, Dates.
3. Open Item Detail or Quick Preview Modal -> Select Dates -> Airbnb Availability Calendar checks daily inventory.
4. Add to Rental Request Draft -> Click "Request Quotation".
5. Enter Contact details -> Redirected to WhatsApp with formatted prefilled text OR prompted to register/login.

### Professional User Flow
1. Login with credentials -> System validates account status = `approved` & role = `professional`.
2. Access Professional Portal: view wholesale prices, Pro tier discount badge (e.g. Gold Tier - 15% off).
3. Rental Calculator: Batch select multiple furniture items, calculate event duration & multi-item availability.
4. Generate & Download formal PDF Quotation instantly.
5. Track earned reward points and progress towards next tier (e.g., Gold to Diamond).

### Admin / Manager Flow
1. Login -> System validates role (`admin`, `manager`, `super_admin`).
2. Dashboard Overview: Metrics (Today rented, expected returns, total available, revenue forecast).
3. User Approval Queue: Review pending Pro/Customer registrations -> Approve/Reject with 1-click.
4. Inventory Management: Add/edit furniture items, daily stock overrides, maintenance blocks.
5. CMS Management: Live update Homepage hero text, testimonials, featured items without deployment.

---

## 6. State Management & Hybrid Fallback Strategy
- **Zustand / React Context**: Unified local application state for:
  - Active Rental Basket (items, quantities, selected date ranges).
  - Selected User Role Switcher for instant sandbox live testing across all 7 user roles!
  - Theme (Dark/Light luxury aesthetic).
- **Hybrid Data Layer**:
  - Primary: Real Supabase API calls when env credentials are provided.
  - Fallback: Pre-hydrated, rich, mock repository initialized with luxury event furniture, live daily availability calculations, and sample user profiles so the app works 100% out of the box anywhere.

---

## 7. Authentication & Security Strategy
- **Supabase Auth / JWT Validation**: Role and Account Status enforced on API Server Actions and Middleware.
- **Pending Account Lockout**: Middleware automatically traps users whose status is `pending` or `rejected` or `suspended` and displays the "Account Awaiting Approval" screen.
- **Row Level Security (RLS)**:
  - Furniture `rental_price` and `professional_price` columns scrubbed from customer API responses.
  - Rental request write policies strictly check valid email/phone or authenticated session.
- **Input Sanitization & Protection**: Zod schema validation on all inputs, XSS header protection, SQL injection prevention via parameterized query builders.

---

## 8. Deployment & Performance Optimization Plan
- **Vercel Zero-Config Deployment**: Optimized build pipeline using Next.js 15 App Router.
- **Performance**:
  - Next/Image optimization for high-resolution furniture imagery.
  - Lazy loading for quick-preview modals and calendar popovers.
  - Dynamic route segment config (`export const dynamic = 'force-dynamic'`).
- **SEO & Metadata**: Dynamic OpenGraph images, structured Schema.org `Product` JSON-LD data, `sitemap.ts`, `robots.ts`.

---

## 9. Implementation Roadmap
- **Phase 1**: Project Initialization & Base Architecture (Next.js 15, Tailwind, Animations, UI UX Pro Max styling).
- **Phase 2**: UI Components Integration (`container-scroll-animation`, `fluid-menu`, `dock`, `availability-calendar`).
- **Phase 3**: Core Catalogue & Luxury Product Detail pages with Airbnb-style Daily Availability calendar.
- **Phase 4**: Rental Request Workflow & Automated WhatsApp Generator & PDF Export Engine.
- **Phase 5**: Multi-Role Authentication System & Approval Gatekeepers.
- **Phase 6**: Professional Portal (Rental Calculator, Wholesale Prices, Reward System & Ranking).
- **Phase 7**: Comprehensive Admin Panel & CMS Management.
- **Phase 8**: Full End-to-End Verification & Vercel Build Validation.
