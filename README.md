# Concorde Events

Digital rental catalogue and luxury event furniture management platform built with Next.js 15, TypeScript, Tailwind CSS, Framer Motion, and Supabase.

## Features

- **Luxury Catalogue & Interactive Showcase**: Curated event inventory with dynamic previews and smooth animations.
- **Availability Calendar**: Real-time date and inventory status tracking.
- **Role-Based Workflows**: Tailored interfaces for clients, planners, and administrators.
- **WhatsApp & PDF Quotation Engine**: Fast quotation generation and sharing.
- **Supabase Integration**: PostgreSQL database with real-time updates and Row Level Security (RLS).

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Framer Motion, GSAP
- **Database / Auth**: Supabase (@supabase/supabase-js)
- **Deployment**: Vercel

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.
