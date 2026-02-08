import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  links: { label: string; href: string; isRoute?: boolean }[];
}

export function MobileNav({ links }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Full-screen overlay menu */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-solana-gradient">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">AuthentiSeal</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground"
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
        </div>
      )}
    </div>
  );
}