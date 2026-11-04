import BrandLogo from "@/components/BrandLogo";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  MapPin,
  Mic2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { fmtDateTime, inr } from "@/lib/format";
import type { Booking } from "@/lib/types";

export default function ETicket() {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [params] = useSearchParams();
  const from = params.get("from");

  const {
    data: booking,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => apiGet<Booking>(`/bookings/${bookingId}`),
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24">
        <div className="size-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }
  if (isError || !booking || booking.status !== "confirmed") {
    return (
      <div className="grid min-h-[70vh] place-items-center pt-24 text-center">
        <div>
          <p className="font-heading text-2xl font-bold text-white">Ticket not found</p>
          <p className="mt-2 text-sm text-slate-400">
            Only confirmed bookings have valid tickets. Log in with the booking account to view
            yours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-28 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className="flex items-center gap-2 text-emerald-300"
            data-testid="ticket-success-banner"
          >
            <CheckCircle2 className="size-5" /> Payment successful — booking confirmed
          </p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-white">
            Your e-tickets
          </h1>
        </div>
        <div className="flex gap-2">
          {from !== "dashboard" && (
            <Button
              variant="outline"
              className="border-white/15 text-slate-300"
              onClick={() => navigate("/dashboard?tab=tickets")}
              data-testid="ticket-dashboard-button"
            >
              My tickets
            </Button>
          )}
          <Button
            className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90"
            onClick={() => window.print()}
            data-testid="download-ticket-pdf-button"
          >
            <Download className="mr-2 size-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="print-area space-y-5">
        {booking.tickets.map((t, idx) => (
          <div
            key={t.ticket_id}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#15192E] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            data-testid={`eticket-card-${t.seat_id}`}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400" />
            <div className="grid gap-0 sm:grid-cols-[1fr_240px]">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <BrandLogo />
                  <Badge variant="outline" className="border-emerald-300/40 text-emerald-200">
                    E-Ticket
                  </Badge>
                </div>

                <h2 className="mt-5 font-heading text-2xl font-bold text-white">
                  {booking.concert_title}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-violet-300">
                  <Mic2 className="size-4" /> {booking.artist_name}
                </p>

                <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-cyan-300" /> {fmtDateTime(booking.date)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 text-cyan-300" /> {booking.venue_name}, {booking.city}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { l: "Ticket ID", v: t.ticket_id, mono: true },
                    { l: "Booking ID", v: booking.ref, mono: true },
                    { l: "Customer", v: booking.customer_name, mono: false },
                    { l: "Seat", v: t.seat_id, mono: true },
                  ].map((f) => (
                    <div
                      key={f.l}
                      className="rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{f.l}</p>
                      <p
                        className={`mt-0.5 text-sm font-bold text-white ${f.mono ? "font-mono" : "font-sans"}`}
                      >
                        {f.v}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-300">
                  <p>
                    Ticket category:{" "}
                    <span className="font-semibold text-white">{t.category_name}</span>
                  </p>
                  <p>
                    Amount paid: <span className="font-semibold text-cyan-300">{inr(t.price)}</span>{" "}
                    <span className="text-xs text-slate-500">(ticket base price)</span>
                  </p>
                </div>
                {idx === 0 && (
                  <p className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <ShieldCheck className="size-4 text-emerald-400" /> Simulated payment — no real
                    money charged · Payment ref:
                    <span className="font-mono font-semibold text-slate-300">
                      {booking.payment_txn ?? "—"}
                    </span>
                  </p>
                )}
              </div>

              <div className="relative flex flex-col items-center justify-center gap-3 border-t border-dashed border-slate-600 bg-[#121524] p-6 sm:border-l sm:border-t-0">
                <span className="absolute -left-2.5 top-1/2 hidden size-5 -translate-y-1/2 rounded-full bg-[#090A10] sm:block" />
                <QRCodeSVG
                  value={`SHOWKART|${booking.ref}|${t.ticket_id}|${t.seat_id}|${t.qr_token}`}
                  size={132}
                  bgColor="#FFFFFF"
                  fgColor="#090A10"
                  className="rounded-xl bg-white p-2"
                  data-testid="eticket-qr-code"
                />
                <p className="flex items-center gap-1.5 text-xs text-cyan-200">
                  <QrCode className="size-3.5" /> QR e-ticket
                </p>
                <p className="text-center text-[10px] leading-relaxed text-slate-500">
                  Demo QR — show this ticket at presentation.
                  <br />
                  Carry a photo ID along with this pass.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Tip: use <span className="text-cyan-300">Download PDF</span> and choose “Save as PDF” — or
        just show the QR from your phone at the gate.
      </p>
    </div>
  );
}
