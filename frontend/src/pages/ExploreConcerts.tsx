import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarSearch, FilterX, Mic2, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ConcertCard from "@/components/ConcertCard";
import { apiGet } from "@/lib/api";
import type { Concert, MetaInfo } from "@/lib/types";

const BANNER = "/demo-media/image-36c9961575ec.jpg";

export default function ExploreConcerts() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  const [genre, setGenre] = useState(params.get("genre") ?? "");
  const [when, setWhen] = useState("any");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("popularity");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (city && city !== "any") p.set("city", city);
    if (genre && genre !== "any") p.set("genre", genre);
    if (maxPrice < 5000) p.set("max_price", String(maxPrice));
    if (availableOnly) p.set("available_only", "1");
    p.set("sort", sort);
    return p.toString();
  }, [q, city, genre, maxPrice, availableOnly, sort]);

  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => apiGet<MetaInfo>("/concerts/meta"),
  });
  const { data: concerts = [], isFetching } = useQuery({
    queryKey: ["concerts", "explore", query],
    queryFn: () => apiGet<Concert[]>(`/concerts?${query}`),
  });

  const today = new Date();
  const filtered = concerts.filter((c) => {
    if (when === "any") return true;
    const days = (+new Date(c.date) - +today) / 86400000;
    return days >= 0 && (when === "week" ? days <= 7 : when === "month" ? days <= 30 : true);
  });

  const reset = () => {
    setQ("");
    setCity("");
    setGenre("");
    setWhen("any");
    setMaxPrice(5000);
    setAvailableOnly(false);
    setSort("popularity");
  };

  return (
    <div>
      <section className="relative overflow-hidden pb-14 pt-32">
        <img src={BANNER} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090A10]/60 via-[#090A10]/85 to-[#090A10]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Explore Concerts
          </h1>
          <p className="mt-2 max-w-xl text-slate-300">
            Search by singer, artist, city or event — then filter by genre, price and availability.
          </p>
          <div className="relative mt-7 max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try 'Arijit', 'Mumbai', 'EDM'…"
              className="h-12 border-white/10 bg-[#121524]/85 pl-10 text-slate-100 placeholder:text-slate-500 backdrop-blur-xl"
              data-testid="explore-search-input"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[270px_1fr]">
        {/* ---------- FILTERS ---------- */}
        <aside
          className="h-max rounded-2xl border border-white/10 bg-[#121524] p-5 lg:sticky lg:top-24"
          data-testid="explore-filters-panel"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading font-bold text-white">
              <SlidersHorizontal className="size-4 text-violet-400" /> Filters
            </h2>
            <Button
              variant="ghost"
              size="xs"
              onClick={reset}
              className="text-cyan-300 hover:text-cyan-200"
              data-testid="explore-filters-reset"
            >
              <FilterX className="mr-1 size-3.5" /> Reset
            </Button>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-400">City</Label>
              <Select
                value={city || "any"}
                onValueChange={(v: string) => setCity(v === "any" ? "" : v)}
              >
                <SelectTrigger
                  className="mt-1.5 border-white/10 bg-white/5 text-slate-200"
                  data-testid="filter-city-select"
                >
                  <SelectValue placeholder="Any city">
                    {city && city !== "any" ? city : "Any city"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                  <SelectItem value="any" className="data-[highlighted]:bg-violet-500/20">
                    Any city
                  </SelectItem>
                  {(meta?.cities ?? []).map((c) => (
                    <SelectItem key={c} value={c} className="data-[highlighted]:bg-violet-500/20">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-400">Genre</Label>
              <Select
                value={genre || "any"}
                onValueChange={(v: string) => setGenre(v === "any" ? "" : v)}
              >
                <SelectTrigger
                  className="mt-1.5 border-white/10 bg-white/5 text-slate-200"
                  data-testid="filter-genre-select"
                >
                  <SelectValue placeholder="Any genre">
                    {genre && genre !== "any" ? genre : "Any genre"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                  <SelectItem value="any" className="data-[highlighted]:bg-violet-500/20">
                    Any genre
                  </SelectItem>
                  {(meta?.genres ?? []).map((g) => (
                    <SelectItem key={g} value={g} className="data-[highlighted]:bg-violet-500/20">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-400">When</Label>
              <Select value={when} onValueChange={(v: string) => setWhen(v)}>
                <SelectTrigger
                  className="mt-1.5 border-white/10 bg-white/5 text-slate-200"
                  data-testid="filter-date-select"
                >
                  <SelectValue>
                    {when === "week" ? "This week" : when === "month" ? "This month" : "Any date"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                  <SelectItem value="any" className="data-[highlighted]:bg-violet-500/20">
                    Any date
                  </SelectItem>
                  <SelectItem value="week" className="data-[highlighted]:bg-violet-500/20">
                    This week
                  </SelectItem>
                  <SelectItem value="month" className="data-[highlighted]:bg-violet-500/20">
                    This month
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
                Max ticket price
                <span className="font-mono text-cyan-300">
                  ₹{maxPrice.toLocaleString("en-IN")}
                  {maxPrice >= 5000 ? "+" : ""}
                </span>
              </Label>
              <input
                type="range"
                min={499}
                max={5000}
                step={100}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-3 w-full accent-violet-500"
                data-testid="price-slider-input"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
              <Checkbox
                checked={availableOnly}
                onCheckedChange={(v) => setAvailableOnly(v === true)}
                data-testid="filter-availability-checkbox"
              />
              Available tickets only
            </label>
          </div>
        </aside>

        {/* ---------- RESULTS ---------- */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="font-bold text-white">{filtered.length}</span> concert
              {filtered.length !== 1 ? "s" : ""} found
              {isFetching && <span className="ml-2 text-xs text-violet-300">updating…</span>}
            </p>
            <div className="flex items-center gap-2">
              <Mic2 className="size-4 text-violet-400" />
              <Select value={sort} onValueChange={(v: string) => setSort(v)}>
                <SelectTrigger
                  size="sm"
                  className="w-48 border-white/10 bg-white/5 text-slate-200"
                  data-testid="explore-sort-select"
                >
                  <SelectValue>
                    {sort === "date"
                      ? "Upcoming dates"
                      : sort === "price_low"
                        ? "Price: low to high"
                        : sort === "price_high"
                          ? "Price: high to low"
                          : "Most popular"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                  <SelectItem value="popularity" className="data-[highlighted]:bg-violet-500/20">
                    Most popular
                  </SelectItem>
                  <SelectItem value="date" className="data-[highlighted]:bg-violet-500/20">
                    Upcoming dates
                  </SelectItem>
                  <SelectItem value="price_low" className="data-[highlighted]:bg-violet-500/20">
                    Price: low to high
                  </SelectItem>
                  <SelectItem value="price_high" className="data-[highlighted]:bg-violet-500/20">
                    Price: high to low
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div
              className="grid place-items-center rounded-2xl border border-dashed border-white/10 py-24 text-center"
              data-testid="explore-empty-state"
            >
              <CalendarSearch className="size-10 text-slate-600" />
              <p className="mt-4 font-heading text-lg font-bold text-white">
                No concerts matched your filters
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Try widening the price range or clearing the city filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-5 border-violet-400/40 text-violet-200"
                onClick={reset}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
