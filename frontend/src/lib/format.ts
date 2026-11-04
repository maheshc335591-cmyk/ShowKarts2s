import { format, formatDistanceToNowStrict, isBefore } from "date-fns";

export const inr = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

export const fmtDateTime = (iso: string | Date) => format(new Date(iso), "dd MMM yyyy, h:mm a");
export const fmtDate = (iso: string | Date) => format(new Date(iso), "dd MMM yyyy");
export const fmtTime = (iso: string | Date) => format(new Date(iso), "h:mm a");

export const isPast = (iso: string | Date) => isBefore(new Date(iso), new Date());

export const timeAgo = (iso: string | Date) =>
  formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

export const mapsUrl = (venue: string, city: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue} ${city}`)}`;

export const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "S";
