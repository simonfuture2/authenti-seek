import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SolanaProvider } from "@/contexts/SolanaContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
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
import PublicVerifyPage from "./pages/PublicVerifyPage";
import IssuerProfilePage from "./pages/IssuerProfilePage";
import DevelopersPage from "./pages/DevelopersPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/collection" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/verify" element={<PublicVerifyPage />} />
      <Route path="/developers" element={<DevelopersPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/issuer/:issuerId" element={<IssuerProfilePage />} />
      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Collector dashboard (single authenticated tier) */}
      <Route path="/collection" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
      <Route path="/seal" element={<ProtectedRoute><CreateCOAPage /></ProtectedRoute>} />
      <Route path="/transfer" element={<ProtectedRoute><TransferCOAPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportFakePage /></ProtectedRoute>} />

      {/* Legacy path redirects */}
      <Route path="/issuer/create" element={<Navigate to="/seal" replace />} />
      <Route path="/issuer/certificates" element={<Navigate to="/collection" replace />} />
      <Route path="/issuer/transfer" element={<Navigate to="/transfer" replace />} />
      <Route path="/issuer/analytics" element={<Navigate to="/analytics" replace />} />
      <Route path="/verifier/scan" element={<Navigate to="/verify" replace />} />
      <Route path="/verifier/search" element={<Navigate to="/verify" replace />} />
      <Route path="/verifier/history" element={<Navigate to="/history" replace />} />
      <Route path="/verifier/report" element={<Navigate to="/report" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <SolanaProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAUpdatePrompt />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </SolanaProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
