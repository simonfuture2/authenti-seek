import React from "react";
import { ExternalLink, Sparkles, TrendingUp, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ECOSYSTEM_APPS } from "@/lib/cross-app";

interface CollectAILinkProps {
  action: "grade" | "market" | "identify";
  productName?: string;
  serialNumber?: string;
  className?: string;
  variant?: "button" | "card";
}

const actionConfig = {
  grade: {
    icon: Sparkles,
    label: "AI Card Grading",
    description: "Get an AI-powered condition grade for this collectible",
    cta: "Grade on CollectAI",
  },
  market: {
    icon: TrendingUp,
    label: "Market Pricing",
    description: "Check real-time market value and price history",
    cta: "View Market Price",
  },
  identify: {
    icon: Camera,
    label: "Image Recognition",
    description: "Identify a card from a photo using AI",
    cta: "Identify Card",
  },
};

export function CollectAILink({
  action,
  productName,
  className = "",
  variant = "button",
}: CollectAILinkProps) {
  const config = actionConfig[action];
  const Icon = config.icon;

  const getUrl = () => {
    switch (action) {
      case "grade":
        return ECOSYSTEM_APPS.collectai.gradeUrl();
      case "market":
        return ECOSYSTEM_APPS.collectai.marketUrl(productName);
      case "identify":
        return `${ECOSYSTEM_APPS.collectai.url}/identify?ref=authentiseal`;
      default:
        return ECOSYSTEM_APPS.collectai.url;
    }
  };

  if (variant === "card") {
    return (
      <a
        href={getUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block p-4 rounded-lg border border-border bg-card hover:border-[hsl(var(--collectai-purple))]/50 hover:bg-[hsl(var(--collectai-purple))]/5 transition-all ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-[hsl(var(--collectai-purple))] flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground group-hover:text-[hsl(var(--collectai-purple))] transition-colors">
                {config.label}
              </p>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a href={getUrl()} target="_blank" rel="noopener noreferrer" className={className}>
      <Button variant="outline" size="sm" className="gap-2 border-[hsl(var(--collectai-purple))]/30 text-[hsl(var(--collectai-purple))] hover:bg-[hsl(var(--collectai-purple))]/10 hover:text-[hsl(var(--collectai-purple))]">
        <Icon className="h-4 w-4" />
        {config.cta}
        <ExternalLink className="h-3 w-3" />
      </Button>
    </a>
  );
}
