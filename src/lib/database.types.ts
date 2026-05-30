// Types matching the unified production schema on trnsuruvwdzfrhfaboxe
// These are application-level types; the supabase client uses `any` for flexibility
// since the auto-generated types come from the Lovable Cloud project.

export type BookingStatus = "pending" | "confirmed" | "accepted" | "completed" | "cancelled" | "rejected" | "rescheduled" | "no_show";
export type DeliveryMode = "at_shop" | "at_home" | "online";
export type UserRole = "customer" | "provider" | "admin";
export type DocumentType = "nin" | "cac" | "business_permit" | "other";
export type DocumentStatus = "pending" | "approved" | "rejected";
export type NotificationType = "booking_accepted" | "booking_rejected" | "booking_completed" | "booking_rescheduled" | "booking_reminder" | "new_message" | "new_booking" | "info" | "new_review" | "promotion";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  gender: string | null;
  date_of_birth: string | null;
  business_name: string | null;
  business_description: string | null;
  business_registration_number: string | null;
  tax_id: string | null;
  owner_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  subcategories: string[] | null;
  cover_image_url: string | null;
  business_logo_url: string | null;
  average_rating: number;
  review_count: number;
  total_bookings: number;
  is_verified: boolean;
  is_featured: boolean;
  is_active: boolean;
  verification_date: string | null;
  business_hours: Record<string, any>;
  bio: string | null;
  website: string | null;
  social_links: Record<string, any>;
  fcm_token: string | null;
  notification_preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  username: string | null;
  is_promoted: boolean;
  cover_photo_url: string | null;
  rating: number;
}

export interface Service {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  price: number;
  currency: string;
  duration_minutes: number;
  is_active: boolean;
  is_featured: boolean;
  delivery_modes: DeliveryMode[];
  created_at: string;
  updated_at: string;
  user_id: string | null;
  duration: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  status: BookingStatus;
  delivery_mode: DeliveryMode;
  booking_date: string;
  booking_time: string;
  service_price: number;
  discount_amount: number;
  total_price: number;
  currency: string;
  notes: string | null;
  customer_location: string | null;
  completed_at: string | null;
  cancellation_reason: string | null;
  cancelled_by_role: UserRole | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  booking_time_text: string | null;
  business_user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_name: string | null;
  price: number | null;
}

export interface Client {
  id: string;
  business_user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_bookings: number;
  last_booking_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  body: string;
  related_booking_id: string | null;
  related_provider_id: string | null;
  data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  message: string | null;
}

export interface Promotion {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  service_id: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export interface GalleryPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface FcmToken {
  id: string;
  user_id: string;
  token: string;
  platform: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  profile_id: string;
  document_type: DocumentType;
  document_number: string;
  document_url: string;
  status: DocumentStatus;
  verification_date: string | null;
  verification_notes: string | null;
  verified_by_admin: string | null;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  provider_id: string;
  created_at: string;
}
