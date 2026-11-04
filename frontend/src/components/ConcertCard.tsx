import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Mic2, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtTime, inr } from "@/lib/format";
import type { Concert } from "@/lib/types";

export default function ConcertCard({ concert }: { concert: Concert }) {
  const soldOut = concert.available_count === 0;
  const d = new Date(concert.date);

  return (
    <Link
      to={`/concerts/${concert.id}`}
      data-testid={`concert-card-${concert.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121524] transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/60 hover:shadow-[0_12px_40px_rgba(139,92,246,0.25)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={concert.poster_url}
          alt={concert.title}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A10] via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className="border-none bg-violet-500/90 text-white">{concert.genre}</Badge>
          {concert.is_sample ? (
            <Badge
              variant="outline"
              className="border-cyan-300/50 bg-black/50 text-cyan-200 backdrop-blur"
            >
              Sample Event
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-300/50 bg-black/50 text-emerald-200 backdrop-blur"
            >
              Confirmed
            </Badge>
          )}
        </div>
        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-black/60">
            <span className="rounded-full border border-rose-400/50 bg-black/70 px-4 py-1.5 text-sm font-bold tracking-wide text-rose-300">
              SOLD OUT
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-slate-200 backdrop-blur">
          <CalendarDays className="size-3.5 text-cyan-300" />
          {fmtDate(d)} · {fmtTime(d)}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-heading text-base font-bold text-white group-hover:text-cyan-200">
            {concert.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
            <Mic2 className="size-3.5 text-violet-400" /> {concert.artist_name}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
            <MapPin className="size-3.5 text-violet-400" /> {concert.venue_name}, {concert.city}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Starting from</p>
            <p className="font-heading text-lg font-bold text-white">
              {inr(concert.min_price)}
              <span className="text-xs font-normal text-slate-400"> onwards</span>
            </p>
          </div>
          <Button
            size="sm"
            disabled={soldOut || concert.is_past}
            className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-[0_0_14px_rgba(139,92,246,0.4)] hover:opacity-90"
            data-testid={`concert-book-${concert.id}`}
          >
            <Ticket className="size-4" />
            {concert.is_past ? "Ended" : soldOut ? "Sold Out" : "Book Now"}
          </Button>
        </div>
      </div>
    </Link>
  );
}
