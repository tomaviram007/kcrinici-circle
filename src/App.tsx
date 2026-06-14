import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Header from "@/components/layout/Header";
import PageTransition from "@/components/layout/PageTransition";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Footer from "@/components/layout/Footer";
import BirthdayPopup from "@/components/BirthdayPopup";
import SmartAdBanner from "@/components/ads/SmartAdBanner";
import { toast } from "sonner";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Announcements from "./pages/Announcements";
import Jobs from "./pages/Jobs";
import Members from "./pages/Members";
import MemberProfile from "./pages/MemberProfile";
import Events from "./pages/Events";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Gallery from "./pages/Gallery";
import Recommendations from "./pages/Recommendations";
import Deals from "./pages/Deals";
import SecondHand from "./pages/SecondHand";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Regulations from "./pages/Regulations";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionExpired } = useAuth();
  const hideHeader = ["/login", "/register", "/pending", "/reset-password"].includes(location.pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Handle session expiry
  useEffect(() => {
    if (sessionExpired) {
      toast.error("החיבור פג, אנא התחבר מחדש", { duration: 5000 });
      navigate("/login", { replace: true });
    }
  }, [sessionExpired, navigate]);

  return (
    <>
      {!hideHeader && <Header />}
      <PageTransition>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending" element={<PendingApproval />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Index />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
        <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/members/:id" element={<ProtectedRoute><MemberProfile /></ProtectedRoute>} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<Events />} />
        <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
        <Route path="/secondhand" element={<ProtectedRoute><SecondHand /></ProtectedRoute>} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/regulations" element={<Regulations />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </PageTransition>
      {/* Global ad banner before footer */}
      {!hideHeader && (
        <div className="mx-auto max-w-7xl px-4 py-6">
          <SmartAdBanner placement="inline" />
        </div>
      )}
      {!hideHeader && <Footer />}
      {!hideHeader && <FloatingWhatsApp />}
      {!hideHeader && <BirthdayPopup />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <AppLayout />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
