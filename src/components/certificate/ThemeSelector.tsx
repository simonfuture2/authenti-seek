import React from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Hexagon, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { CertificateTheme, CERTIFICATE_THEMES } from "./CertificateThemes";

interface ThemeSelectorProps {
  selectedTheme: CertificateTheme;
  onThemeChange: (theme: CertificateTheme) => void;
  disabled?: boolean;
}

const themeIcons: Record<CertificateTheme, React.ReactNode> = {
  luxury: <Sparkles className="h-5 w-5" />,
  modern: <Hexagon className="h-5 w-5" />,
  tech: <Cpu className="h-5 w-5" />,
};

export function ThemeSelector({
  selectedTheme,
  onThemeChange,
  disabled = false,
}: ThemeSelectorProps) {
  const themes = Object.values(CERTIFICATE_THEMES);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Certificate Theme</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme.id;
          
          return (
            <motion.button
              key={theme.id}
              type="button"
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              onClick={() => !disabled && onThemeChange(theme.id)}
              disabled={disabled}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all",
                "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Theme Preview Bar */}
              <div
                className="h-2 rounded-full mb-3"
                style={{ background: theme.previewGradient }}
              />

              {/* Icon & Name */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "transition-colors",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {themeIcons[theme.id]}
                </span>
                <span className="font-semibold">{theme.name}</span>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {theme.description}
              </p>

              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-3 w-3" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
