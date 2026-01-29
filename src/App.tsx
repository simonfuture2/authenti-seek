import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SolanaProvider } from "@/contexts/SolanaContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import CreateCOAPage from "./pages/issuer/CreateCOAPage";
import CertificatesPage from "./pages/issuer/CertificatesPage";
import TransferCOAPage from "./pages/issuer/TransferCOAPage";
import AnalyticsPage from "./pages/issuer/AnalyticsPage";
import ScanQRPage from "./pages/verifier/ScanQRPage";
import SearchPage from "./pages/verifier/SearchPage";
import HistoryPage from "./pages/verifier/HistoryPage";
import ReportFakePage from "./pages/verifier/ReportFakePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "issuer" | "verifier" }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === "issuer" ? "/issuer/create" : "/verifier/scan"} replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (user && role) {
    return <Navigate to={role === "issuer" ? "/issuer/create" : "/verifier/scan"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      
      {/* Issuer Routes */}
      <Route path="/issuer/create" element={<ProtectedRoute requiredRole="issuer"><CreateCOAPage /></ProtectedRoute>} />
      <Route path="/issuer/certificates" element={<ProtectedRoute requiredRole="issuer"><CertificatesPage /></ProtectedRoute>} />
      <Route path="/issuer/transfer" element={<ProtectedRoute requiredRole="issuer"><TransferCOAPage /></ProtectedRoute>} />
      <Route path="/issuer/analytics" element={<ProtectedRoute requiredRole="issuer"><AnalyticsPage /></ProtectedRoute>} />
      
      {/* Verifier Routes */}
      <Route path="/verifier/scan" element={<ProtectedRoute requiredRole="verifier"><ScanQRPage /></ProtectedRoute>} />
      <Route path="/verifier/search" element={<ProtectedRoute requiredRole="verifier"><SearchPage /></ProtectedRoute>} />
      <Route path="/verifier/history" element={<ProtectedRoute requiredRole="verifier"><HistoryPage /></ProtectedRoute>} />
      <Route path="/verifier/report" element={<ProtectedRoute requiredRole="verifier"><ReportFakePage /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SolanaProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </SolanaProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
