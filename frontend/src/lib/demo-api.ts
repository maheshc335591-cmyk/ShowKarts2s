// Browser-only presentation mode. This is not server-side authentication or shared inventory.
import concertsSeed from "../../../backend/data/concerts.json";
import artistsSeed from "../../../backend/data/artists.json";
import metaSeed from "../../../backend/data/meta.json";
import media from "../../public/demo-media/map.json";
import { ApiError } from "./api";
import { assetUrl } from "./assets";
import type { Artist, Concert, Booking, User, WishlistItem, AppNotification } from "./types";

type Account = User & { verifier: string };
type State = {
  users: Account[];
  concerts: Concert[];
  artists: Artist[];
  bookings: Booking[];
  wishlist: (WishlistItem & { user_id: string })[];
  notifications: (AppNotification & { user_id: string })[];
  resets: Record<string, { code: string; expires: number }>;
};
const KEY = "showkart-pages-v1";
const SESSION = `${KEY}-session`;
const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();
function fail(message: string, status = 400): never {
  throw new ApiError(status, { detail: message });
}
async function verifier(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bytes = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return Array.from(new Uint8Array(bytes), (x) => x.toString(16).padStart(2, "0")).join("");
}
async function load(): Promise<State> {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as State;
    } catch {
      fail("Browser demo data could not be read. Clear this site's storage to reset it.");
    }
  }
  const users: Account[] = [];
  for (const [full_name, email, password, role] of [
    ["Demo Fan", "customer@showkart.in", "Customer@123", "customer"],
    ["Demo Administrator", "admin@showkart.in", "Admin@123", "admin"],
  ] as const) {
    const userId = id();
    users.push({
      id: userId,
      full_name,
      email,
      role,
      mobile: "9999999999",
      created_at: stamp(),
      verifier: await verifier(password, userId),
    });
  }
  return {
    users,
    concerts: concertsSeed.map((c, i) => ({
      ...c,
      date: new Date(Date.now() + (7 + i * 3) * 86400000).toISOString(),
      reviews: [],
    })) as Concert[],
    artists: artistsSeed as Artist[],
    bookings: [],
    wishlist: [],
    notifications: [],
    resets: {},
  };
}
const publicUser = (u: Account | undefined) =>
  u
    ? (Object.fromEntries(
        Object.entries(u).filter(([key]) => key !== "verifier"),
      ) as unknown as User)
    : null;
const image = (url: string) => assetUrl((media as Record<string, string>)[url] || url);
function seats(c: Concert) {
  return c.categories.flatMap((cat) =>
    cat.rows
      .flatMap((row) =>
        Array.from({ length: cat.seats_per_row }, (_, i) => ({
          seat_id: `${row}${i + 1}`,
          row,
          category_key: cat.key,
          category_name: cat.name,
          price: cat.price,
        })),
      )
      .slice(0, cat.quantity),
  );
}
function occupied(s: State, concertId: string) {
  return new Set(
    s.bookings
      .filter((b) => b.concert_id === concertId && ["pending", "confirmed"].includes(b.status))
      .flatMap((b) => b.seats.map((x) => x.seat_id)),
  );
}
function concert(s: State, c: Concert): Concert {
  return {
    ...c,
    poster_url: image(c.poster_url),
    artist_name: s.artists.find((a) => a.id === c.artist_id)?.name || c.artist_name,
    total_seats: seats(c).length,
    available_count: seats(c).length - occupied(s, c.id).size,
    booked: s.bookings
      .filter((b) => b.concert_id === c.id && b.status === "confirmed")
      .reduce((n, b) => n + b.seats.length, 0),
    min_price: Math.min(...c.categories.map((x) => x.price)),
    is_past: +new Date(c.date) <= Date.now(),
    rating_avg: c.reviews?.length
      ? c.reviews.reduce((n, r) => n + r.rating, 0) / c.reviews.length
      : null,
  };
}
function artist(s: State, a: Artist): Artist {
  const concerts = s.concerts.filter((c) => c.artist_id === a.id).map((c) => concert(s, c));
  return {
    ...a,
    image_url: image(a.image_url),
    concerts,
    concert_count: concerts.filter((c) => !c.is_past).length,
  };
}
function totals(b: Booking) {
  b.fee = Math.round(b.subtotal * 0.03);
  b.tax = Math.round((b.subtotal - b.discount + b.fee) * 0.18);
  b.total = b.subtotal - b.discount + b.fee + b.tax;
}
function coupon(code: string, subtotal: number) {
  const c = metaSeed.coupons.find((c) => c.code === code.trim().toUpperCase());
  if (!c || !Number.isFinite(subtotal) || subtotal < c.min_amount)
    fail("Invalid coupon or minimum ticket amount not met");
  const discount = Math.min(
    subtotal,
    c.cap || subtotal,
    c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value,
  );
  return { valid: true, code: c.code, discount, message: `Coupon applied: save INR ${discount}` };
}
function notice(s: State, b: Booking, title: string) {
  s.notifications.push({
    id: id(),
    user_id: b.user_id,
    type: "booking",
    title,
    message: `${b.ref}: ${title}`,
    read: false,
    created_at: stamp(),
  });
}
function sync(s: State) {
  for (const b of s.bookings.filter((b) => ["pending", "confirmed"].includes(b.status))) {
    const raw = s.concerts.find((c) => c.id === b.concert_id);
    if (!raw) continue;
    const c = concert(s, raw);
    Object.assign(b, {
      concert_title: c.title,
      artist_name: c.artist_name,
      date: c.date,
      city: c.city,
      venue_name: c.venue_name,
      poster_url: c.poster_url,
    });
  }
}
function cancel(s: State, b: Booking) {
  if (!["pending", "confirmed"].includes(b.status)) fail("This booking cannot be cancelled", 409);
  b.refund_status = b.status === "confirmed" ? "Simulated refund completed" : null;
  Object.assign(b, { status: "cancelled", hold_expires_at: null, tickets: [] });
  notice(s, b, "Booking cancelled");
  return b;
}
// Serialise operations in this tab; Web Locks also serialize cooperating tabs.
let queue: Promise<unknown> = Promise.resolve();
export function demoRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const run = async () => {
    const operation = async () => {
      const s = await load();
      for (const b of s.bookings)
        if (
          b.status === "pending" &&
          (+new Date(b.hold_expires_at || 0) <= Date.now() || +new Date(b.date) <= Date.now())
        )
          Object.assign(b, { status: "failed", hold_expires_at: null });
      try {
        return (await route(s, method, path, body)) as T;
      } finally {
        localStorage.setItem(KEY, JSON.stringify(s));
      }
    };
    return navigator.locks ? navigator.locks.request(KEY, operation) : operation();
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}
async function route(s: State, method: string, path: string, input: unknown): Promise<unknown> {
  const url = new URL(path, "https://demo.local");
  const p = url.pathname.split("/").filter(Boolean);
  const q = url.searchParams;
  // Request bodies are generated by the typed application forms.
  const b = (input || {}) as {
    email: string;
    password: string;
    full_name: string;
    mobile: string;
    confirm_password?: string;
    current_password: string;
    new_password: string;
    code: string;
    subtotal: number;
    rating: number;
    comment: string;
    concert_id: string;
    artist_id: string;
    date: string;
    method: string;
    simulate_failure: boolean;
    item_type: "artist" | "concert";
    item_id: string;
  };
  const me = s.users.find((u) => u.id === sessionStorage.getItem(SESSION));
  const auth = (admin = false) => {
    if (!me) fail("Please log in", 401);
    if (admin && me.role !== "admin") fail("Administrator access required", 403);
    return me;
  };
  const getConcert = (key: string) =>
    s.concerts.find((c) => c.id === key) || fail("Concert not found", 404);
  const getArtist = (key: string) =>
    s.artists.find((a) => a.id === key) || fail("Artist not found", 404);
  const getBooking = (key: string) => {
    const u = auth();
    return (
      s.bookings.find((b) => b.id === key && (b.user_id === u.id || u.role === "admin")) ||
      fail("Booking not found", 404)
    );
  };
  if (p[0] === "auth") {
    if (p[1] === "me") return publicUser(me);
    if (p[1] === "logout") {
      sessionStorage.removeItem(SESSION);
      return { message: "Signed out" };
    }
    if (p[1] === "login") {
      const u = s.users.find((u) => u.email === String(b.email).trim().toLowerCase());
      if (!u || u.verifier !== (await verifier(b.password, u.id)))
        fail("Invalid email or password", 401);
      sessionStorage.setItem(SESSION, u.id);
      return publicUser(u);
    }
    if (p[1] === "register") {
      const email = String(b.email).trim().toLowerCase();
      const name = String(b.full_name).trim();
      if (
        name.length < 2 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        String(b.password).length < 8 ||
        b.password !== b.confirm_password
      )
        fail("Check your name, email and matching passwords (at least 8 characters)");
      if (s.users.some((u) => u.email === email)) fail("Email already registered", 409);
      const userId = id();
      const u: Account = {
        id: userId,
        full_name: name,
        email,
        mobile: b.mobile,
        role: "customer",
        created_at: stamp(),
        verifier: await verifier(b.password, userId),
      };
      s.users.push(u);
      sessionStorage.setItem(SESSION, u.id);
      return publicUser(u);
    }
    if (p[1] === "forgot-password") {
      const email = String(b.email).trim().toLowerCase();
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
      const exists = s.users.some((u) => u.email === email);
      if (exists) s.resets[email] = { code, expires: Date.now() + 600000 };
      return {
        message: "Simulated verification: no email is sent.",
        simulated_code: exists ? code : null,
      };
    }
    if (p[1] === "reset-password") {
      const email = String(b.email).trim().toLowerCase();
      const reset = s.resets[email];
      const u = s.users.find((u) => u.email === email);
      if (!u || !reset || reset.code !== b.code || reset.expires <= Date.now())
        fail("Invalid or expired reset code");
      if (String(b.new_password).length < 8) fail("Use at least 8 characters");
      u.verifier = await verifier(b.new_password, u.id);
      delete s.resets[email];
      sessionStorage.removeItem(SESSION);
      return { message: "Password reset. Please log in." };
    }
    const u = auth();
    if (p[1] === "profile") {
      if (String(b.full_name).trim().length < 2) fail("Enter your full name");
      Object.assign(u, { full_name: String(b.full_name).trim(), mobile: b.mobile });
      return publicUser(u);
    }
    if (p[1] === "change-password") {
      if (u.verifier !== (await verifier(b.current_password, u.id)))
        fail("Current password is incorrect");
      if (
        String(b.new_password).length < 8 ||
        (b.confirm_password !== undefined && b.new_password !== b.confirm_password)
      )
        fail("Check your new passwords");
      u.verifier = await verifier(b.new_password, u.id);
      return { message: "Password changed" };
    }
  }
  if (p[0] === "concerts") {
    if (p[1] === "meta")
      return {
        ...metaSeed,
        cities: [...new Set(s.concerts.map((c) => c.city))].sort(),
        genres: [...new Set(s.concerts.map((c) => c.genre))].sort(),
      };
    if (!p[1]) {
      const values = s.concerts
        .map((c) => concert(s, c))
        .filter(
          (c) =>
            !c.is_past &&
            (!q.get("q") ||
              `${c.title} ${c.artist_name} ${c.city} ${c.venue_name}`
                .toLowerCase()
                .includes(q.get("q")!.toLowerCase())) &&
            (!q.get("city") || c.city === q.get("city")) &&
            (!q.get("genre") || c.genre === q.get("genre")) &&
            (!q.has("max_price") || c.min_price <= Number(q.get("max_price"))) &&
            (!q.get("available_only") || c.available_count > 0),
        );
      return values.sort((a, b) =>
        q.get("sort")?.includes("price")
          ? (a.min_price - b.min_price) *
            (q.get("sort")?.includes("desc") || q.get("sort")?.includes("high") ? -1 : 1)
          : q.get("sort")?.includes("date")
            ? +new Date(a.date) - +new Date(b.date)
            : b.popularity - a.popularity,
      );
    }
    const c = getConcert(p[1]);
    if (p[2] === "seats") {
      const taken = occupied(s, c.id);
      return {
        concert_id: c.id,
        zones: c.categories.map((cat) => ({
          ...cat,
          rows: cat.rows
            .map((row) => ({
              row,
              seats: seats(c)
                .filter((x) => x.category_key === cat.key && x.row === row)
                .map((x) => ({
                  id: x.seat_id,
                  category_key: x.category_key,
                  price: x.price,
                  state: taken.has(x.seat_id) ? "booked" : "available",
                })),
            }))
            .filter((r) => r.seats.length),
        })),
      };
    }
    if (p[2] === "reviews") {
      const u = auth();
      if (Number(b.rating) < 1 || Number(b.rating) > 5 || String(b.comment).trim().length < 3)
        fail("Enter a rating and review");
      (c.reviews ||= []).push({
        id: id(),
        user_name: u.full_name,
        rating: b.rating,
        comment: b.comment,
        created_at: stamp(),
      });
      return { message: "Review posted" };
    }
    return concert(s, c);
  }
  if (p[0] === "artists")
    return p[1] ? artist(s, getArtist(p[1])) : s.artists.map((a) => artist(s, a));
  if (p[0] === "coupons") return coupon(b.code, b.subtotal);
  if (p[0] === "bookings") {
    const u = auth();
    if (p[1] === "mine") return s.bookings.filter((x) => x.user_id === u.id).toReversed();
    if (p[1] === "hold") {
      const c = concert(s, getConcert(b.concert_id));
      const chosenIds = (input as { seats?: string[] } | null)?.seats;
      if (
        !chosenIds ||
        !chosenIds.length ||
        chosenIds.length > 10 ||
        new Set(chosenIds).size !== chosenIds.length
      )
        fail("Choose 1 to 10 unique seats");
      if (c.is_past) fail("This concert has already started", 409);
      const layout = seats(c);
      const taken = occupied(s, c.id);
      const chosen = chosenIds.map((key) => {
        const seat = layout.find((x) => x.seat_id === key);
        if (!seat || taken.has(key)) fail("Seat unavailable. Please choose again", 409);
        return {
          seat_id: seat.seat_id,
          category_key: seat.category_key,
          category_name: seat.category_name,
          price: seat.price,
        };
      });
      const booking: Booking = {
        id: id(),
        ref: `SK-${id().slice(0, 8).toUpperCase()}`,
        user_id: u.id,
        customer_name: u.full_name,
        concert_id: c.id,
        concert_title: c.title,
        artist_name: c.artist_name,
        poster_url: c.poster_url,
        venue_name: c.venue_name,
        city: c.city,
        date: c.date,
        seats: chosen,
        subtotal: chosen.reduce((n, x) => n + x.price, 0),
        fee: 0,
        tax: 0,
        discount: 0,
        coupon_code: null,
        total: 0,
        status: "pending",
        hold_expires_at: new Date(Date.now() + 600000).toISOString(),
        created_at: stamp(),
        paid_at: null,
        tickets: [],
      };
      totals(booking);
      s.bookings.push(booking);
      return booking;
    }
    const booking = getBooking(p[1]);
    if (!p[2]) return booking;
    if (p[2] === "cancel") return cancel(s, booking);
    if (p[2] === "pay" && booking.status === "confirmed") return { booking };
    if (booking.status !== "pending") fail("This booking is no longer pending", 409);
    if (p[2] === "coupon") {
      const result = b.code ? coupon(b.code, booking.subtotal) : { code: null, discount: 0 };
      Object.assign(booking, { coupon_code: result.code, discount: result.discount });
      totals(booking);
      return booking;
    }
    if (p[2] === "pay") {
      if (b.simulate_failure) {
        Object.assign(booking, { status: "failed", hold_expires_at: null });
        notice(s, booking, "Payment failed");
        fail("Simulated payment failed. Your seats were released.", 402);
      }
      if (!["upi", "card", "netbanking"].includes(b.method)) fail("Choose a payment method");
      Object.assign(booking, {
        status: "confirmed",
        hold_expires_at: null,
        paid_at: stamp(),
        payment_method: b.method,
        payment_txn: `DEMO-${id()}`,
        tickets: booking.seats.map((seat) => ({ ...seat, ticket_id: id(), qr_token: id() })),
      });
      notice(s, booking, "Booking confirmed");
      return { booking };
    }
  }
  if (p[0] === "wishlist") {
    const u = auth();
    if (method === "GET")
      return s.wishlist
        .filter((w) => w.user_id === u.id)
        .map((w) => ({
          ...w,
          [w.item_type]:
            w.item_type === "artist"
              ? artist(s, getArtist(w.item_id))
              : concert(s, getConcert(w.item_id)),
        }));
    const old = s.wishlist.find(
      (w) => w.user_id === u.id && w.item_type === b.item_type && w.item_id === b.item_id,
    );
    if (old) s.wishlist.splice(s.wishlist.indexOf(old), 1);
    else
      s.wishlist.push({
        id: id(),
        user_id: u.id,
        item_type: b.item_type,
        item_id: b.item_id,
        created_at: stamp(),
      });
    return { in_wishlist: !old, message: old ? "Removed from favourites" : "Saved to favourites" };
  }
  if (p[0] === "notifications") {
    const u = auth();
    const values = s.notifications.filter((n) => n.user_id === u.id);
    if (method === "POST") {
      values.forEach((n) => (n.read = true));
      return { message: "Notifications marked read" };
    }
    return values.toReversed();
  }
  if (p[0] === "newsletter") return { message: "Subscribed on this device. No emails are sent." };
  if (p[0] === "admin") {
    auth(true);
    const paid = s.bookings.filter((b) => b.status === "confirmed");
    const cs = s.concerts.map((c) => concert(s, c));
    if (p[1] === "stats") {
      const category: Record<string, number> = {};
      paid.forEach((b) =>
        b.seats.forEach((x) => (category[x.category_name] = (category[x.category_name] || 0) + 1)),
      );
      return {
        revenue: paid.reduce((n, b) => n + b.total, 0),
        payments_count: paid.length,
        tickets_sold: paid.reduce((n, b) => n + b.seats.length, 0),
        customers: s.users.filter((u) => u.role === "customer").length,
        total_bookings: s.bookings.length,
        upcoming_concerts: cs.filter((c) => !c.is_past).length,
        popular_concerts: cs
          .map((c) => ({ title: c.title, tickets: c.booked || 0 }))
          .sort((a, b) => b.tickets - a.tickets)
          .slice(0, 5),
        category_sales: Object.entries(category).map(([category, tickets]) => ({
          category,
          tickets,
        })),
        upcoming_events: cs
          .filter((c) => !c.is_past)
          .map((c) => ({
            id: c.id,
            title: c.title,
            city: c.city,
            date: c.date,
            sold: c.booked || 0,
            total: c.total_seats,
          })),
      };
    }
    if (p[1] === "customers")
      return s.users
        .filter((u) => u.role === "customer")
        .map((u) => ({
          ...publicUser(u),
          bookings_count: s.bookings.filter((b) => b.user_id === u.id).length,
          total_spent: paid.filter((b) => b.user_id === u.id).reduce((n, b) => n + b.total, 0),
        }));
    if (p[1] === "bookings") {
      if (p[2]) return cancel(s, getBooking(p[2]));
      return s.bookings.toReversed().map((b) => ({
        ...b,
        user_name: s.users.find((u) => u.id === b.user_id)?.full_name,
        user_email: s.users.find((u) => u.id === b.user_id)?.email,
        seats: b.seats.map((x) => x.seat_id),
        seat_count: b.seats.length,
      }));
    }
    if (p[1] === "artists") {
      if (method === "POST") {
        const a = { id: id(), ...b } as unknown as Artist;
        s.artists.push(a);
        return artist(s, a);
      }
      const a = getArtist(p[2]);
      if (method === "DELETE") {
        if (s.concerts.some((c) => c.artist_id === a.id))
          fail("Remove this artist's concerts first", 409);
        s.artists.splice(s.artists.indexOf(a), 1);
        return { message: "Artist deleted" };
      }
      Object.assign(a, b);
      sync(s);
      return artist(s, a);
    }
    if (p[1] === "concerts") {
      if (method === "GET") return cs;
      if (method === "POST") {
        getArtist(b.artist_id);
        if (+new Date(b.date) <= Date.now()) fail("Schedule concerts in the future");
        const c = {
          ...b,
          id: id(),
          categories: structuredClone(concertsSeed[0].categories),
          reviews: [],
          is_sample: true,
        } as unknown as Concert;
        s.concerts.push(c);
        return concert(s, c);
      }
      const c = getConcert(p[2]);
      if (method === "DELETE") {
        if (occupied(s, c.id).size) fail("Cancel active bookings before deleting the concert", 409);
        s.concerts.splice(s.concerts.indexOf(c), 1);
        return { message: "Concert deleted" };
      }
      if (p[3] === "categories") {
        const updated = structuredClone(c);
        for (const change of input as { key: string; price: number; quantity: number }[]) {
          const cat =
            updated.categories.find((x) => x.key === change.key) || fail("Unknown category");
          if (change.price < 0 || change.quantity < 0 || change.quantity > 1000)
            fail("Invalid price or quantity");
          Object.assign(cat, change);
          for (let i = cat.rows.length; i < Math.ceil(cat.quantity / cat.seats_per_row); i++)
            cat.rows.push(`${cat.key.toUpperCase()}-${i}-`);
        }
        const remaining = new Set(seats(updated).map((x) => x.seat_id));
        if ([...occupied(s, c.id)].some((x) => !remaining.has(x)))
          fail("Inventory cannot remove booked or held seats", 409);
        Object.assign(c, updated);
      } else {
        if (b.date !== c.date && +new Date(b.date) <= Date.now())
          fail("An event cannot be rescheduled into the past", 409);
        Object.assign(c, b);
        sync(s);
      }
      return concert(s, c);
    }
  }
  fail("This demo action is unavailable", 404);
}
