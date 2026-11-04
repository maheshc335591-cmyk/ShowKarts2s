import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgePercent, Loader2, Mail, QrCode, Ticket, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

export default function Register() {
  const navigate = useNavigate();
  const { beginSession } = useSession();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile: "",
    password: "",
    confirm_password: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const registerMutation = useMutation({
    mutationFn: () => apiPost<User>("/auth/register", form),
    onSuccess: async (user) => {
      await beginSession();
      toast.success(`Welcome to ShowKart, ${user.full_name.split(" ")[0]}!`);
      navigate("/dashboard", { replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Registration failed"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    registerMutation.mutate();
  };

  const perks = [
    { icon: Ticket, text: "Instant QR e-tickets on your dashboard" },
    { icon: BadgePercent, text: "Use SHOWCOLLEGE for 15% off your first show" },
    { icon: QrCode, text: "Wishlist artists & get show reminders" },
  ];

  return (
    <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#121524]/85 p-8 shadow-[0_0_40px_rgba(139,92,246,0.15)] backdrop-blur-xl">
        <h1 className="font-heading text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Free forever — only pay for tickets (simulated).
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4" data-testid="register-form">
          <div>
            <Label htmlFor="full_name" className="text-slate-300">
              Full name
            </Label>
            <Input
              id="full_name"
              required
              minLength={3}
              value={form.full_name}
              onChange={set("full_name")}
              placeholder="Aarav Sharma"
              className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
              data-testid="register-name-input"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="you@email.com"
                className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
                data-testid="register-email-input"
              />
            </div>
            <div>
              <Label htmlFor="mobile" className="text-slate-300">
                Mobile
              </Label>
              <Input
                id="mobile"
                required
                value={form.mobile}
                onChange={set("mobile")}
                placeholder="98765 43210"
                className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
                data-testid="register-mobile-input"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={set("password")}
                placeholder="8+ chars, letters & numbers"
                className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
                data-testid="register-password-input"
              />
            </div>
            <div>
              <Label htmlFor="confirm_password" className="text-slate-300">
                Confirm password
              </Label>
              <Input
                id="confirm_password"
                type="password"
                required
                value={form.confirm_password}
                onChange={set("confirm_password")}
                placeholder="Repeat password"
                className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
                data-testid="register-confirm-password-input"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 py-5 text-white hover:opacity-90"
            data-testid="register-submit-button"
          >
            {registerMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 size-4" />
            )}
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-cyan-300 hover:text-cyan-200"
            data-testid="register-login-link"
          >
            Log in
          </Link>
        </p>
      </div>

      <div className="relative hidden overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-900/40 to-cyan-900/20 p-10 lg:block">
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-violet-500/20 blur-[100px]" />
        <div className="absolute -bottom-16 -left-10 size-72 rounded-full bg-cyan-500/15 blur-[100px]" />
        <h2 className="relative font-heading text-3xl font-bold text-white">
          Why fans pick ShowKart
        </h2>
        <ul className="relative mt-8 space-y-5">
          {perks.map((p) => (
            <li
              key={p.text}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
                <p.icon className="size-5 text-white" />
              </span>
              <p className="text-slate-200">{p.text}</p>
            </li>
          ))}
        </ul>
        <p className="relative mt-8 flex items-center gap-2 text-sm text-slate-400">
          <Mail className="size-4" /> No spam — only show alerts you ask for.
        </p>
      </div>
    </div>
  );
}
