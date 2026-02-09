import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import authentisealIcon from "@/assets/authentiseal-icon.png";
import { SolPriceTicker } from "@/components/wallet/SolPriceTicker";
import { createPortal } from "react-dom";

interface MobileNavProps {
  links: { label: string; href: string; isRoute?: boolean }[];
}

export function MobileNav({ links }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const overlay = open
    ? createPortal(
        <div className="fixed inset-0 z-[200] bg-background animate-fade-in">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-border">
              <div className="flex items-center gap-2.5">
                <img src={authentisealIcon} alt="AuthentiSeal" className="h-8 w-8 rounded-lg" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold gradient-text leading-tight">AuthentiSeal</span>
                  <SolPriceTicker compact />
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 flex flex-col justify-center px-8 gap-2">
              {links.map((link) =>
                link.isRoute ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className="text-2xl font-semibold text-foreground hover:text-primary transition-colors py-4 border-b border-border/30"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-2xl font-semibold text-foreground hover:text-primary transition-colors py-4 border-b border-border/30"
                  >
                    {link.label}
                  </a>
                )
              )}
            </nav>

            {/* CTA */}
            <div className="p-8">
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button size="lg" className="w-full bg-solana-gradient hover:opacity-90 h-14 text-lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      {overlay}
    </div>
  );
}
