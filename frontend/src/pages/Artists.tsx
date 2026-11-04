import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, Mic2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Artist } from "@/lib/types";

export default function Artists() {
  const { data: artists = [] } = useQuery({
    queryKey: ["artists"],
    queryFn: () => apiGet<Artist[]>("/artists"),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-32 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
        The line-up
      </p>
      <h1 className="mt-1 font-heading text-4xl font-extrabold tracking-tight text-white">
        Featured Artists
      </h1>
      <p className="mt-2 max-w-xl text-slate-400">
        Biographies, discographies and every upcoming show — tap an artist to explore.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((a) => (
          <Link
            key={a.id}
            to={`/artists/${a.id}`}
            data-testid={`artist-profile-card-${a.id}`}
            className="group flex gap-4 rounded-2xl border border-white/10 bg-[#121524] p-4 transition-all hover:-translate-y-1 hover:border-violet-400/60 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2)]"
          >
            <div className="size-20 shrink-0 overflow-hidden rounded-2xl">
              <img
                src={a.image_url}
                alt={a.name}
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-heading font-bold text-white group-hover:text-cyan-200">
                {a.name}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
                <Mic2 className="size-3.5 text-violet-400" /> {a.genre}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-cyan-300">
                <Flame className="size-3" /> {a.followers} followers
              </p>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{a.bio}</p>
              {a.concert_count > 0 && (
                <p className="mt-1.5 text-xs font-semibold text-violet-300">
                  {a.concert_count} upcoming show{a.concert_count > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
