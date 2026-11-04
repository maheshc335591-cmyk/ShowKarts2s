import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Home from "@/pages/Home";
import PageErrorBoundary from "@/components/PageErrorBoundary";

const ExploreConcerts = lazy(() => import("@/pages/ExploreConcerts"));
const Artists = lazy(() => import("@/pages/Artists"));
const ArtistProfile = lazy(() => import("@/pages/ArtistProfile"));
const ConcertDetails = lazy(() => import("@/pages/ConcertDetails"));
const SeatSelection = lazy(() => import("@/pages/SeatSelection"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const ETicket = lazy(() => import("@/pages/ETicket"));
const CustomerDashboard = lazy(() => import("@/pages/CustomerDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const About = lazy(() => import("@/pages/About"));

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-[#090A10]">
      <Navbar />
      <main className="flex-1">
        <PageErrorBoundary key={location.pathname}>
          <Suspense
            fallback={
              <div
                role="status"
                className="grid min-h-[70vh] place-items-center pt-24 text-slate-300"
              >
                Loading page...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<ExploreConcerts />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/:id" element={<ArtistProfile />} />
              <Route path="/concerts/:id" element={<ConcertDetails />} />
              <Route path="/booking/:concertId/seats" element={<SeatSelection />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/ticket/:bookingId" element={<ETicket />} />
              <Route path="/dashboard" element={<CustomerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </PageErrorBoundary>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
