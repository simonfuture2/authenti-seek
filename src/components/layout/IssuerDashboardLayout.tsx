import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  PlusCircle,
  Send,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  FileImage,
  Droplets,
  QrCode,
  Search,
} from "lucide-react";
import authentisealIcon from "@/assets/authentiseal-icon.png";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/wallet/WalletButton";
import { CreditsDisplay } from "@/components/credits/CreditsDisplay";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { SolPriceTicker } from "@/components/wallet/SolPriceTicker";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const issuerNavItems = [
  { icon: FileImage, label: "Collection", path: "/collection" },
  { icon: PlusCircle, label: "Seal a Card", path: "/seal" },
  { icon: Send, label: "Transfer", path: "/transfer" },
  { icon: QrCode, label: "Verify", path: "/verify" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function IssuerDashboardLayout({ children }: DashboardLayoutProps) {
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
            <img src={authentisealIcon} alt="AuthentiSeal" className="h-9 w-9 rounded-lg" />
            <div className="flex flex-col">
              <span className="text-xl font-bold gradient-text leading-tight">AuthentiSeal</span>
              <SolPriceTicker compact />
            </div>
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
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.display_name || "Collector"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.company_name || profile?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {issuerNavItems.map((item) => (
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
                (location.pathname + location.search) === item.path ||
                (item.path === "/issuer/certificates" && location.pathname === "/issuer/certificates" && !location.search)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </motion.button>
          ))}
        </nav>

        {/* Theme & Credits */}
        <div className="px-4 py-2 flex items-center justify-between">
          <CreditsDisplay compact />
          <ThemeToggle compact />
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
            <img src={authentisealIcon} alt="AuthentiSeal" className="h-7 w-7 rounded" />
            <div className="flex flex-col">
              <span className="font-semibold gradient-text leading-tight">AuthentiSeal</span>
              <SolPriceTicker compact />
            </div>
            <NetworkBadge compact />
          </div>
        </header>

        {/* Page content - add bottom padding for mobile bottom nav */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        items={[
          { icon: FileImage, label: "Collection", path: "/collection" },
          { icon: PlusCircle, label: "Seal", path: "/seal" },
          { icon: Send, label: "Transfer", path: "/transfer" },
          { icon: QrCode, label: "Verify", path: "/verify" },
        ]}
      />
    </div>
  );
}
