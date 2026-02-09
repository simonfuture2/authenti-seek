import React from "react";
import { Sun, Moon, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const themes: { value: ThemeMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: "light", label: "Light", icon: Sun, description: "Clean & bright" },
  { value: "dark", label: "Dark", icon: Moon, description: "Solana purple" },
  { value: "seeker", label: "Seeker", icon: Smartphone, description: "Solana Seeker" },
];

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const currentTheme = themes.find((t) => t.value === theme)!;
  const CurrentIcon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          {!compact && <span className="text-xs">{currentTheme.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              theme === t.value && "bg-accent"
            )}
          >
            <t.icon className="h-4 w-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
