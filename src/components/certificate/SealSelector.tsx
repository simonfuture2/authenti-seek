import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Shield, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SealStyle, SEAL_STYLES } from "./CertificateThemes";

interface SealSelectorProps {
  selectedSeal: SealStyle;
  onSealChange: (seal: SealStyle) => void;
  hasProductImage: boolean;
  disabled?: boolean;
  // AI seal generation
  onGenerateAISeal?: () => void;
  isGeneratingAISeal?: boolean;
  aiSealImage?: string | null;
  productName?: string;
  productCategory?: string;
}

export function SealSelector({
  selectedSeal,
  onSealChange,
  hasProductImage,
  disabled = false,
  onGenerateAISeal,
  isGeneratingAISeal = false,
  aiSealImage,
  productName,
  productCategory,
}: SealSelectorProps) {
  const seals = Object.values(SEAL_STYLES);

  if (hasProductImage) {
    return null; // Hide seal selector when product image is uploaded
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">Authentication Seal</label>
        </div>
        {onGenerateAISeal && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateAISeal}
            disabled={isGeneratingAISeal || disabled || !productName}
            className="h-7 text-xs gap-1 border-primary/30 hover:border-primary hover:bg-primary/5"
          >
            {isGeneratingAISeal ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                AI Generate
              </>
            )}
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {aiSealImage 
          ? "AI-generated seal created! Select a style below to use a preset instead."
          : "Select a seal style or use AI to generate a unique seal based on your product."
        }
      </p>

      {/* AI Generated Seal Preview */}
      <AnimatePresence>
        {aiSealImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative p-4 rounded-xl border-2 border-primary bg-primary/5"
          >
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={aiSealImage}
                  alt="AI Generated Seal"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">Custom AI Seal</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Unique seal designed for {productName || "your product"}
                  {productCategory && ` in the ${productCategory} category`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset Seal Options */}
      <div className="grid grid-cols-3 gap-3">
        {seals.map((seal) => {
          const isSelected = selectedSeal === seal.id && !aiSealImage;
          
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
