import { assetUrl } from "@/lib/assets";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  Flame,
  Music2,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ConcertCard from "@/components/ConcertCard";
import CountdownTimer from "@/components/CountdownTimer";
import { apiGet } from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";
import type { Artist, Concert, MetaInfo } from "@/lib/types";

const HERO_BG = assetUrl("/demo-media/image-9fd46dd2c605.jpg");
const OFFER_BG = assetUrl("/demo-media/image-36c9961575ec.jpg");

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const { data: concerts = [] } = useQuery({
    queryKey: ["concerts", "home"],
    queryFn: () => apiGet<Concert[]>("/concerts?sort=popularity"),
  });
  const { data: artists = [] } = useQuery({
    queryKey: ["artists"],
    queryFn: () => apiGet<Artist[]>("/artists"),
  });
  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => apiGet<MetaInfo>("/concerts/meta"),
  });

  const featured = concerts.slice(0, 6);
  const upcoming = [...concerts].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const nextShow = upcoming[0];
  const trending = [...artists]
    .sort((a, b) => parseFloat(b.followers) - parseFloat(a.followers))
    .slice(0, 6);
  const genres = meta?.genres.slice(0, 8) ?? [];

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden">
        <img src={HERO_BG} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090A10]/40 via-[#090A10]/75 to-[#090A10]" />
        <div className="absolute -left-24 top-1/3 size-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -right-24 top-1/4 size-96 rounded-full bg-cyan-500/15 blur-[120px]" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-36 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-5 border border-violet-300/40 bg-violet-500/20 text-violet-200 backdrop-blur">
              <Sparkles className="mr-1.5 inline size-3.5" /> India's concert discovery & ticket
              booking
            </Badge>
            <h1 className="max-w-3xl font-heading text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Feel the stage.
              <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                Own your seat.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              ShowKart takes you from discovering the show to scanning your QR e-ticket at the gate
              — search, pick seats, pay, done.
            </p>
          </motion.div>

          <motion.form
            onSubmit={search}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-9 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/10 bg-[#121524]/85 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:flex-row"
            data-testid="hero-search-form"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search singer, artist, city or event…"
                className="border-0 bg-white/5 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-400"
                data-testid="hero-search-input"
              />
            </div>
            <Select
              value={city}
              onValueChange={(v: string) => setCity(v === "All cities" ? "" : v)}
            >
              <SelectTrigger
                className="w-full border-0 bg-white/5 text-slate-200 sm:w-44"
                data-testid="hero-city-select"
              >
                <SelectValue placeholder="All cities">{city || "All cities"}</SelectValue>
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                <SelectItem value="All cities" className="data-[highlighted]:bg-violet-500/20">
                  All cities
                </SelectItem>
                {(meta?.cities ?? []).map((c) => (
                  <SelectItem key={c} value={c} className="data-[highlighted]:bg-violet-500/20">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90"
              data-testid="hero-search-submit"
            >
              <Search className="mr-1 size-4" /> Search
            </Button>
          </motion.form>

          {nextShow && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-8 inline-flex flex-wrap items-center gap-4 rounded-2xl border border-cyan-300/20 bg-black/40 px-5 py-4 backdrop-blur"
              data-testid="hero-next-show"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                  Next show · {nextShow.city}
                </p>
                <p className="font-heading font-bold text-white">
                  {nextShow.title} · {fmtDate(nextShow.date)}
                </p>
              </div>
              <CountdownTimer to={nextShow.date} />
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-300/40 text-cyan-200 hover:bg-cyan-400/10"
                onClick={() => navigate(`/concerts/${nextShow.id}`)}
              >
                Grab tickets <ArrowRight className="ml-1 size-4" />
              </Button>
            </motion.div>
          )}

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-slate-300">
            {[
              { icon: Music2, big: "12+", small: "sample concerts" },
              { icon: Users, big: "10", small: "featured artists" },
              { icon: Ticket, big: "5", small: "ticket tiers ₹499+" },
            ].map((s) => (
              <div
                key={s.small}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 backdrop-blur"
              >
                <s.icon className="size-5 text-violet-400" />
                <div>
                  <p className="font-heading text-lg font-bold leading-none text-white">{s.big}</p>
                  <p className="text-xs text-slate-400">{s.small}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ---------- FEATURED ---------- */}
        <section className="pt-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                Featured
              </p>
              <h2 className="mt-1 font-heading text-3xl font-bold tracking-tight text-white">
                Trending concerts
              </h2>
            </div>
            <Link
              to="/explore"
              className="flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
            >
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        </section>

        {/* ---------- TRENDING ARTISTS ---------- */}
        <section className="pt-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                Artists
              </p>
              <h2 className="mt-1 font-heading text-3xl font-bold tracking-tight text-white">
                Trending artists
              </h2>
            </div>
            <Link
              to="/artists"
              className="flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
            >
              All artists <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {trending.map((a) => (
              <Link
                key={a.id}
                to={`/artists/${a.id}`}
                data-testid={`artist-card-${a.id}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 transition-all hover:-translate-y-1 hover:border-violet-400/60"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={a.image_url}
                    alt={a.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="truncate text-sm font-bold text-white">{a.name}</p>
                  <p className="truncate text-xs text-slate-300">{a.genre}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-cyan-300">
                    <Flame className="size-3" /> {a.followers} followers
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- CATEGORIES ---------- */}
        <section className="pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Browse</p>
          <h2 className="mt-1 font-heading text-3xl font-bold tracking-tight text-white">
            Popular music categories
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {genres.map((g) => (
              <Link
                key={g}
                to={`/explore?genre=${encodeURIComponent(g)}`}
                className="rounded-full border border-white/10 bg-[#121524] px-5 py-2.5 text-sm text-slate-200 transition-all hover:-translate-y-0.5 hover:border-violet-400/60 hover:text-white"
              >
                <Music2 className="mr-1.5 inline size-4 text-violet-400" /> {g}
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- UPCOMING TIMELINE ---------- */}
        <section className="pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
            On sale now
          </p>
          <h2 className="mt-1 mb-6 font-heading text-3xl font-bold tracking-tight text-white">
            Upcoming events
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121524]">
            {upcoming.slice(0, 5).map((c, i) => (
              <Link
                key={c.id}
                to={`/concerts/${c.id}`}
                data-testid={`upcoming-row-${c.id}`}
                className={`flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/5 sm:px-6 ${i > 0 ? "border-t border-white/5" : ""}`}
              >
                <img
                  src={c.poster_url}
                  alt=""
                  className="hidden size-14 rounded-xl object-cover sm:block"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{c.title}</p>
                  <p className="truncate text-sm text-slate-400">
                    {c.artist_name} · {c.venue_name}, {c.city}
                  </p>
                </div>
                <div className="hidden items-center gap-1.5 text-sm text-cyan-300 md:flex">
                  <CalendarDays className="size-4" /> {fmtDate(c.date)}
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-white">{inr(c.min_price)}</p>
                  <p className="text-xs text-slate-500">onwards</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- OFFERS ---------- */}
        <section className="pt-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <img src={OFFER_BG} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#090A10]/95 via-[#090A10]/80 to-violet-900/60" />
            <div className="relative grid gap-6 p-8 sm:p-12 lg:grid-cols-2">
              <div>
                <Badge className="border-none bg-amber-400/90 text-black">
                  <TrendingUp className="mr-1 size-3.5" /> Special offers
                </Badge>
                <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Student passes, secret codes &
                  <span className="bg-gradient-to-r from-amber-300 to-cyan-300 bg-clip-text text-transparent">
                    {" "}
                    neon drops
                  </span>
                </h2>
                <p className="mt-3 max-w-md text-slate-300">
                  Apply these coupons at checkout on any concert. Discounts are simulated.
                </p>
              </div>
              <div className="grid gap-3 self-center sm:grid-cols-3">
                {(meta?.coupons ?? []).map((c) => (
                  <div
                    key={c.code}
                    className="rounded-2xl border border-dashed border-cyan-300/40 bg-black/40 p-4 text-center backdrop-blur"
                    data-testid={`offer-card-${c.code}`}
                  >
                    <p className="font-mono text-lg font-bold tracking-widest text-cyan-200">
                      {c.code}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      {c.type === "percent"
                        ? `${c.value}% off${c.cap ? ` (up to ${inr(c.cap)})` : ""}`
                        : `${inr(c.value)} off`}
                    </p>
                    <p className="text-[11px] text-slate-500">min spend {inr(c.min_amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
