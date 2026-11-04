import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, KeyRound, Loader2, MailQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [hint, setHint] = useState("");

  const forgotMutation = useMutation({
    mutationFn: () =>
      apiPost<{ message: string; simulated_code: string | null }>("/auth/forgot-password", {
        email,
      }),
    onSuccess: (res) => {
      setHint(res.simulated_code ?? "");
      setStep(2);
      toast.info(res.message);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiPost<{ message: string }>("/auth/reset-password", {
        email,
        code,
        new_password: newPassword,
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      window.location.href = "/login";
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reset failed"),
  });

  return (
    <div className="grid min-h-screen place-items-center px-4 pb-16 pt-28">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#121524]/85 p-8 shadow-[0_0_40px_rgba(139,92,246,0.15)] backdrop-blur-xl">
        <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400">
          <KeyRound className="size-5 text-white" />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-400">Simulated verification — no email is sent.</p>

        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              forgotMutation.mutate();
            }}
            className="mt-6 space-y-4"
            data-testid="forgot-step1-form"
          >
            <div>
              <Label htmlFor="email" className="text-slate-300">
                Registered email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
                data-testid="forgot-email-input"
              />
            </div>
            <Button
              type="submit"
              disabled={forgotMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 py-5 text-white hover:opacity-90"
              data-testid="forgot-send-code-button"
            >
              {forgotMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <MailQuestion className="mr-2 size-4" />
              )}
              Get reset code
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetMutation.mutate();
            }}
            className="mt-6 space-y-4"
            data-testid="forgot-step2-form"
          >
            {hint && (
              <p
                className="flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-200"
                data-testid="forgot-code-hint"
              >
                <Info className="mt-0.5 size-3.5 shrink-0" /> Demo shortcut — your simulated code is{" "}
                <span className="font-mono font-bold">{hint}</span>
              </p>
            )}
            <div>
              <Label className="text-slate-300">6-digit code</Label>
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 123456"
                className="mt-1.5 border-white/10 bg-white/5 font-mono text-slate-100"
                data-testid="forgot-code-input"
              />
            </div>
            <div>
              <Label className="text-slate-300">New password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8+ chars, letters & numbers"
                className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
                data-testid="forgot-new-password-input"
              />
            </div>
            <Button
              type="submit"
              disabled={resetMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 py-5 text-white hover:opacity-90"
              data-testid="forgot-reset-button"
            >
              {resetMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 size-4" />
              )}
              Reset password
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Remembered it?{" "}
          <Link to="/login" className="text-cyan-300 hover:text-cyan-200">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
