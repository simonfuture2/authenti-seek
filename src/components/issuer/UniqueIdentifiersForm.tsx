import React from "react";
import { motion } from "framer-motion";
import { Hash, Nfc, Barcode, Tag, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UniqueIdentifiersFormProps {
  identifiers: Record<string, string>;
  onChange: (identifiers: Record<string, string>) => void;
  disabled?: boolean;
}

export function UniqueIdentifiersForm({
  identifiers,
  onChange,
  disabled = false,
}: UniqueIdentifiersFormProps) {
  const updateIdentifier = (key: string, value: string) => {
    onChange({ ...identifiers, [key]: value });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          Unique Identifiers
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Serial numbers and unique codes that can be verified against the
                  physical item. These provide tamper-evident verification.
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
          {/* Serial Number */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Product Serial #
            </Label>
            <Input
              placeholder="Manufacturer's serial"
              value={identifiers.serialNumber || ""}
              onChange={(e) => updateIdentifier("serialNumber", e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Model Number */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Barcode className="h-3 w-3" />
              Model Number
            </Label>
            <Input
              placeholder="e.g., REF.126710BLNR"
              value={identifiers.modelNumber || ""}
              onChange={(e) => updateIdentifier("modelNumber", e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* NFC Tag ID */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Nfc className="h-3 w-3" />
              NFC Tag ID
            </Label>
            <Input
              placeholder="If embedded NFC chip"
              value={identifiers.nfcTagId || ""}
              onChange={(e) => updateIdentifier("nfcTagId", e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Batch Code */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Batch/Lot Code
            </Label>
            <Input
              placeholder="Manufacturing batch"
              value={identifiers.batchCode || ""}
              onChange={(e) => updateIdentifier("batchCode", e.target.value)}
              disabled={disabled}
            />
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
