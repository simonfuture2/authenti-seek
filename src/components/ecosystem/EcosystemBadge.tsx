import React from "react";
import { ExternalLink, Shield, Sparkles } from "lucide-react";
import { ECOSYSTEM_APPS } from "@/lib/cross-app";
import authentisealIcon from "@/assets/authentiseal-icon.png";

interface EcosystemBadgeProps {
  app: "authentiseal" | "collectai";
  variant?: "inline" | "card";
  className?: string;
}

export function EcosystemBadge({ app, variant = "inline", className = "" }: EcosystemBadgeProps) {
  const config = ECOSYSTEM_APPS[app];

  if (variant === "card") {
    return (
      <a
        href={config.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all ${className}`}
      >
        {app === "authentiseal" ? (
          <img src={authentisealIcon} alt="AuthentiSeal" className="h-8 w-8 rounded-lg" />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-[hsl(var(--collectai-purple))] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {config.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{config.tagline}</p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </a>
    );
  }

  // Inline badge
  return (
    <a
      href={config.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all ${className}`}
    >
      {app === "authentiseal" ? (
        <Shield className="h-3 w-3 text-primary" />
      ) : (
        <Sparkles className="h-3 w-3 text-[hsl(var(--collectai-purple))]" />
      )}
      <span className="text-muted-foreground">
        {app === "authentiseal" ? "Powered by" : "Grade with"}{" "}
        <span className="text-foreground font-semibold">{config.name}</span>
      </span>
    </a>
  );
}
