import { useState } from "react";
import { toast } from "sonner";
import { Banknote, CreditCard, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiPost } from "@/lib/api";
import { inr } from "@/lib/format";
import type { Booking } from "@/lib/types";

const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"];

export default function PaymentModal({
  booking,
  open,
  onOpenChange,
  onPaid,
}: {
  booking: Booking;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPaid: (b: Booking) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [bank, setBank] = useState("");

  const pay = async (method: "upi" | "card" | "netbanking", simulateFailure = false) => {
    setBusy(true);
    try {
      // Simulated processing delay — mirrors a real gateway round-trip. No card/UPI
      // data is ever sent: only the method name reaches the backend.
      await new Promise((r) => setTimeout(r, 1800));
      const res = await apiPost<{ booking: Booking }>(`/bookings/${booking.id}/pay`, {
        method,
        simulate_failure: simulateFailure,
      });
      toast.success(`Payment successful! ${res.booking.ref} confirmed.`);
      onPaid(res.booking);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      toast.error(msg);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent
        className="max-w-md border-white/10 bg-[#121524] text-slate-100"
        data-testid="payment-modal"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-white">Secure Payment</DialogTitle>
          <DialogDescription className="text-slate-400">
            SIMULATED gateway — no real money is charged. Amount payable:{" "}
            <span className="font-bold text-cyan-300">{inr(booking.total)}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upi">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            <TabsTrigger value="upi" data-testid="payment-tab-upi">
              <Smartphone className="mr-1 inline size-4" /> UPI
            </TabsTrigger>
            <TabsTrigger value="card" data-testid="payment-tab-card">
              <CreditCard className="mr-1 inline size-4" /> Card
            </TabsTrigger>
            <TabsTrigger value="netbanking" data-testid="payment-tab-netbanking">
              <Banknote className="mr-1 inline size-4" /> NetBanking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upi" className="mt-4 space-y-3">
            <div className="grid grid-cols-4 gap-2" data-testid="upi-app-chips">
              {["Google Pay", "PhonePe", "Paytm"].map((app) => (
                <div
                  key={app}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-xs text-slate-300"
                >
                  {app}
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="upi-id" className="text-slate-300">
                UPI ID
              </Label>
              <Input
                id="upi-id"
                placeholder="yourname@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
                data-testid="upi-id-input"
              />
            </div>
            <Button
              disabled={busy || !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId)}
              onClick={() => pay("upi")}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90"
              data-testid="simulated-upi-pay-button"
            >
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              Pay {inr(booking.total)} via UPI
            </Button>
          </TabsContent>

          <TabsContent value="card" className="mt-4 space-y-3">
            <div>
              <Label className="text-slate-300">Card number (test)</Label>
              <Input
                inputMode="numeric"
                placeholder="4111 1111 1111 1111"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                className="border-white/10 bg-white/5 text-slate-100"
                data-testid="card-number-input"
              />
            </div>
            <div>
              <Label className="text-slate-300">Name on card</Label>
              <Input
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                className="border-white/10 bg-white/5 text-slate-100"
                data-testid="card-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Expiry</Label>
                <Input
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  className="border-white/10 bg-white/5 text-slate-100"
                  data-testid="card-expiry-input"
                />
              </div>
              <div>
                <Label className="text-slate-300">CVV</Label>
                <Input
                  type="password"
                  placeholder="•••"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  className="border-white/10 bg-white/5 text-slate-100"
                  data-testid="card-cvv-input"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Card details stay in your browser — never stored or sent to the server.
            </p>
            <Button
              disabled={
                busy ||
                card.number.replace(/\s/g, "").length < 12 ||
                !card.name ||
                !card.expiry ||
                card.cvv.length < 3
              }
              onClick={() => pay("card")}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90"
              data-testid="simulated-card-pay-button"
            >
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              Pay {inr(booking.total)}
            </Button>
          </TabsContent>

          <TabsContent value="netbanking" className="mt-4 space-y-3">
            <div>
              <Label className="text-slate-300">Choose your bank</Label>
              <Select value={bank} onValueChange={(v: string) => setBank(v)}>
                <SelectTrigger
                  className="mt-1.5 border-white/10 bg-white/5 text-slate-100"
                  data-testid="bank-select"
                >
                  <SelectValue placeholder="Select bank">{bank}</SelectValue>
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#121524] text-slate-100">
                  {BANKS.map((b) => (
                    <SelectItem key={b} value={b} className="data-[highlighted]:bg-violet-500/20">
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={busy || !bank}
              onClick={() => pay("netbanking")}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90"
              data-testid="simulated-netbanking-pay-button"
            >
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              Pay {inr(booking.total)} via {bank || "NetBanking"}
            </Button>
          </TabsContent>
        </Tabs>

        <button
          onClick={() => pay("upi", true)}
          disabled={busy}
          className="w-full rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          data-testid="simulate-payment-failure-button"
        >
          Simulate a failed payment (demo)
        </button>
      </DialogContent>
    </Dialog>
  );
}
