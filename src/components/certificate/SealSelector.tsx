import React from "react";
import { motion } from "framer-motion";
import { Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { SealStyle, SEAL_STYLES } from "./CertificateThemes";

interface SealSelectorProps {
  selectedSeal: SealStyle;
  onSealChange: (seal: SealStyle) => void;
  hasProductImage: boolean;
  disabled?: boolean;
}

export function SealSelector({
  selectedSeal,
  onSealChange,
  hasProductImage,
  disabled = false,
}: SealSelectorProps) {
  const seals = Object.values(SEAL_STYLES);

  if (hasProductImage) {
    return null; // Hide seal selector when product image is uploaded
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm font-medium">Authentication Seal</label>
      </div>
      <p className="text-xs text-muted-foreground">
        Since no product image is uploaded, select a seal style to display on your certificate.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {seals.map((seal) => {
          const isSelected = selectedSeal === seal.id;
          
          return (
            <motion.button
              key={seal.id}
              type="button"
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              onClick={() => !disabled && onSealChange(seal.id)}
              disabled={disabled}
              className={cn(
                "relative p-3 rounded-xl border-2 text-center transition-all",
                "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Seal Preview Circle */}
              <div
                className="w-12 h-12 mx-auto rounded-full mb-2 flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle, ${seal.colors.highlight} 0%, ${seal.colors.primary} 40%, ${seal.colors.secondary} 80%, ${seal.colors.shadow} 100%)`,
                  boxShadow: `0 4px 12px ${seal.colors.shadow}40`,
                }}
              >
                <Shield
                  className="h-6 w-6"
                  style={{ color: seal.id === "platinum" ? "#1a1a2e" : "#fff" }}
                />
              </div>

              {/* Name */}
              <span className="text-sm font-medium">{seal.name}</span>

              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-primary text-primary-foreground"
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
