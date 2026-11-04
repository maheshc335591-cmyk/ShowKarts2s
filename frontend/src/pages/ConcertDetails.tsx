import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Info,
  MapPin,
  Mic2,
  Navigation,
  ShieldCheck,
  Star,
  Ticket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CountdownTimer from "@/components/CountdownTimer";
import { apiGet, apiPost } from "@/lib/api";
import { fmtDate, fmtDateTime, inr, mapsUrl, timeAgo } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { Concert } from "@/lib/types";

export default function ConcertDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  const {
    data: concert,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["concert", id],
    queryFn: () => apiGet<Concert>(`/concerts/${id}`),
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: () => apiPost(`/concerts/${id}/reviews`, { rating: Number(rating), comment }),
    onSuccess: () => {
      toast.success("Review posted — thanks for sharing!");
      setComment("");
      qc.invalidateQueries({ queryKey: ["concert", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post review"),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24">
        <div className="size-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }
  if (isError || !concert) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24 text-center">
        <div>
          <p className="font-heading text-2xl font-bold text-white">Concert not found</p>
          <Button asChild variant="outline" className="mt-4 border-violet-400/40 text-violet-200">
            <Link to="/explore">Back to explore</Link>
          </Button>
        </div>
      </div>
    );
  }

  const soldOut = concert.available_count === 0;
  const goBook = () => {
    if (concert.is_past || soldOut) return;
    const target = category
      ? `/booking/${concert.id}/seats?category=${category}`
      : `/booking/${concert.id}/seats`;
    navigate(target);
  };

  return (
    <div>
      <section className="relative overflow-hidden pb-14 pt-32">
        <img src={concert.poster_url} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090A10]/50 via-[#090A10]/85 to-[#090A10]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white"
            data-testid="concert-back-button"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            <div className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
              <img
                src={concert.poster_url}
                alt={concert.title}
                className="aspect-[4/3] w-full object-cover lg:aspect-auto"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge className="border-none bg-violet-500/90 text-white">{concert.genre}</Badge>
                {concert.is_sample ? (
                  <Badge variant="outline" className="border-cyan-300/50 text-cyan-200">
                    Sample Event
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-300/50 text-emerald-200">
                    Confirmed
                  </Badge>
                )}
                {concert.rating_avg != null && (
                  <span className="flex items-center gap-1 text-sm text-amber-300">
                    <Star className="size-4 fill-current" /> {concert.rating_avg}
                  </span>
                )}
              </div>
              <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                {concert.title}
              </h1>
              <Link
                to={`/artists/${concert.artist_id}`}
                className="mt-3 inline-flex items-center gap-2 text-lg text-violet-300 hover:text-violet-200"
              >
                <Mic2 className="size-5" /> {concert.artist_name}
              </Link>

              <div className="mt-6 grid gap-3 text-slate-300 sm:grid-cols-2">
                <p className="flex items-center gap-2.5">
                  <CalendarDays className="size-4.5 text-cyan-300" /> {fmtDate(concert.date)}
                </p>
                <p className="flex items-center gap-2.5">
                  <Clock className="size-4.5 text-cyan-300" />{" "}
                  {fmtDateTime(concert.date).split(", ")[1]} IST onwards
                </p>
                <p className="flex items-center gap-2.5 sm:col-span-2">
                  <MapPin className="size-4.5 text-cyan-300" /> {concert.venue_name}, {concert.city}
                  <a
                    href={mapsUrl(concert.venue_name, concert.city)}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
                    data-testid="concert-map-link"
                  >
                    <Navigation className="size-3.5" /> Map link
                  </a>
                </p>
              </div>

              {!concert.is_past && !soldOut && (
                <div className="mt-6 inline-flex flex-wrap items-center gap-4 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 py-3.5">
                  <span className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                    Doors open in
                  </span>
                  <CountdownTimer to={concert.date} />
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Select value={category} onValueChange={(v: string) => setCategory(v)}>
                  <SelectTrigger
                    className="w-64 border-white/10 bg-white/5 text-slate-200"
                    data-testid="concert-category-select"
                  >
                    <SelectValue placeholder="Choose ticket category (optional)">
                      {category
                        ? concert.categories.find((c) => c.key === category)?.name
                        : "Choose ticket category (optional)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                    {concert.categories.map((c) => (
                      <SelectItem
                        key={c.key}
                        value={c.key}
                        className="data-[highlighted]:bg-violet-500/20"
                      >
                        {c.name} — {inr(c.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="lg"
                  onClick={goBook}
                  disabled={soldOut || concert.is_past}
                  className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-[0_0_24px_rgba(139,92,246,0.5)] hover:opacity-90"
                  data-testid="concert-book-now-button"
                >
                  <Ticket className="mr-2 size-5" />
                  {concert.is_past ? "Show ended" : soldOut ? "Sold out" : "Book Now — pick seats"}
                </Button>
                <span className="text-sm text-slate-400">
                  {concert.available_count} of {concert.total_seats} seats available
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">About the show</h2>
            <p className="mt-3 leading-relaxed text-slate-300">{concert.description}</p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold text-white">Ticket categories</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {concert.categories.map((c) => (
                <Card
                  key={c.key}
                  className="border-white/10 bg-[#121524]"
                  data-testid={`ticket-category-${c.key}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className="inline-block size-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <h3 className="mt-1.5 font-heading font-bold text-white">{c.name}</h3>
                      </div>
                      <p className="font-heading text-xl font-bold text-cyan-300">{inr(c.price)}</p>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.perks}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Zones {c.rows.join(", ")} · {c.quantity} tickets on sale
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold text-white">Reviews & ratings</h2>
            <div className="mt-4 space-y-3" data-testid="concert-reviews-list">
              {(concert.reviews ?? []).length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                  No reviews yet — be the first after the show!
                </p>
              )}
              {(concert.reviews ?? []).map((r) => (
                <div key={r.id} className="rounded-2xl border border-white/10 bg-[#121524] p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">{r.user_name}</p>
                    <span className="flex items-center gap-0.5 text-amber-300">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-300">{r.comment}</p>
                  <p className="mt-1.5 text-xs text-slate-500">{timeAgo(r.created_at)}</p>
                </div>
              ))}
            </div>

            {me && !concert.is_past ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#121524] p-4">
                <h3 className="font-heading font-bold text-white">Write a review</h3>
                <div className="mt-3 flex gap-3">
                  <Select value={rating} onValueChange={(v: string) => setRating(v)}>
                    <SelectTrigger
                      className="w-24 border-white/10 bg-white/5 text-slate-200"
                      data-testid="review-rating-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem
                          key={n}
                          value={String(n)}
                          className="data-[highlighted]:bg-violet-500/20"
                        >
                          {n} ★
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience (min 3 characters)…"
                    className="border-white/10 bg-white/5 text-slate-100"
                    data-testid="review-comment-input"
                  />
                </div>
                <Button
                  size="sm"
                  className="mt-3 bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
                  disabled={comment.trim().length < 3 || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate()}
                  data-testid="review-submit-button"
                >
                  Post review
                </Button>
              </div>
            ) : (
              !me && (
                <p className="mt-4 text-sm text-slate-400">
                  <Link to="/login" className="text-cyan-300">
                    Log in
                  </Link>{" "}
                  to write a review.
                </p>
              )
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#121524] p-5">
            <h3 className="flex items-center gap-2 font-heading font-bold text-white">
              <Info className="size-4 text-cyan-300" /> Booking instructions
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>Pick your ticket category and hit Book Now.</li>
              <li>Choose exact seats on the interactive map — held for 10 minutes.</li>
              <li>Pay via simulated UPI / card / netbanking.</li>
              <li>Your QR e-tickets appear instantly on your dashboard.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#121524] p-5" id="refund-policy">
            <h3 className="flex items-center gap-2 font-heading font-bold text-white">
              <ShieldCheck className="size-4 text-emerald-300" /> Cancellation & refund policy
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>· Cancel up to 48 hours before showtime for a full refund (simulated).</li>
              <li>· Within 48 hours: 50% refund to source in 5-7 working days.</li>
              <li>· Expired holds and failed payments release seats automatically.</li>
              <li>· Simulated payments charge no real money.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Starting from</p>
            <p className="mt-1 font-heading text-4xl font-bold text-white">
              {inr(concert.min_price)}
            </p>
            <p className="mt-1 text-sm text-slate-300">+ small convenience fee & GST at checkout</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
