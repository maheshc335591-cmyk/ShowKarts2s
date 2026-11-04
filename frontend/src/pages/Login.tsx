import { assetUrl } from "@/lib/assets";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Loader2, LogIn, Music4, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { User } from "@/lib/types";

const SIDE_IMG = assetUrl("/demo-media/image-9fd46dd2c605.jpg");

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { beginSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const next = params.get("next") ?? "/dashboard";

  const loginMutation = useMutation({
    mutationFn: (body: { email: string; password: string }) => apiPost<User>("/auth/login", body),
    onSuccess: async (user) => {
      await beginSession();
      toast.success(`Welcome back, ${user.full_name.split(" ")[0]}!`);
      navigate(user.role === "admin" ? "/admin" : next, { replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Login failed"),
  });

  const demoLogin = (role: "customer" | "admin") => {
    loginMutation.mutate(
      role === "admin"
        ? { email: "admin@showkart.in", password: "Admin@123" }
        : { email: "customer@showkart.in", password: "Customer@123" },
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-3xl border border-white/10 lg:block">
        <img src={SIDE_IMG} alt="" className="aspect-[4/3] size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A10] via-[#090A10]/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <Quote />
          <p className="mt-4 max-w-md text-xl font-heading font-bold leading-snug text-white">
            “Two taps from discovering a show to standing under the stage lights.”
          </p>
          <p className="mt-2 text-sm text-slate-400">Join thousands of fans on ShowKart (demo)</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#121524]/85 p-8 shadow-[0_0_40px_rgba(139,92,246,0.15)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
            <Music4 className="size-5 text-white" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-slate-400">Log in to book tickets & view your e-tickets</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4" data-testid="login-form">
          <div>
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
              data-testid="login-email-input"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Link to="/forgot-password" className="text-xs text-cyan-300 hover:text-cyan-200">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
              data-testid="login-password-input"
            />
          </div>
          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 py-5 text-white hover:opacity-90"
            data-testid="login-submit-button"
          >
            {loginMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 size-4" />
            )}
            Log in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-500">
          <span className="h-px flex-1 bg-white/10" /> one-click demo{" "}
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="border-cyan-300/40 text-cyan-200 hover:bg-cyan-400/10"
            onClick={() => demoLogin("customer")}
            data-testid="demo-login-customer-button"
          >
            <Sparkles className="mr-1.5 size-4" /> Fan demo
          </Button>
          <Button
            variant="outline"
            className="border-amber-300/40 text-amber-200 hover:bg-amber-400/10"
            onClick={() => demoLogin("admin")}
            data-testid="demo-login-admin-button"
          >
            <ShieldCheck className="mr-1.5 size-4" /> Admin demo
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          New to ShowKart?{" "}
          <Link
            to="/register"
            className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
            data-testid="login-register-link"
          >
            Create an account <ArrowRight className="size-3.5" />
          </Link>
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <KeyRound className="size-3" /> customer@showkart.in / Customer@123 · admin@showkart.in /
          Admin@123
        </p>
      </div>
    </div>
  );
}

function Quote() {
  return (
    <span className="grid size-10 place-items-center rounded-2xl bg-violet-500/30 font-heading text-2xl text-violet-200">
      ”
    </span>
  );
}
