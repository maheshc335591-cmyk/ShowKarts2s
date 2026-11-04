import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Armchair, CircleCheck, CircleX, Loader2, Lock, RotateCcw, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { fmtDateTime, inr } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { Booking, Concert, SeatMap } from "@/lib/types";

const FEE_RATE = 0.03,
  TAX_RATE = 0.18;
const money = (n: number) => Math.floor(n + 0.5);

export default function SeatSelection() {
  const { concertId } = useParams<{ concertId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const preselect = params.get("category") ?? "";
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data: concert,
    isLoading: concertLoading,
    isError: concertError,
    refetch: refetchConcert,
  } = useQuery({
    queryKey: ["concert", concertId],
    queryFn: () => apiGet<Concert>(`/concerts/${concertId}`),
    enabled: !!concertId,
    retry: false,
  });
  const {
    data: seatMap,
    isLoading,
    isError: seatsError,
    refetch,
  } = useQuery({
    queryKey: ["seats", concertId],
    queryFn: () => apiGet<SeatMap>(`/concerts/${concertId}/seats`),
    enabled: !!concertId,
    retry: false,
    refetchInterval: 15000, // live availability updates
  });

  // pre-select a few seats of the chosen category (only while free)
  useEffect(() => {
    if (!seatMap || !preselect || selected.size > 0) return;
    const zone = seatMap.zones.find((z) => z.key === preselect);
    if (!zone) return;
    const free = zone.rows
      .flatMap((r) => r.seats)
      .filter((s) => s.state === "available")
      .slice(0, 2);
    if (free.length) setSelected(new Set(free.map((s) => s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatMap]);

  const allSeats = useMemo(() => {
    const m = new Map<string, { state: string; price: number; color: string; zone: string }>();
    seatMap?.zones.forEach((z) =>
      z.rows.forEach((r) =>
        r.seats.forEach((s) =>
          m.set(s.id, { state: s.state, price: s.price, color: z.color, zone: z.name }),
        ),
      ),
    );
    return m;
  }, [seatMap]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => allSeats.get(id)?.state === "available"));
      return next.size === prev.size ? prev : next;
    });
  }, [allSeats]);

  const toggleSeat = (id: string, state: string) => {
    if (state !== "available" && !selected.has(id)) {
      toast.error("That seat is already taken — pick another.");
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size >= 10) {
        toast.error("You can book a maximum of 10 seats at once.");
        return prev;
      } else next.add(id);
      return next;
    });
  };

  const chosen = useMemo(
    () =>
      [...selected].map((id) => ({
        id,
        ...(allSeats.get(id) ?? { state: "available", price: 0, color: "#8B5CF6", zone: "" }),
      })),
    [selected, allSeats],
  );
  const subtotal = chosen.reduce((s, c) => s + c.price, 0);
  const fee = money(subtotal * FEE_RATE);
  const tax = money((subtotal + fee) * TAX_RATE);
  const estTotal = subtotal + fee + tax;

  const holdMutation = useMutation({
    mutationFn: () =>
      apiPost<Booking>("/bookings/hold", { concert_id: concertId, seats: [...selected] }),
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ["seats", concertId] });
      navigate(`/checkout?booking=${b.id}`);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Could not hold seats");
      refetch();
      setSelected(new Set());
    },
  });

  const proceed = async () => {
    if (!me) {
      toast.info("Please log in to continue booking");
      navigate(`/login?next=/booking/${concertId}/seats`);
      return;
    }
    holdMutation.mutate();
  };

  if (isLoading || concertLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24">
        <div className="size-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  if (concertError || seatsError || !concert || !seatMap) {
    return (
      <div
        role="alert"
        className="mx-auto grid min-h-[70vh] max-w-lg place-content-center gap-4 px-4 pt-24 text-center"
      >
        <h1 className="font-heading text-2xl font-bold text-white">
          Concert not found or unavailable
        </h1>
        <p className="text-slate-400">
          We could not load this event and its seats. Retry or choose another concert.
        </p>
        <Button
          onClick={() => {
            void refetchConcert();
            void refetch();
          }}
        >
          Try again
        </Button>
        <Link to="/explore" className="text-cyan-300">
          Explore concerts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-28 sm:px-6 lg:pb-16">
      {concert && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                Select seats
              </p>
              <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-white">
                {concert.title}
              </h1>
              <p className="mt-1 text-slate-400">
                {concert.artist_name} · {concert.venue_name}, {concert.city} ·{" "}
                {fmtDateTime(concert.date)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/15 text-slate-300"
              onClick={() => {
                setSelected(new Set());
                refetch();
              }}
              data-testid="seatmap-refresh-button"
            >
              <RotateCcw className="mr-1.5 size-4" /> Refresh availability
            </Button>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* ---------- SEAT MAP ---------- */}
            <div
              className="overflow-hidden rounded-3xl border border-white/10 bg-[#0A0D18] p-5 sm:p-7"
              data-testid="seat-map"
            >
              <div className="mx-auto mb-8 max-w-xl">
                <div className="rounded-full border-x-2 border-t-2 border-violet-400/70 bg-gradient-to-b from-indigo-900/80 to-indigo-950/40 py-3 text-center font-heading text-sm font-bold uppercase tracking-[0.35em] text-violet-200 shadow-[0_0_30px_rgba(139,92,246,0.35)]">
                  Stage
                </div>
              </div>

              <div className="space-y-6 overflow-x-auto pb-2">
                {seatMap?.zones.map((z) => (
                  <div key={z.key} data-testid={`seat-zone-${z.key}`}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: z.color }}
                      />
                      <p className="text-sm font-semibold text-slate-200">{z.name}</p>
                      <span className="text-xs text-cyan-300">{inr(z.price)}</span>
                    </div>
                    <div className="space-y-1.5">
                      {z.rows.map((r) => (
                        <div key={r.row} className="flex items-center gap-1.5">
                          <span className="w-5 shrink-0 text-right font-mono text-xs text-slate-500">
                            {r.row}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {r.seats.map((s) => {
                              const isSelected = selected.has(s.id);
                              const state = isSelected ? "selected" : s.state;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => toggleSeat(s.id, s.state)}
                                  title={
                                    isSelected
                                      ? `${s.id} — selected (${z.name})`
                                      : s.state === "booked"
                                        ? `${s.id} — booked`
                                        : `${s.id} — ${z.name} · ${inr(s.price)}`
                                  }
                                  className={[
                                    "grid size-6 place-items-center rounded-md border text-[9px] font-semibold transition-all duration-150 sm:size-7 sm:text-[10px]",
                                    state === "selected"
                                      ? "scale-105 border-emerald-300 bg-emerald-500 font-bold text-black shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                                      : state === "booked"
                                        ? "cursor-not-allowed border-slate-800 bg-[#131728] text-slate-600 opacity-40"
                                        : "border-slate-600 bg-[#1E293B] text-slate-300 hover:scale-110 hover:border-cyan-400 hover:text-white",
                                  ].join(" ")}
                                  style={
                                    state === "available"
                                      ? { borderColor: `${z.color}55` }
                                      : undefined
                                  }
                                  data-testid={`seat-dot-${s.id}`}
                                  aria-label={`Seat ${s.id} ${state}`}
                                >
                                  {s.id.replace(/[A-Z]/g, "")}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-5 border-t border-white/5 pt-5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded border border-slate-600 bg-[#1E293B]" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <CircleCheck className="size-3.5 text-emerald-400" /> Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <CircleX className="size-3.5 text-slate-500" /> Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <Armchair className="size-3.5 text-violet-400" /> Max 10 seats per booking
                </span>
              </div>
            </div>

            {/* ---------- SUMMARY ---------- */}
            <aside
              className="h-max rounded-3xl border border-white/10 bg-[#121524] p-6 lg:sticky lg:top-24"
              data-testid="seat-summary-panel"
            >
              <h2 className="font-heading text-lg font-bold text-white">Your selection</h2>
              {chosen.length === 0 ? (
                <p
                  className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400"
                  data-testid="seat-summary-empty"
                >
                  No seats selected yet — tap available seats on the map.
                </p>
              ) : (
                <ul className="mt-4 space-y-2" data-testid="seat-summary-list">
                  {chosen.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-mono font-bold text-white">{c.id}</span>
                        <span className="text-slate-400">{c.zone.split(" – ")[0]}</span>
                      </span>
                      <span className="text-slate-200">{inr(c.price)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 space-y-1.5 border-t border-white/10 pt-4 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>
                    Subtotal ({chosen.length} ticket{chosen.length !== 1 ? "s" : ""})
                  </span>
                  <span>{inr(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Convenience fee (3%)</span>
                  <span>{inr(fee)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (18%)</span>
                  <span>{inr(tax)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-white/10 pt-3 font-heading text-lg font-bold text-white">
                  <span>Estimated total</span>
                  <span data-testid="seat-summary-total">{inr(estTotal)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Final totals confirmed on checkout. Coupons apply there.
                </p>
              </div>

              <Button
                onClick={proceed}
                disabled={chosen.length === 0 || holdMutation.isPending}
                className="mt-5 w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.45)] hover:opacity-90"
                data-testid="proceed-payment-button"
              >
                {holdMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 size-4" />
                )}
                {me ? "Hold seats & proceed" : "Log in to book"}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <Ticket className="size-3.5" /> Seats are held for 10 minutes during checkout
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
