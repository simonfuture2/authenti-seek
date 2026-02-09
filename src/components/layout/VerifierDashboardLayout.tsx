import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  CheckCircle2,
  QrCode,
  Search,
  History,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/wallet/WalletButton";
import { CreditsDisplay } from "@/components/credits/CreditsDisplay";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const verifierNavItems = [
  { icon: QrCode, label: "Scan QR", path: "/verifier/scan" },
  { icon: Search, label: "Search", path: "/verifier/search" },
  { icon: History, label: "History", path: "/verifier/history" },
  { icon: AlertTriangle, label: "Report Fake", path: "/verifier/report" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function VerifierDashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { connected } = useWallet();

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-solana-gradient">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AuthentiSeal</span>
            <NetworkBadge compact />
          </div>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-secondary/10">
              <User className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.display_name || "Verifier"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {verifierNavItems.map((item) => (
            <motion.button
              key={item.path}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </motion.button>
          ))}
        </nav>

        {/* Credits Display */}
        <div className="px-4 py-2">
          <CreditsDisplay compact />
        </div>

        {/* Wallet connection */}
        <div className="p-4 border-t border-sidebar-border">
          <WalletButton />
          {connected && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Wallet connected
            </p>
          )}
        </div>

        {/* Sign out */}
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-secondary" />
            <span className="font-semibold gradient-text">AuthentiSeal</span>
            <NetworkBadge compact />
          </div>
        </header>

        {/* Page content - add bottom padding for mobile bottom nav */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        items={[
          { icon: QrCode, label: "Scan", path: "/verifier/scan" },
          { icon: Search, label: "Search", path: "/verifier/search" },
          { icon: History, label: "History", path: "/verifier/history" },
          { icon: AlertTriangle, label: "Report", path: "/verifier/report" },
        ]}
      />
    </div>
  );
}
