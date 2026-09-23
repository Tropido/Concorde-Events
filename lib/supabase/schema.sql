-- CONCORDE EVENTS — SUPABASE POSTGRESQL DATABASE SCHEMA

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('visitor', 'customer', 'professional', 'editor', 'manager', 'admin', 'super_admin');
CREATE TYPE account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE request_status AS ENUM ('submitted', 'under_review', 'validated', 'confirmed', 'completed', 'cancelled');
CREATE TYPE pro_tier AS ENUM ('bronze', 'silver', 'gold', 'diamond', 'elite');

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
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

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.furniture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  dimensions JSONB NOT NULL,
  color TEXT NOT NULL,
  material TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  rental_price NUMERIC(10, 2) NOT NULL,
  professional_price NUMERIC(10, 2) NOT NULL,
  quantity_owned INTEGER NOT NULL DEFAULT 1,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  minimum_rental_days INTEGER NOT NULL DEFAULT 1,
  featured BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  images TEXT[] NOT NULL DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  furniture_id UUID NOT NULL REFERENCES public.furniture(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  quantity_booked INTEGER NOT NULL DEFAULT 0,
  quantity_blocked INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  CONSTRAINT unique_furniture_date UNIQUE(furniture_id, date)
);

CREATE TABLE IF NOT EXISTS public.rental_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  company_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  status request_status NOT NULL DEFAULT 'submitted',
  items JSONB NOT NULL,
  estimated_subtotal NUMERIC(10, 2) DEFAULT 0.00,
  notes TEXT,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cms_content (
  id TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.furniture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_availability ENABLE ROW LEVEL SECURITY;

-- Furniture Read Policy: Everyone can read basic info, but price visibility is filtered in application/views
CREATE POLICY "Public furniture read" ON public.furniture FOR SELECT USING (true);
CREATE POLICY "Public categories read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public availability read" ON public.daily_availability FOR SELECT USING (true);

-- User Profiles: Users read own profile; Admin/Manager read all
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager')
  )
);

-- Rental Requests: Created by anyone (visitor/customer/pro), read by owner or admins
CREATE POLICY "Public insert requests" ON public.rental_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users read own requests" ON public.rental_requests FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager')
  )
);
