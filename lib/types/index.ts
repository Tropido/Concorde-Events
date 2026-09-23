export type UserRole =
  | "visitor"
  | "customer"
  | "professional"
  | "editor"
  | "manager"
  | "admin"
  | "super_admin";

export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";

export type ProTier = "bronze" | "silver" | "gold" | "diamond" | "elite";

export type RequestStatus =
  | "submitted"
  | "under_review"
  | "validated"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected"
  | "reprogramed";

export type ItemCondition = "perfect" | "good" | "bad" | "broken";

export type Country = "FR" | "TN";
export type Currency = "EUR" | "TND";

export type UserLevel =
  | "Bronze"
  | "Argent"
  | "Or"
  | "Platine"
  | "Diamant"
  | "Royal Elite";

export type UserFlag =
  | "VIP"
  | "Paiement Fiable"
  | "À Surveiller"
  | "Nouveau Partenaire"
  | "Grand Compte"
  | "Litige Résolu";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  phone_number: string;
  vat_number?: string;
  role: UserRole;
  status: AccountStatus;
  reward_points: number;
  pro_tier: ProTier;
  level?: UserLevel;
  benefits?: string[];
  flags?: UserFlag[];
  admin_notes?: string;
  country?: Country;
  created_at: string;
  updated_at: string;
}

export interface MessageReply {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  content: string;
  created_at: string;
}

export interface UserMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  content: string;
  category: "feedback" | "note" | "experience" | "quote_help" | "other";
  rating?: number;
  status: "unread" | "in_review" | "resolved";
  country: Country;
  created_at: string;
  replies: MessageReply[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  display_order: number;
  item_count?: number;
}

export interface FurnitureDimensions {
  width: number;
  height: number;
  depth: number;
  unit: "cm" | "m" | "in";
}

export interface FurnitureItem {
  id: string;
  category_id: string;
  category_name?: string;
  title: string;
  slug: string;
  description: string;
  dimensions: FurnitureDimensions;
  color: string;
  material: string;
  tags: string[];
  rental_price: number; // Wholesale/Base daily rate (EUR default)
  professional_price: number; // Discounted pro daily rate (EUR default)
  rental_price_tnd?: number; // Daily rate in Tunisian Dinars (DT)
  professional_price_tnd?: number; // Pro rate in Tunisian Dinars (DT)
  quantity_owned: number;
  quantity_reserved: number;
  minimum_rental_days: number;
  featured: boolean;
  status: "active" | "maintenance" | "retired";
  images: string[];
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyAvailability {
  id: string;
  furniture_id: string;
  date: string; // YYYY-MM-DD
  quantity_booked: number;
  quantity_blocked: number;
  notes?: string;
}

export interface RequestItem {
  furniture_id: string;
  title: string;
  slug: string;
  image: string;
  quantity: number;
  rental_price: number;
  professional_price: number;
  rental_price_tnd?: number;
  professional_price_tnd?: number;
  startDate: string;
  endDate: string;
  totalDays: number;
}

export interface RentalRequest {
  id: string;
  reference_code: string;
  user_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name?: string;
  country?: Country;
  currency?: Currency;
  start_date: string;
  end_date: string;
  total_days: number;
  status: RequestStatus;
  items: RequestItem[];
  estimated_subtotal: number;
  notes?: string;
  whatsapp_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveRentedItem {
  id: string;
  furniture_id: string;
  title: string;
  customer_name: string;
  company_name?: string;
  quantity: number;
  start_date: string;
  end_date: string;
  status: "active_rented" | "expected_return" | "inspection" | "returned";
  condition: ItemCondition;
  notes?: string;
}

export interface RewardLog {
  id: string;
  user_id: string;
  points_earned: number;
  reason: string;
  created_at: string;
}

export interface CMSContent {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    heroImage: string;
    stats: { label: string; value: string }[];
  };
  whyChooseUs: {
    title: string;
    description: string;
    features: { icon: string; title: string; text: string }[];
  };
  testimonials: {
    id: string;
    name: string;
    role: string;
    company: string;
    comment: string;
    avatar: string;
    rating: number;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}
