// Hand-written mirrors of the backend Pydantic models — keep both sides in sync.

export interface User {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  role: "customer" | "admin";
  created_at: string;
}

export interface ConcertCategory {
  key: string;
  name: string;
  price: number;
  rows: string[];
  seats_per_row: number;
  perks: string;
  color: string;
  quantity: number;
}

export interface ConcertReview {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Concert {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  venue_name: string;
  city: string;
  address: string;
  description: string;
  poster_url: string;
  date: string;
  genre: string;
  popularity: number;
  is_sample: boolean;
  categories: ConcertCategory[];
  min_price: number;
  total_seats: number;
  booked?: number;
  available_count: number;
  is_past: boolean;
  reviews?: ConcertReview[];
  rating_avg?: number | null;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  bio: string;
  image_url: string;
  followers: string;
  popular_songs: string[];
  albums: string[];
  instagram: string;
  spotify: string;
  youtube: string;
  concert_count: number;
  concerts?: Concert[];
}

export interface SeatInfo {
  id: string;
  state: "available" | "booked";
  category_key: string;
  price: number;
}

export interface SeatRow {
  row: string;
  seats: SeatInfo[];
}

export interface SeatZone {
  key: string;
  name: string;
  price: number;
  color: string;
  perks: string;
  rows: SeatRow[];
}

export interface SeatMap {
  concert_id: string;
  zones: SeatZone[];
}

export interface BookingSeat {
  seat_id: string;
  category_key: string;
  category_name: string;
  price: number;
}

export interface BookingTicket {
  ticket_id: string;
  seat_id: string;
  category_key: string;
  category_name: string;
  price: number;
  qr_token: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "failed";

export interface Booking {
  id: string;
  ref: string;
  user_id: string;
  customer_name: string;
  concert_id: string;
  concert_title: string;
  artist_name: string;
  poster_url: string;
  venue_name: string;
  city: string;
  date: string;
  seats: BookingSeat[];
  subtotal: number;
  fee: number;
  tax: number;
  discount: number;
  coupon_code: string | null;
  total: number;
  status: BookingStatus;
  hold_expires_at: string | null;
  created_at: string;
  paid_at: string | null;
  tickets: BookingTicket[];
  payment_method?: string | null;
  payment_txn?: string | null;
  refund_status?: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  item_type: "artist" | "concert";
  item_id: string;
  created_at: string;
  artist?: { id: string; name: string; genre: string; image_url: string };
  concert?: {
    id: string;
    title: string;
    artist_name: string;
    city: string;
    poster_url: string;
    date: string;
    min_price: number;
    is_past: boolean;
  };
}

export interface CouponCheck {
  valid: boolean;
  code: string;
  discount: number;
  message: string;
}

export interface MetaInfo {
  cities: string[];
  genres: string[];
  coupons: { code: string; type: string; value: number; min_amount: number; cap: number | null }[];
}

export interface AdminStats {
  revenue: number;
  payments_count: number;
  tickets_sold: number;
  customers: number;
  total_bookings: number;
  upcoming_concerts: number;
  popular_concerts: { title: string; tickets: number }[];
  category_sales: { category: string; tickets: number }[];
  upcoming_events: {
    id: string;
    title: string;
    city: string;
    date: string;
    sold: number;
    total: number;
  }[];
}

export interface AdminBooking {
  id: string;
  ref: string;
  user_email: string;
  user_name: string;
  concert_title: string;
  city: string;
  date: string;
  seats: string[];
  seat_count: number;
  total: number;
  status: BookingStatus;
  payment_method?: string | null;
  payment_txn?: string | null;
  refund_status?: string | null;
  created_at: string;
}

export interface AdminCustomer {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  created_at: string;
  bookings_count: number;
  total_spent: number;
}
