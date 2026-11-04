import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, CalendarDays, Lock, MapPin, Mic2, Tag, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PaymentModal from "@/components/PaymentModal";
import CountdownTimer from "@/components/CountdownTimer";
import { apiGet, apiPost } from "@/lib/api";
import { fmtDateTime, inr } from "@/lib/format";
import type { Booking, CouponCheck } from "@/lib/types";

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bookingId = params.get("booking") ?? "";
  const [payOpen, setPayOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [changingSeats, setChangingSeats] = useState(false);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => apiGet<Booking>(`/bookings/${bookingId}`),
    enabled: !!bookingId,
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (booking?.status === "confirmed") {
      navigate(`/ticket/${booking.id}`, { replace: true });
    }
  }, [booking?.status, booking?.id, navigate]);

  useEffect(() => {
    if (booking?.coupon_code) setAppliedCoupon(booking.coupon_code);
  }, [booking?.coupon_code]);

  const applyCoupon = async () => {
    if (!booking) return;
    try {
      const res = await apiPost<CouponCheck>("/coupons/validate", {
        code: coupon,
        subtotal: booking.subtotal,
      });
      await apiPost(`/bookings/${booking.id}/coupon`, { code: res.code });
      toast.success(res.message);
      setAppliedCoupon(res.code);
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid coupon");
    }
  };

  const removeCoupon = async () => {
    if (!booking) return;
    await apiPost(`/bookings/${booking.id}/coupon`, { code: null });
    setAppliedCoupon("");
    setCoupon("");
    qc.invalidateQueries({ queryKey: ["booking", bookingId] });
    toast.info("Coupon removed");
  };

  const changeSeats = async () => {
    if (!booking || changingSeats) return;
    setChangingSeats(true);
    try {
      if (booking.status === "pending") {
        const cancelled = await apiPost<Booking>(`/bookings/${booking.id}/cancel`);
        qc.setQueryData(["booking", booking.id], cancelled);
      }
      void qc.invalidateQueries({ queryKey: ["seats", booking.concert_id] });
      void qc.invalidateQueries({ queryKey: ["bookings"] });
      navigate(`/booking/${booking.concert_id}/seats`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not release the old seats");
    } finally {
      setChangingSeats(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24">
        <div className="size-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24 text-center">
        <div>
          <p className="font-heading text-2xl font-bold text-white">Booking not found</p>
          <p className="mt-2 text-sm text-slate-400">
            {error instanceof Error ? error.message : "Start a new booking."}
          </p>
          <Button asChild className="mt-4 bg-gradient-to-r from-violet-500 to-cyan-400 text-white">
            <Link to="/explore">Explore concerts</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (
    booking.status === "failed" ||
    booking.status === "cancelled" ||
    (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() <= clock)
  ) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 pt-24 text-center">
        <div
          className="max-w-md rounded-3xl border border-rose-400/25 bg-[#121524] p-10"
          data-testid="checkout-expired-panel"
        >
          <Timer className="mx-auto size-10 text-rose-300" />
          <p className="mt-4 font-heading text-2xl font-bold text-white">
            Booking is no longer active
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Your hold ended, payment failed, or this booking was cancelled. Pick seats again to
            start a new booking.
          </p>
          <Button asChild className="mt-6 bg-gradient-to-r from-violet-500 to-cyan-400 text-white">
            <Link to={`/booking/${booking.concert_id}/seats`}>Pick seats again</Link>
          </Button>
        </div>
      </div>
    );
  }

  const holdLeft = booking.hold_expires_at
    ? new Date(booking.hold_expires_at).getTime() - clock
    : 0;
  const expiredSoon = holdLeft < 120000;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Checkout</p>
      <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-white">
        Review & pay
      </h1>

      <div
        className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        data-testid="checkout-hold-banner"
      >
        <Lock className="size-4" /> Seats held — complete payment within
        {holdLeft > 0 ? <CountdownTimer to={booking.hold_expires_at!} compact /> : null}
        {expiredSoon && <span className="font-bold">— hurry!</span>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#121524]">
            <div className="flex gap-4 p-5">
              <img
                src={booking.poster_url}
                alt=""
                className="hidden size-24 rounded-2xl object-cover sm:block"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-xl font-bold text-white">
                  {booking.concert_title}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Mic2 className="size-3.5 text-violet-400" /> {booking.artist_name}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <CalendarDays className="size-3.5 text-violet-400" /> {fmtDateTime(booking.date)}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <MapPin className="size-3.5 text-violet-400" /> {booking.venue_name},{" "}
                  {booking.city}
                </p>
                <Badge variant="outline" className="mt-2 border-cyan-300/40 text-cyan-200">
                  Booking ref: {booking.ref}
                </Badge>
              </div>
            </div>
            <div className="border-t border-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Your seats
              </h3>
              <div className="mt-3 flex flex-wrap gap-2" data-testid="checkout-seats-list">
                {booking.seats.map((s) => (
                  <span
                    key={s.seat_id}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
                  >
                    <span className="font-mono font-bold text-white">{s.seat_id}</span>
                    <span className="ml-2 text-slate-400">{s.category_name.split(" – ")[0]}</span>
                    <span className="ml-2 text-cyan-300">{inr(s.price)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#121524] p-5">
            <h3 className="flex items-center gap-2 font-heading font-bold text-white">
              <Tag className="size-4 text-amber-300" /> Have a coupon?
            </h3>
            {appliedCoupon ? (
              <div
                className="mt-3 flex items-center justify-between rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3"
                data-testid="coupon-applied"
              >
                <span className="flex items-center gap-2 text-sm text-emerald-200">
                  <BadgeCheck className="size-4" />{" "}
                  <span className="font-mono font-bold">{appliedCoupon}</span> applied — you saved{" "}
                  {inr(booking.discount)}
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-slate-400 hover:text-rose-300"
                  data-testid="coupon-remove-button"
                  aria-label="Remove coupon"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="e.g. SHOWCOLLEGE"
                  className="border-white/10 bg-white/5 font-mono text-slate-100 placeholder:text-slate-500"
                  data-testid="coupon-code-input"
                />
                <Button
                  variant="outline"
                  className="border-violet-400/40 text-violet-200 hover:bg-violet-500/10"
                  disabled={coupon.length < 3}
                  onClick={applyCoupon}
                  data-testid="coupon-apply-button"
                >
                  Apply
                </Button>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Try SHOWCOLLEGE (15% off), DTI2026 (₹200 off) or FIRSTSHOW (₹100 off).
            </p>
          </div>
        </div>

        <aside className="h-max rounded-3xl border border-white/10 bg-[#121524] p-6 lg:sticky lg:top-24">
          <h2 className="font-heading text-lg font-bold text-white">Price summary</h2>
          <div className="mt-4 space-y-2 text-sm" data-testid="checkout-price-summary">
            <div className="flex justify-between text-slate-300">
              <span>Tickets ({booking.seats.length})</span>
              <span>{inr(booking.subtotal)}</span>
            </div>
            {booking.discount > 0 && (
              <div
                className="flex justify-between text-emerald-300"
                data-testid="checkout-discount-row"
              >
                <span>Coupon discount</span>
                <span>−{inr(booking.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Convenience fee (3%)</span>
              <span>{inr(booking.fee)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST (18%)</span>
              <span>{inr(booking.tax)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-heading text-xl font-bold text-white">
              <span>Payable</span>
              <span data-testid="checkout-order-total">{inr(booking.total)}</span>
            </div>
          </div>

          <Button
            disabled={booking.status !== "pending" || holdLeft <= 0}
            onClick={() => setPayOpen(true)}
            className="mt-5 w-full bg-gradient-to-r from-violet-500 to-cyan-400 py-6 text-base text-white shadow-[0_0_24px_rgba(139,92,246,0.5)] hover:opacity-90"
            data-testid="checkout-pay-button"
          >
            <Lock className="mr-2 size-4" /> Pay {inr(booking.total)} — Simulated
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">
            UPI · Cards · NetBanking — simulated gateway, no real money moves.
          </p>
          <Link
            to={`/booking/${booking.concert_id}/seats`}
            aria-disabled={changingSeats}
            onClick={(event) => {
              event.preventDefault();
              void changeSeats();
            }}
            className="mt-3 block text-center text-sm text-cyan-300 hover:text-cyan-200"
          >
            {changingSeats ? "Releasing seats…" : "← Change seats"}
          </Link>
        </aside>
      </div>

      <PaymentModal
        booking={booking}
        open={payOpen}
        onOpenChange={setPayOpen}
        onPaid={(b) => {
          qc.clear();
          navigate(`/ticket/${b.id}`);
        }}
      />
    </div>
  );
}
