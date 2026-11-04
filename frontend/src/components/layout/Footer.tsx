import BrandLogo from "@/components/BrandLogo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import {
  SiFacebook as Facebook,
  SiInstagram as Instagram,
  SiX as Twitter,
  SiYoutube as Youtube,
} from "@icons-pack/react-simple-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await apiPost<{ message: string }>("/newsletter", { email });
      toast.success(res.message || "Subscribed!");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="mt-24 border-t border-white/10 bg-[#07080E]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4">
        <div>
          <Link to="/" aria-label="ShowKart home">
            <BrandLogo />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            Discover concerts, pick your seat, and keep your QR tickets in one place. Payments are
            simulated and no real money is charged.
          </p>
          <div className="mt-5 flex gap-3">
            {[Instagram, Twitter, Youtube, Facebook].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="social link"
                className="grid size-9 place-items-center rounded-full border border-white/10 text-slate-300 transition-colors hover:border-violet-400/60 hover:text-white"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            Quick Links
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            <li>
              <Link to="/explore" className="hover:text-cyan-300">
                Explore Concerts
              </Link>
            </li>
            <li>
              <Link to="/artists" className="hover:text-cyan-300">
                Artists
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-cyan-300">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/about#faq" className="hover:text-cyan-300">
                FAQs & Support
              </Link>
            </li>
            <li>
              <Link to="/about#refund-policy" className="hover:text-cyan-300">
                Refund Policy
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-cyan-300">
                My Bookings
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            Contact
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 text-violet-400" /> ShowKart Labs, DTI Project Hub,
              Pune 411045
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 text-violet-400" /> 1800-SHOWKART (toll free demo)
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 text-violet-400" /> hello@showkart.in
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            Show Alerts
          </h4>
          <p className="mt-4 text-sm text-slate-400">
            Get early access to tickets and secret drop codes.
          </p>
          <form onSubmit={subscribe} className="mt-4 flex gap-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
              data-testid="newsletter-email-input"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy}
              className="shrink-0 bg-gradient-to-r from-violet-500 to-cyan-400"
              data-testid="newsletter-subscribe-button"
              aria-label="Subscribe"
            >
              <Send className="size-4" />
            </Button>
          </form>
          <p className="mt-3 text-xs text-slate-500">No real emails are sent.</p>
          {import.meta.env.VITE_DEMO_MODE === "true" && (
            <p className="mt-3 text-xs text-slate-500">
              Browser demo: accounts, bookings and admin changes are saved only on this device. Use
              sample details and a password you do not use elsewhere.
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} SNPSU. All rights reserved.
      </div>
    </footer>
  );
}
