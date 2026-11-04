import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  CalendarPlus,
  IndianRupee,
  Loader2,
  Music2,
  Pencil,
  Plus,
  Receipt,
  ShieldAlert,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { AdminBooking, AdminCustomer, AdminStats, Artist, Concert } from "@/lib/types";

const emptyArtist = {
  name: "",
  genre: "",
  bio: "",
  image_url: "",
  followers: "",
  popular_songs: "",
  albums: "",
  instagram: "",
  spotify: "",
  youtube: "",
};
const emptyConcert = {
  title: "",
  artist_id: "",
  venue_name: "",
  city: "",
  address: "",
  description: "",
  date: "",
  genre: "",
  poster_url: "",
  popularity: 50,
};

export default function AdminDashboard() {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const [artistDialog, setArtistDialog] = useState<null | "new" | Artist>(null);
  const [concertDialog, setConcertDialog] = useState<null | "new" | Concert>(null);
  const [artistForm, setArtistForm] = useState(emptyArtist);
  const [concertForm, setConcertForm] = useState(emptyConcert);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiGet<AdminStats>("/admin/stats"),
    enabled: me?.role === "admin",
  });
  const { data: concerts = [] } = useQuery({
    queryKey: ["admin-concerts"],
    queryFn: () => apiGet<Concert[]>("/admin/concerts"),
    enabled: me?.role === "admin",
  });
  const { data: artists = [] } = useQuery({
    queryKey: ["artists"],
    queryFn: () => apiGet<Artist[]>("/artists"),
    enabled: me?.role === "admin",
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => apiGet<AdminBooking[]>("/admin/bookings"),
    enabled: me?.role === "admin",
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => apiGet<AdminCustomer[]>("/admin/customers"),
    enabled: me?.role === "admin",
  });

  const invalidate = (keys: string[]) =>
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const saveArtist = useMutation({
    mutationFn: () => {
      const body = {
        name: artistForm.name,
        genre: artistForm.genre,
        bio: artistForm.bio,
        image_url: artistForm.image_url,
        followers: artistForm.followers,
        popular_songs: artistForm.popular_songs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        albums: artistForm.albums
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        instagram: artistForm.instagram,
        spotify: artistForm.spotify,
        youtube: artistForm.youtube,
      };
      return artistDialog === "new"
        ? apiPost("/admin/artists", body)
        : apiPatch(`/admin/artists/${(artistDialog as Artist).id}`, body);
    },
    onSuccess: () => {
      toast.success(artistDialog === "new" ? "Artist added" : "Artist updated");
      setArtistDialog(null);
      invalidate(["artists", "admin-concerts"]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteArtist = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/artists/${id}`),
    onSuccess: () => {
      toast.success("Artist deleted");
      invalidate(["artists"]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const saveConcert = useMutation({
    mutationFn: () => {
      if (concertDialog === "new")
        return apiPost("/admin/concerts", {
          ...concertForm,
          date: new Date(concertForm.date).toISOString(),
        });
      return apiPatch(`/admin/concerts/${(concertDialog as Concert).id}`, {
        title: concertForm.title,
        venue_name: concertForm.venue_name,
        city: concertForm.city,
        address: concertForm.address,
        description: concertForm.description,
        genre: concertForm.genre,
        poster_url: concertForm.poster_url,
        popularity: concertForm.popularity,
        ...(concertForm.date ? { date: new Date(concertForm.date).toISOString() } : {}),
      });
    },
    onSuccess: () => {
      toast.success(
        concertDialog === "new" ? "Concert created with all 5 ticket tiers" : "Concert updated",
      );
      setConcertDialog(null);
      invalidate(["admin-concerts", "concerts", "admin-stats"]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const deleteConcert = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/concerts/${id}`),
    onSuccess: () => {
      toast.success("Concert deleted");
      invalidate(["admin-concerts", "concerts", "admin-stats"]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const setBookingStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/admin/bookings/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Booking updated");
      invalidate(["admin-bookings", "admin-stats", "bookings"]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const saveCategory = useMutation({
    mutationFn: ({
      concertId,
      key,
      price,
      quantity,
    }: {
      concertId: string;
      key: string;
      price: number;
      quantity: number;
    }) => apiPatch(`/admin/concerts/${concertId}/categories`, [{ key, price, quantity }]),
    onSuccess: () => {
      toast.success("Ticket pricing updated — live for customers now");
      invalidate(["admin-concerts", "concerts"]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24">
        <div className="size-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }
  if (!me || me.role !== "admin") {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 pt-24 text-center">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[#121524] p-10">
          <ShieldAlert className="mx-auto size-10 text-amber-300" />
          <p className="mt-4 font-heading text-2xl font-bold text-white">Admin access only</p>
          <p className="mt-2 text-sm text-slate-400">
            Log in with an administrator account (admin@showkart.in / Admin@123) to manage ShowKart.
          </p>
          <Button asChild className="mt-6 bg-gradient-to-r from-violet-500 to-cyan-400 text-white">
            <Link to="/login?next=/admin">Log in as admin</Link>
          </Button>
        </div>
      </div>
    );
  }

  const openArtistDialog = (a: Artist | "new") => {
    setArtistDialog(a);
    setArtistForm(
      a === "new"
        ? emptyArtist
        : {
            name: a.name,
            genre: a.genre,
            bio: a.bio,
            image_url: a.image_url,
            followers: a.followers,
            popular_songs: a.popular_songs.join(", "),
            albums: a.albums.join(", "),
            instagram: a.instagram,
            spotify: a.spotify,
            youtube: a.youtube,
          },
    );
  };

  const openConcertDialog = (c: Concert | "new") => {
    setConcertDialog(c);
    if (c === "new") {
      setConcertForm(emptyConcert);
    } else {
      setConcertForm({
        title: c.title,
        artist_id: c.artist_id,
        venue_name: c.venue_name,
        city: c.city,
        address: c.address,
        description: c.description,
        genre: c.genre,
        poster_url: c.poster_url,
        popularity: c.popularity,
        date: toLocalInput(c.date),
      });
    }
  };

  const maxTierSold = Math.max(1, ...(stats?.category_sales ?? []).map((c) => c.tickets));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge className="border-none bg-amber-400/90 text-black">
            <ShieldAlert className="mr-1.5 size-3.5" /> Administrator
          </Badge>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-white">
            ShowKart Control Room
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-violet-400/40 text-violet-200"
            onClick={() => openArtistDialog("new")}
            data-testid="admin-add-artist-button"
          >
            <Plus className="mr-1.5 size-4" /> Artist
          </Button>
          <Button
            className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
            onClick={() => openConcertDialog("new")}
            data-testid="admin-add-concert-button"
          >
            <CalendarPlus className="mr-1.5 size-4" /> Concert
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="bg-white/5" data-testid="admin-tabs">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-1.5 inline size-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="concerts">
            <Ticket className="mr-1.5 inline size-4" /> Concerts
          </TabsTrigger>
          <TabsTrigger value="artists">
            <Music2 className="mr-1.5 inline size-4" /> Artists
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Receipt /> Bookings
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="mr-1.5 inline size-4" /> Customers
          </TabsTrigger>
        </TabsList>

        {/* ---------- OVERVIEW ---------- */}
        <TabsContent value="overview" className="mt-6 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: IndianRupee,
                label: "Total revenue",
                value: inr(stats?.revenue ?? 0),
                sub: `${stats?.payments_count ?? 0} successful payments`,
                test: "admin-stat-revenue",
              },
              {
                icon: Ticket,
                label: "Tickets sold",
                value: String(stats?.tickets_sold ?? 0),
                sub: `${stats?.total_bookings ?? 0} total bookings`,
                test: "admin-stat-tickets",
              },
              {
                icon: Users,
                label: "Customers",
                value: String(stats?.customers ?? 0),
                sub: "registered accounts",
                test: "admin-stat-customers",
              },
              {
                icon: Music2,
                label: "Upcoming concerts",
                value: String(stats?.upcoming_concerts ?? 0),
                sub: "on sale right now",
                test: "admin-stat-concerts",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-[#121524] p-5"
                data-testid={s.test}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15">
                  <s.icon className="size-5 text-violet-300" />
                </span>
                <p className="mt-3 font-heading text-2xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-slate-300">{s.label}</p>
                <p className="text-xs text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#121524] p-6">
              <h2 className="font-heading font-bold text-white">Most popular concerts</h2>
              <div className="mt-4 space-y-3" data-testid="admin-popular-concerts">
                {(stats?.popular_concerts ?? []).map((p, i) => (
                  <div key={p.title}>
                    <div className="flex justify-between text-sm">
                      <span className="truncate text-slate-300">
                        {i + 1}. {p.title}
                      </span>
                      <span className="text-cyan-300">{p.tickets} tickets</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                        style={{
                          width: `${(p.tickets / Math.max(1, stats?.popular_concerts[0]?.tickets ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#121524] p-6">
              <h2 className="font-heading font-bold text-white">Ticket category sales</h2>
              <div className="mt-4 space-y-3" data-testid="admin-category-sales">
                {(stats?.category_sales ?? []).map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm">
                      <span className="truncate text-slate-300">{c.category}</span>
                      <span className="text-cyan-300">{c.tickets}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-500"
                        style={{ width: `${(c.tickets / maxTierSold) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#121524] p-6">
            <h2 className="font-heading font-bold text-white">Upcoming events — fill rate</h2>
            <div
              className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              data-testid="admin-upcoming-events"
            >
              {(stats?.upcoming_events ?? []).map((e) => (
                <div key={e.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <p className="truncate font-semibold text-white">{e.title}</p>
                  <p className="text-xs text-slate-400">
                    {e.city} · {fmtDate(e.date)}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${(e.sold / Math.max(1, e.total)) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {e.sold}/{e.total} seats booked
                  </p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ---------- CONCERTS ---------- */}
        <TabsContent value="concerts" className="mt-6">
          <div
            className="overflow-hidden rounded-3xl border border-white/10 bg-[#121524]"
            data-testid="admin-concert-table"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead>Concert</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Min price</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concerts.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-white/5"
                    data-testid={`admin-concert-row-${c.id}`}
                  >
                    <TableCell>
                      <p className="font-semibold text-white">{c.title}</p>
                      <p className="text-xs text-slate-400">{c.artist_name}</p>
                    </TableCell>
                    <TableCell className="text-slate-300">{c.city}</TableCell>
                    <TableCell className="text-slate-300">{fmtDate(c.date)}</TableCell>
                    <TableCell className="text-cyan-300">{inr(c.min_price)}</TableCell>
                    <TableCell className="text-slate-300">
                      {c.booked ?? "—"}/{c.total_seats}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-white/15 text-slate-300"
                          onClick={() => openConcertDialog(c)}
                          aria-label="Edit concert"
                          data-testid={`admin-edit-concert-${c.id}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-rose-300 hover:bg-rose-500/10"
                          onClick={() => {
                            if (confirm(`Delete "${c.title}"? This cannot be undone.`))
                              deleteConcert.mutate(c.id);
                          }}
                          aria-label="Delete concert"
                          data-testid={`admin-delete-concert-${c.id}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <h2 className="mb-3 mt-10 font-heading text-xl font-bold text-white">
            Ticket pricing & inventory
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {concerts
              .filter((c) => !c.is_past)
              .slice(0, 4)
              .map((c) => (
                <div
                  key={c.id}
                  className="rounded-3xl border border-white/10 bg-[#121524] p-5"
                  data-testid={`admin-pricing-${c.id}`}
                >
                  <p className="truncate font-heading font-bold text-white">{c.title}</p>
                  <p className="text-xs text-slate-400">
                    {c.city} · {fmtDate(c.date)}
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {c.categories.map((cat) => (
                      <CategoryEditor
                        key={cat.key}
                        concertId={c.id}
                        catKey={cat.key}
                        name={cat.name}
                        color={cat.color}
                        price={cat.price}
                        quantity={cat.quantity}
                        onSave={saveCategory.mutate}
                        busy={saveCategory.isPending}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* ---------- ARTISTS ---------- */}
        <TabsContent value="artists" className="mt-6">
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="admin-artists-grid"
          >
            {artists.map((a) => (
              <div
                key={a.id}
                className="flex gap-4 rounded-2xl border border-white/10 bg-[#121524] p-4"
                data-testid={`admin-artist-${a.id}`}
              >
                <img src={a.image_url} alt="" className="size-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{a.name}</p>
                  <p className="truncate text-sm text-slate-400">
                    {a.genre} · {a.followers}
                  </p>
                  <p className="text-xs text-violet-300">{a.concert_count} upcoming</p>
                  <div className="mt-2 flex gap-1.5">
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-white/15 text-slate-300"
                      onClick={() => openArtistDialog(a)}
                      data-testid={`admin-edit-artist-${a.id}`}
                    >
                      <Pencil className="mr-1 size-3" /> Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-rose-300 hover:bg-rose-500/10"
                      onClick={() => {
                        if (confirm(`Delete artist "${a.name}"?`)) deleteArtist.mutate(a.id);
                      }}
                      data-testid={`admin-delete-artist-${a.id}`}
                    >
                      <Trash2 className="mr-1 size-3" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ---------- BOOKINGS ---------- */}
        <TabsContent value="bookings" className="mt-6">
          <div
            className="overflow-hidden rounded-3xl border border-white/10 bg-[#121524]"
            data-testid="admin-bookings-table"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead>Ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Concert</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow
                    key={b.id}
                    className="border-white/5"
                    data-testid={`admin-booking-row-${b.ref}`}
                  >
                    <TableCell className="font-mono text-xs text-cyan-200">{b.ref}</TableCell>
                    <TableCell>
                      <p className="text-sm text-white">{b.user_name}</p>
                      <p className="text-xs text-slate-500">{b.user_email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-40 truncate text-sm text-slate-200">{b.concert_title}</p>
                      <p className="text-xs text-slate-500">{fmtDate(b.date)}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {b.seats.join(", ")}
                    </TableCell>
                    <TableCell className="font-semibold text-white">{inr(b.total)}</TableCell>
                    <TableCell>
                      {b.status === "confirmed" ? (
                        <p className="text-xs text-emerald-300">
                          ✓ {b.payment_method}
                          <br />
                          <span className="text-slate-500">{b.payment_txn}</span>
                        </p>
                      ) : b.status === "cancelled" ? (
                        <p className="text-xs text-amber-300">{b.refund_status ?? "—"}</p>
                      ) : (
                        <p className="text-xs text-slate-500">—</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          b.status === "confirmed"
                            ? "border-emerald-300/40 text-emerald-300"
                            : b.status === "pending"
                              ? "border-amber-300/40 text-amber-300"
                              : b.status === "failed"
                                ? "border-rose-400/40 text-rose-300"
                                : "border-slate-400/40 text-slate-400"
                        }
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(b.status === "confirmed" || b.status === "pending") && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-rose-300 hover:bg-rose-500/10"
                          onClick={() => {
                            if (confirm(`Cancel booking ${b.ref}?`))
                              setBookingStatus.mutate({ id: b.id, status: "cancelled" });
                          }}
                          data-testid={`admin-cancel-booking-${b.ref}`}
                        >
                          Cancel & refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------- CUSTOMERS ---------- */}
        <TabsContent value="customers" className="mt-6">
          <div
            className="overflow-hidden rounded-3xl border border-white/10 bg-[#121524]"
            data-testid="admin-customers-table"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Lifetime spend</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow
                    key={c.id}
                    className="border-white/5"
                    data-testid={`admin-customer-row-${c.email}`}
                  >
                    <TableCell className="font-semibold text-white">{c.full_name}</TableCell>
                    <TableCell className="text-slate-300">{c.email}</TableCell>
                    <TableCell className="text-slate-300">{c.mobile}</TableCell>
                    <TableCell className="text-slate-300">{c.bookings_count}</TableCell>
                    <TableCell className="font-semibold text-cyan-300">
                      {inr(c.total_spent)}
                    </TableCell>
                    <TableCell className="text-slate-400">{fmtDate(c.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ---------- ARTIST DIALOG ---------- */}
      <Dialog open={!!artistDialog} onOpenChange={(o) => !o && setArtistDialog(null)}>
        <DialogContent
          className="max-h-[85vh] max-w-lg overflow-y-auto border-white/10 bg-[#121524] text-slate-100"
          data-testid="admin-artist-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {artistDialog === "new" ? "Add artist" : `Edit ${artistForm.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Name">
              <Input
                value={artistForm.name}
                onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })}
                className={inputCls}
                data-testid="admin-artist-name-input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Genre">
                <Input
                  value={artistForm.genre}
                  onChange={(e) => setArtistForm({ ...artistForm, genre: e.target.value })}
                  className={inputCls}
                  data-testid="admin-artist-genre-input"
                />
              </Field>
              <Field label="Followers">
                <Input
                  value={artistForm.followers}
                  onChange={(e) => setArtistForm({ ...artistForm, followers: e.target.value })}
                  placeholder="5.2M"
                  className={inputCls}
                  data-testid="admin-artist-followers-input"
                />
              </Field>
            </div>
            <Field label="Biography">
              <Textarea
                rows={3}
                value={artistForm.bio}
                onChange={(e) => setArtistForm({ ...artistForm, bio: e.target.value })}
                className={inputCls}
                data-testid="admin-artist-bio-input"
              />
            </Field>
            <Field label="Image URL">
              <Input
                value={artistForm.image_url}
                onChange={(e) => setArtistForm({ ...artistForm, image_url: e.target.value })}
                className={inputCls}
                data-testid="admin-artist-image-input"
              />
            </Field>
            <Field label="Popular songs (comma separated)">
              <Input
                value={artistForm.popular_songs}
                onChange={(e) => setArtistForm({ ...artistForm, popular_songs: e.target.value })}
                className={inputCls}
                data-testid="admin-artist-songs-input"
              />
            </Field>
            <Field label="Albums (comma separated)">
              <Input
                value={artistForm.albums}
                onChange={(e) => setArtistForm({ ...artistForm, albums: e.target.value })}
                className={inputCls}
                data-testid="admin-artist-albums-input"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/15 text-slate-300"
              onClick={() => setArtistDialog(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveArtist.mutate()}
              disabled={
                saveArtist.isPending || artistForm.name.length < 2 || artistForm.genre.length < 2
              }
              className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
              data-testid="admin-artist-save-button"
            >
              {saveArtist.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Save artist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- CONCERT DIALOG ---------- */}
      <Dialog open={!!concertDialog} onOpenChange={(o) => !o && setConcertDialog(null)}>
        <DialogContent
          className="max-h-[85vh] max-w-lg overflow-y-auto border-white/10 bg-[#121524] text-slate-100"
          data-testid="admin-concert-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {concertDialog === "new"
                ? "Create concert (all 5 ticket tiers included)"
                : `Edit ${concertForm.title}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Title">
              <Input
                value={concertForm.title}
                onChange={(e) => setConcertForm({ ...concertForm, title: e.target.value })}
                className={inputCls}
                data-testid="admin-concert-title-input"
              />
            </Field>
            {concertDialog === "new" && (
              <Field label="Artist">
                <Select
                  value={concertForm.artist_id}
                  onValueChange={(v: string) => setConcertForm({ ...concertForm, artist_id: v })}
                >
                  <SelectTrigger
                    className="border-white/10 bg-white/5 text-slate-100"
                    data-testid="admin-concert-artist-select"
                  >
                    <SelectValue placeholder="Select artist">
                      {artists.find((artist) => artist.id === concertForm.artist_id)?.name ??
                        "Select artist"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                    {artists.map((a) => (
                      <SelectItem
                        key={a.id}
                        value={a.id}
                        className="data-[highlighted]:bg-violet-500/20"
                      >
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Venue">
                <Input
                  value={concertForm.venue_name}
                  onChange={(e) => setConcertForm({ ...concertForm, venue_name: e.target.value })}
                  className={inputCls}
                  data-testid="admin-concert-venue-input"
                />
              </Field>
              <Field label="City">
                <Input
                  value={concertForm.city}
                  onChange={(e) => setConcertForm({ ...concertForm, city: e.target.value })}
                  className={inputCls}
                  data-testid="admin-concert-city-input"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date & time">
                <Input
                  type="datetime-local"
                  value={concertForm.date}
                  onChange={(e) => setConcertForm({ ...concertForm, date: e.target.value })}
                  className={inputCls}
                  data-testid="admin-concert-date-input"
                />
              </Field>
              <Field label="Genre">
                <Input
                  value={concertForm.genre}
                  onChange={(e) => setConcertForm({ ...concertForm, genre: e.target.value })}
                  className={inputCls}
                  data-testid="admin-concert-genre-input"
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                rows={3}
                value={concertForm.description}
                onChange={(e) => setConcertForm({ ...concertForm, description: e.target.value })}
                className={inputCls}
                data-testid="admin-concert-description-input"
              />
            </Field>
            <Field label="Poster image URL">
              <Input
                value={concertForm.poster_url}
                onChange={(e) => setConcertForm({ ...concertForm, poster_url: e.target.value })}
                className={inputCls}
                data-testid="admin-concert-poster-input"
              />
            </Field>
            <p className="text-xs text-slate-500">
              Sample data is clearly labelled “Sample Event” on the customer site. New concerts
              follow the standard 5-tier pricing (₹499–₹4,999) — adjust per concert under Ticket
              pricing.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/15 text-slate-300"
              onClick={() => setConcertDialog(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveConcert.mutate()}
              disabled={
                saveConcert.isPending ||
                concertForm.title.length < 3 ||
                !concertForm.venue_name ||
                !concertForm.city ||
                (concertDialog === "new" ? !concertForm.artist_id || !concertForm.date : false)
              }
              className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
              data-testid="admin-concert-save-button"
            >
              {saveConcert.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Save
              concert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const inputCls = "border-white/10 bg-white/5 text-slate-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-slate-400">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CategoryEditor({
  concertId,
  catKey,
  name,
  color,
  price,
  quantity,
  onSave,
  busy,
}: {
  concertId: string;
  catKey: string;
  name: string;
  color: string;
  price: number;
  quantity: number;
  onSave: (v: { concertId: string; key: string; price: number; quantity: number }) => void;
  busy: boolean;
}) {
  const [p, setP] = useState(String(price));
  const [q, setQ] = useState(String(quantity));
  const dirty = Number(p) !== price || Number(q) !== quantity;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 p-2.5">
      <span
        className="inline-block size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{name}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">₹</span>
        <Input
          value={p}
          onChange={(e) => setP(e.target.value.replace(/\D/g, ""))}
          className="h-8 w-20 border-white/10 bg-[#0A0D18] text-center text-sm text-slate-100"
          aria-label={`${name} price`}
          data-testid={`admin-price-input-${concertId}-${catKey}`}
        />
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value.replace(/\D/g, ""))}
        className="h-8 w-16 border-white/10 bg-[#0A0D18] text-center text-sm text-slate-100"
        aria-label={`${name} quantity`}
        data-testid={`admin-qty-input-${concertId}-${catKey}`}
      />
      <Button
        size="xs"
        disabled={!dirty || busy}
        onClick={() => onSave({ concertId, key: catKey, price: Number(p), quantity: Number(q) })}
        className="bg-violet-500 text-white hover:bg-violet-400"
        data-testid={`admin-price-save-${concertId}-${catKey}`}
      >
        Save
      </Button>
    </div>
  );
}
