import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  Heart,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Mic2,
  QrCode,
  Receipt,
  Ticket,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { fmtDate, fmtDateTime, inr, initial, timeAgo } from "@/lib/format";
import { useMe, useSession } from "@/lib/session";
import type { AppNotification, Booking, User, WishlistItem } from "@/lib/types";

export default function CustomerDashboard() {
  const { data: me, isLoading: meLoading } = useMe();
  const { endSession } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "bookings";
  const setTab = (t: string) => setParams({ tab: t });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: () => apiGet<Booking[]>("/bookings/mine"),
    enabled: !!me,
  });
  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => apiGet<WishlistItem[]>("/wishlist"),
    enabled: !!me,
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<AppNotification[]>("/notifications"),
    enabled: !!me,
  });

  const qc = useQueryClient();
  const markRead = useMutation({
    mutationFn: () => apiPost("/notifications/mark-read"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (meLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24">
        <div className="size-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }
  if (!me) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 pt-24 text-center">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[#121524] p-10">
          <UserRound className="mx-auto size-10 text-violet-400" />
          <p className="mt-4 font-heading text-2xl font-bold text-white">Members only</p>
          <p className="mt-2 text-sm text-slate-400">
            Log in to view your bookings, tickets and wishlist.
          </p>
          <Button asChild className="mt-6 bg-gradient-to-r from-violet-500 to-cyan-400 text-white">
            <Link to="/login?next=/dashboard">Log in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcoming = bookings.filter((b) => b.status === "confirmed" && new Date(b.date) >= now);
  const pending = bookings.filter((b) => b.status === "pending");
  const past = bookings.filter(
    (b) =>
      b.status === "cancelled" ||
      b.status === "failed" ||
      (b.status === "confirmed" && new Date(b.date) < now),
  );
  const unread = notifications.filter((n) => !n.read).length;

  const cancelBooking = async (b: Booking) => {
    try {
      await apiPost(`/bookings/${b.id}/cancel`);
      toast.success(
        `Booking ${b.ref} cancelled — ${b.status === "confirmed" ? "refund initiated (simulated)" : "hold released"}`,
      );
      qc.invalidateQueries({ queryKey: ["bookings", "mine"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancellation failed");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 font-heading text-2xl font-bold text-white shadow-[0_0_24px_rgba(139,92,246,0.4)]">
            {initial(me.full_name)}
          </span>
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-white">
              Hey, {me.full_name.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-slate-400">
              {me.email}
              {me.role === "admin" ? " · administrator" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {me.role === "admin" && (
            <Button
              variant="outline"
              className="border-amber-300/40 text-amber-200 hover:bg-amber-400/10"
              onClick={() => navigate("/admin")}
              data-testid="dashboard-admin-button"
            >
              Admin dashboard
            </Button>
          )}
          <Button
            variant="outline"
            className="border-white/15 text-slate-300 hover:bg-white/5"
            onClick={async () => {
              await endSession();
              navigate("/");
            }}
            data-testid="dashboard-logout-button"
          >
            <LogOut className="mr-1.5 size-4" /> Log out
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Ticket,
            label: "Active tickets",
            value: upcoming.reduce((s, b) => s + b.seats.length, 0),
          },
          { icon: CalendarDays, label: "Upcoming shows", value: upcoming.length },
          {
            icon: Wallet,
            label: "Lifetime spend",
            value: inr(
              bookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.total, 0),
            ),
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#121524] p-5"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-violet-500/15">
              <s.icon className="size-5 text-violet-300" />
            </span>
            <div>
              <p
                className="font-heading text-xl font-bold text-white"
                data-testid={`stat-${s.label.replace(/\s/g, "-").toLowerCase()}`}
              >
                {s.value}
              </p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList
          className="flex w-full flex-wrap gap-1 bg-white/5 sm:w-max"
          data-testid="dashboard-tabs"
        >
          <TabsTrigger value="bookings">
            <CalendarDays className="mr-1.5 inline size-4" /> My Bookings
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Ticket className="mr-1.5 inline size-4" /> My Tickets
          </TabsTrigger>
          <TabsTrigger value="history">
            <Receipt className="mr-1.5 inline size-4" /> History
          </TabsTrigger>
          <TabsTrigger value="wishlist">
            <Heart className="mr-1.5 inline size-4" /> Wishlist
          </TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            <Bell className="mr-1.5 inline size-4" /> Alerts
            {unread > 0 && (
              <span className="ml-1 rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile">
            <UserRound className="mr-1.5 inline size-4" /> Profile
          </TabsTrigger>
        </TabsList>

        {/* BOOKINGS */}
        <TabsContent value="bookings" className="mt-6 space-y-8">
          {pending.length > 0 && (
            <section data-testid="dashboard-pending-bookings">
              <h2 className="mb-3 font-heading text-lg font-bold text-amber-300">
                Awaiting payment — complete before the hold ends
              </h2>
              <div className="space-y-3">
                {pending.map((b) => (
                  <BookingRow
                    key={b.id}
                    b={b}
                    onCancel={cancelBooking}
                    onPay={(id) => navigate(`/checkout?booking=${id}`)}
                  />
                ))}
              </div>
            </section>
          )}
          <section data-testid="dashboard-upcoming-bookings">
            <h2 className="mb-3 font-heading text-lg font-bold text-white">Upcoming concerts</h2>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={Mic2}
                title="No upcoming shows yet"
                sub="Time to fix that."
                cta="Explore concerts"
                to="/explore"
                testid="dashboard-empty-bookings"
              />
            ) : (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingRow
                    key={b.id}
                    b={b}
                    onCancel={cancelBooking}
                    onViewTicket={(id) => navigate(`/ticket/${id}?from=dashboard`)}
                  />
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* TICKETS */}
        <TabsContent value="tickets" className="mt-6">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={QrCode}
              title="No active e-tickets"
              sub="Your QR tickets appear here right after a successful payment."
              cta="Find a show"
              to="/explore"
              testid="dashboard-empty-tickets"
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {upcoming.map((b) => (
                <Link
                  key={b.id}
                  to={`/ticket/${b.id}?from=dashboard`}
                  data-testid={`ticket-view-${b.id}`}
                  className="group flex gap-4 rounded-2xl border border-white/10 bg-[#15192E] p-4 transition-all hover:-translate-y-1 hover:border-violet-400/60"
                >
                  <div className="relative flex items-center justify-center rounded-xl bg-white p-3">
                    <QrCode className="size-14 text-black" strokeWidth={1.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-heading font-bold text-white group-hover:text-cyan-200">
                      {b.concert_title}
                    </p>
                    <p className="text-sm text-slate-400">
                      {fmtDate(b.date)} · {b.venue_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Seats: {b.seats.map((s) => s.seat_id).join(", ")}
                    </p>
                    <p className="mt-1 font-mono text-xs text-cyan-300">{b.ref}</p>
                    <Badge
                      variant="outline"
                      className="mt-2 border-emerald-300/40 text-emerald-300"
                    >
                      Show QR at gate
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-6">
          {past.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No past transactions"
              sub="Booking history and payment statuses will show up here."
              cta="Book your first show"
              to="/explore"
              testid="dashboard-empty-history"
            />
          ) : (
            <div className="space-y-3" data-testid="dashboard-history-list">
              {past.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#121524] p-4"
                >
                  <img
                    src={b.poster_url}
                    alt=""
                    className="hidden size-14 rounded-xl object-cover sm:block"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{b.concert_title}</p>
                    <p className="text-sm text-slate-400">
                      {fmtDateTime(b.date)} · {b.seats.length} ticket
                      {b.seats.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {b.ref} · paid {inr(b.total)} ·{" "}
                      {b.status === "confirmed" ? "payment success" : b.status}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* WISHLIST */}
        <TabsContent value="wishlist" className="mt-6">
          {wishlist.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="Your wishlist is empty"
              sub="Tap the heart on any artist page to save them here."
              cta="Browse artists"
              to="/artists"
              testid="dashboard-empty-wishlist"
            />
          ) : (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              data-testid="dashboard-wishlist-grid"
            >
              {wishlist.map((w) => (
                <div
                  key={w.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#121524]"
                >
                  <button
                    onClick={async () => {
                      await apiPost("/wishlist", { item_type: w.item_type, item_id: w.item_id });
                      qc.invalidateQueries({ queryKey: ["wishlist"] });
                      toast.info("Removed from wishlist");
                    }}
                    className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/60 text-rose-300 backdrop-blur hover:text-rose-200"
                    aria-label="Remove from wishlist"
                    data-testid={`wishlist-remove-${w.item_id}`}
                  >
                    <X className="size-4" />
                  </button>
                  {w.item_type === "artist" && w.artist ? (
                    <Link to={`/artists/${w.artist.id}`} className="block">
                      <img
                        src={w.artist.image_url}
                        alt=""
                        className="aspect-[5/2] size-full object-cover"
                      />
                      <div className="p-4">
                        <p className="font-bold text-white">{w.artist.name}</p>
                        <p className="text-sm text-slate-400">{w.artist.genre}</p>
                      </div>
                    </Link>
                  ) : w.concert ? (
                    <Link
                      to={w.concert.is_past ? "#" : `/booking/${w.concert.id}/seats`}
                      className="block"
                    >
                      <img
                        src={w.concert.poster_url}
                        alt=""
                        className="aspect-[5/2] size-full object-cover"
                      />
                      <div className="p-4">
                        <p className="truncate font-bold text-white">{w.concert.title}</p>
                        <p className="text-sm text-slate-400">
                          {fmtDate(w.concert.date)} · {w.concert.city} · from{" "}
                          {inr(w.concert.min_price)}
                        </p>
                        {!w.concert.is_past && (
                          <Badge className="mt-2 border-none bg-gradient-to-r from-violet-500 to-cyan-400 text-white">
                            Book now
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Notification centre</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-cyan-300"
              onClick={() => markRead.mutate()}
              disabled={unread === 0}
              data-testid="notifications-mark-read-button"
            >
              Mark all read
            </Button>
          </div>
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              sub="Booking confirmations, payments and reminders land here."
              cta="Explore concerts"
              to="/explore"
              testid="dashboard-empty-notifications"
            />
          ) : (
            <div className="space-y-3" data-testid="dashboard-notifications-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl border p-4 ${n.read ? "border-white/5 bg-[#121524] opacity-70" : "border-violet-400/30 bg-violet-500/5"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">
                      {n.title}
                      {!n.read && (
                        <span className="ml-2 inline-block size-2 rounded-full bg-violet-400 align-middle" />
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{timeAgo(n.created_at)}</p>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-300">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-6">
          <ProfileSection me={me} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingRow({
  b,
  onCancel,
  onPay,
  onViewTicket,
}: {
  b: Booking;
  onCancel: (b: Booking) => void;
  onPay?: (id: string) => void;
  onViewTicket?: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-[#121524] p-4"
      data-testid={`booking-row-${b.ref}`}
    >
      <img src={b.poster_url} alt="" className="hidden size-16 rounded-xl object-cover sm:block" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading font-bold text-white">{b.concert_title}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-violet-400" /> {fmtDateTime(b.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-violet-400" /> {b.venue_name}, {b.city}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {b.ref} · {b.seats.length} ticket{b.seats.length !== 1 ? "s" : ""} · seats{" "}
          {b.seats.map((s) => s.seat_id).join(", ")} · {inr(b.total)}
        </p>
      </div>
      <StatusBadge status={b.status} />
      <div className="flex flex-wrap gap-2">
        {onViewTicket && (
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-300/40 text-cyan-200 hover:bg-cyan-400/10"
            onClick={() => onViewTicket(b.id)}
            data-testid={`booking-view-ticket-${b.ref}`}
          >
            <QrCode className="mr-1.5 size-4" /> E-ticket
          </Button>
        )}
        {onPay && (
          <Button
            size="sm"
            className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
            onClick={() => onPay(b.id)}
            data-testid={`booking-pay-${b.ref}`}
          >
            <Wallet className="mr-1.5 size-4" /> Pay now
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          onClick={() => onCancel(b)}
          data-testid={`booking-cancel-${b.ref}`}
        >
          <X className="mr-1 size-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "border-emerald-300/40 text-emerald-300",
    pending: "border-amber-300/40 text-amber-300",
    cancelled: "border-slate-400/40 text-slate-400",
    failed: "border-rose-400/40 text-rose-300",
  };
  return (
    <Badge variant="outline" className={map[status] ?? ""}>
      {status}
    </Badge>
  );
}

function EmptyState({
  icon: Icon,
  title,
  sub,
  cta,
  to,
  testid,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
  cta: string;
  to: string;
  testid: string;
}) {
  return (
    <div
      className="grid place-items-center rounded-3xl border border-dashed border-white/10 py-16 text-center"
      data-testid={testid}
    >
      <Icon className="size-10 text-slate-600" />
      <p className="mt-4 font-heading text-lg font-bold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{sub}</p>
      <Button
        asChild
        size="sm"
        className="mt-5 bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
      >
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}

function ProfileSection({ me }: { me: User }) {
  const qc = useQueryClient();
  const [name, setName] = useState(me.full_name);
  const [mobile, setMobile] = useState(me.mobile);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });

  const saveProfile = useMutation({
    mutationFn: () => apiPatch<User>("/auth/profile", { full_name: name, mobile }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const savePassword = useMutation({
    mutationFn: () => apiPost("/auth/change-password", pw),
    onSuccess: () => {
      toast.success("Password changed");
      setPw({ current_password: "", new_password: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Password change failed"),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div
        className="rounded-3xl border border-white/10 bg-[#121524] p-6"
        data-testid="profile-edit-form"
      >
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white">
          <UserRound className="size-5 text-violet-400" /> Personal details
        </h2>
        <div className="mt-5 space-y-4">
          <div>
            <Label className="text-slate-300">Full name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
              data-testid="profile-name-input"
            />
          </div>
          <div>
            <Label className="text-slate-300">Email</Label>
            <Input
              value={me.email}
              disabled
              className="mt-1.5 border-white/10 bg-white/5 text-slate-500"
              data-testid="profile-email-input"
            />
          </div>
          <div>
            <Label className="text-slate-300">Mobile</Label>
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
              data-testid="profile-mobile-input"
            />
          </div>
          <Button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
            className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
            data-testid="profile-save-button"
          >
            {saveProfile.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Save changes
          </Button>
        </div>
      </div>
      <div
        className="rounded-3xl border border-white/10 bg-[#121524] p-6"
        data-testid="profile-password-form"
      >
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white">
          <KeyRound className="size-5 text-cyan-300" /> Change password
        </h2>
        <div className="mt-5 space-y-4">
          <div>
            <Label className="text-slate-300">Current password</Label>
            <Input
              type="password"
              value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
              className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
              data-testid="profile-current-password-input"
            />
          </div>
          <div>
            <Label className="text-slate-300">New password</Label>
            <Input
              type="password"
              value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
              placeholder="8+ chars, letters & numbers"
              className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
              data-testid="profile-new-password-input"
            />
          </div>
          <Button
            onClick={() => savePassword.mutate()}
            disabled={savePassword.isPending || pw.new_password.length < 8}
            variant="outline"
            className="border-violet-400/40 text-violet-200 hover:bg-violet-500/10"
            data-testid="profile-password-save-button"
          >
            {savePassword.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Update
            password
          </Button>
        </div>
      </div>
    </div>
  );
}
