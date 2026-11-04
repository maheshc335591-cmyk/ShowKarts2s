import BrandLogo from "@/components/BrandLogo";
import { useState } from "react";
import { toast } from "sonner";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  ChevronDown,
  Search,
  ShoppingBag,
  Ticket,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe, useSession } from "@/lib/session";
import { initial } from "@/lib/format";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore Concerts" },
  { to: "/artists", label: "Artists" },
  { to: "/about", label: "About Us" },
];

export default function Navbar() {
  const { data: me } = useMe();
  const { endSession } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await endSession();
      setOpen(false);
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium tracking-wide transition-colors hover:text-white ${isActive ? "text-white" : "text-slate-300/80"}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090A10]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center"
          aria-label="ShowKart home"
          data-testid="navbar-logo-link"
        >
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls} end={l.to === "/"}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-slate-300 hover:text-white md:inline-flex"
            onClick={() => navigate("/explore")}
            data-testid="navbar-search-button"
          >
            <Search className="size-4" /> Search
          </Button>

          {me ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                data-testid="navbar-user-menu"
                aria-label={`Open account menu for ${me.full_name}`}
              >
                <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white">
                  {initial(me.full_name)}
                </span>
                <span className="hidden max-w-28 truncate text-sm text-slate-200 sm:inline">
                  {me.full_name}
                </span>
                {me.role === "admin" && <ShieldCheck className="size-4 text-amber-300" />}
                <ChevronDown className="size-3.5 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#121524]">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-slate-300">{me.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => navigate("/dashboard")}
                    data-testid="navbar-dashboard-link"
                  >
                    <LayoutDashboard className="size-4" /> My Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/dashboard?tab=tickets")}
                    data-testid="navbar-tickets-link"
                  >
                    <Ticket className="size-4" /> My Tickets
                  </DropdownMenuItem>
                  {me.role === "admin" && (
                    <DropdownMenuItem
                      onClick={() => navigate("/admin")}
                      data-testid="navbar-admin-link"
                    >
                      <ShieldCheck className="size-4" /> Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    data-testid="navbar-logout-button"
                  >
                    <LogOut className="size-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-200 hover:text-white"
                onClick={() => navigate("/login")}
                data-testid="navbar-login-button"
              >
                Login
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-[0_0_16px_rgba(139,92,246,0.45)] hover:opacity-90"
                onClick={() => navigate("/register")}
                data-testid="navbar-register-button"
              >
                <Sparkles className="size-4" /> Register
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Menu"
                  data-testid="navbar-mobile-menu"
                />
              }
            >
              <Menu className="size-5 text-slate-200" />
            </SheetTrigger>
            <SheetContent side="right" className="border-white/10 bg-[#0B0E1B] text-slate-100">
              <SheetTitle className="font-heading text-lg text-white">ShowKart</SheetTitle>
              <nav className="mt-4 flex flex-col gap-1">
                {LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="my-3 h-px bg-white/10" />
                {me ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5"
                    >
                      My Dashboard
                    </Link>
                    {me.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="rounded-lg px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-white/5"
                      data-testid="mobile-logout-button"
                      disabled={loggingOut}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 px-1">
                    <Button
                      onClick={() => {
                        setOpen(false);
                        navigate("/login");
                      }}
                    >
                      <UserIcon className="size-4" /> Login
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        navigate("/register");
                      }}
                    >
                      <ShoppingBag className="size-4" /> Create account
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
