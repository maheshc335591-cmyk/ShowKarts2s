import { SiInstagram as Instagram, SiYoutube as Youtube } from "@icons-pack/react-simple-icons";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Album, Disc3, Heart, ListMusic, MapPin, Mic2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConcertCard from "@/components/ConcertCard";
import { apiGet, apiPost } from "@/lib/api";
import { useMe } from "@/lib/session";
import { inr } from "@/lib/format";
import type { Artist, WishlistItem } from "@/lib/types";

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => apiGet<WishlistItem[]>("/wishlist"),
    enabled: !!me,
  });
  const wish = wishlist.some((item) => item.item_type === "artist" && item.item_id === id);

  const {
    data: artist,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["artist", id],
    queryFn: () => apiGet<Artist>(`/artists/${id}`),
    enabled: !!id,
  });

  const wishlistMutation = useMutation({
    mutationFn: () =>
      apiPost<{ in_wishlist: boolean; message: string }>("/wishlist", {
        item_type: "artist",
        item_id: id,
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: () => toast.error("Please log in to save favourite artists"),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24">
        <div className="size-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  if (isError || !artist) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24 text-center">
        <div>
          <p className="font-heading text-2xl font-bold text-white">Artist not found</p>
          <Button asChild variant="outline" className="mt-4 border-violet-400/40 text-violet-200">
            <Link to="/artists">Back to all artists</Link>
          </Button>
        </div>
      </div>
    );
  }

  const upcoming = (artist.concerts ?? []).filter((c) => !c.is_past);
  const past = (artist.concerts ?? []).filter((c) => c.is_past);

  return (
    <div>
      <section className="relative overflow-hidden pb-12 pt-32">
        <img src={artist.image_url} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090A10]/55 via-[#090A10]/85 to-[#090A10]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[300px_1fr]">
          <div className="size-fit overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(139,92,246,0.25)]">
            <img
              src={artist.image_url}
              alt={artist.name}
              className="aspect-[4/5] w-full max-w-[300px] object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-none bg-violet-500/90 text-white">{artist.genre}</Badge>
              <span className="flex items-center gap-1 text-sm text-cyan-300">
                <Mic2 className="size-4" /> {artist.followers} followers
              </span>
              {upcoming.length > 0 && (
                <span className="text-sm text-slate-300">
                  {upcoming.length} upcoming show{upcoming.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {artist.name}
            </h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">{artist.bio}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  me
                    ? wishlistMutation.mutate()
                    : toast.error("Please log in to save favourite artists")
                }
                variant={wish ? "default" : "outline"}
                className={
                  wish
                    ? "bg-rose-500 text-white hover:bg-rose-400"
                    : "border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
                }
                data-testid="artist-wishlist-button"
                aria-pressed={wish}
                disabled={wishlistMutation.isPending}
              >
                <Heart className={`mr-1.5 size-4 ${wish ? "fill-current" : ""}`} />{" "}
                {wish ? "In wishlist" : "Add to wishlist"}
              </Button>
              {artist.instagram && (
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="border-white/15 text-slate-300"
                >
                  <a
                    href={artist.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                  >
                    <Instagram className="size-4" />
                  </a>
                </Button>
              )}
              {artist.spotify && (
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="border-white/15 text-slate-300"
                >
                  <a href={artist.spotify} target="_blank" rel="noreferrer" aria-label="Spotify">
                    <Disc3 className="size-4" />
                  </a>
                </Button>
              )}
              {artist.youtube && (
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="border-white/15 text-slate-300"
                >
                  <a href={artist.youtube} target="_blank" rel="noreferrer" aria-label="YouTube">
                    <Youtube className="size-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-10 px-4 pb-8 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-5 font-heading text-2xl font-bold text-white">Upcoming concerts</h2>
          {upcoming.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-400"
              data-testid="artist-no-upcoming"
            >
              No upcoming shows right now — check the{" "}
              <Link to="/explore" className="text-cyan-300">
                explore page
              </Link>{" "}
              for other artists.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {upcoming.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="mb-4 mt-10 font-heading text-2xl font-bold text-white">
                Previous performances
              </h2>
              <div className="space-y-3">
                {past.map((c) => (
                  <Link
                    key={c.id}
                    to={`/concerts/${c.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-white/5 bg-[#121524] p-4 opacity-80 transition-colors hover:border-white/20 hover:opacity-100"
                  >
                    <img src={c.poster_url} alt="" className="size-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{c.title}</p>
                      <p className="flex items-center gap-1.5 text-sm text-slate-400">
                        <MapPin className="size-3.5" /> {c.venue_name}, {c.city}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-white/15 text-slate-400">
                      Played
                    </Badge>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#121524] p-5">
            <h3 className="flex items-center gap-2 font-heading font-bold text-white">
              <ListMusic className="size-4 text-cyan-300" /> Popular songs
            </h3>
            <ol className="mt-4 space-y-3">
              {artist.popular_songs.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-500/15 font-mono text-xs text-violet-300">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s}</span>
                  <Play className="size-3.5 text-slate-600" />
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#121524] p-5">
            <h3 className="flex items-center gap-2 font-heading font-bold text-white">
              <Album className="size-4 text-amber-300" /> Albums
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
              {artist.albums.map((al) => (
                <li
                  key={al}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2.5"
                >
                  <span className="truncate">{al}</span>
                </li>
              ))}
            </ul>
          </div>
          {upcoming[0] && (
            <div className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                Cheapest ticket right now
              </p>
              <p className="mt-2 font-heading text-3xl font-bold text-white">
                {inr(Math.min(...upcoming.map((c) => c.min_price)))}
              </p>
              <Link
                to={`/concerts/${upcoming[0].id}`}
                className="mt-3 inline-block text-sm text-cyan-300 hover:text-cyan-200"
              >
                Grab seats for {upcoming[0].title} →
              </Link>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
