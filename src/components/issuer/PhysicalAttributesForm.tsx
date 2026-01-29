import React from "react";
import { motion } from "framer-motion";
import { Ruler, Scale, Palette, Package, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PhysicalAttributesFormProps {
  attributes: Record<string, string>;
  onChange: (attributes: Record<string, string>) => void;
  disabled?: boolean;
}

export function PhysicalAttributesForm({
  attributes,
  onChange,
  disabled = false,
}: PhysicalAttributesFormProps) {
  const updateAttribute = (key: string, value: string) => {
    onChange({ ...attributes, [key]: value });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Ruler className="h-4 w-4 text-primary" />
          Physical Attributes
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Physical measurements help verifiers confirm the item matches the
                  certificate. These are compared during verification.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Weight */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Scale className="h-3 w-3" />
              Weight
            </Label>
            <Input
              placeholder="e.g., 150g"
              value={attributes.weight || ""}
              onChange={(e) => updateAttribute("weight", e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Dimensions */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              Dimensions
            </Label>
            <Input
              placeholder="e.g., 42mm x 12mm"
              value={attributes.dimensions || ""}
              onChange={(e) => updateAttribute("dimensions", e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Materials */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Package className="h-3 w-3" />
              Materials
            </Label>
            <Input
              placeholder="e.g., 18k Gold, Steel"
              value={attributes.materials || ""}
              onChange={(e) => updateAttribute("materials", e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Color
            </Label>
            <Input
              placeholder="e.g., Rose Gold"
              value={attributes.color || ""}
              onChange={(e) => updateAttribute("color", e.target.value)}
              disabled={disabled}
            />
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
