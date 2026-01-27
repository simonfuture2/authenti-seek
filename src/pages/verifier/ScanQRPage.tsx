import React from "react";
import { motion } from "framer-motion";
import { QrCode, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifierDashboardLayout } from "@/components/layout/VerifierDashboardLayout";

export function ScanQRPage() {
  return (
    <VerifierDashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        <h1 className="text-3xl font-bold mb-2">Scan QR Code</h1>
        <p className="text-muted-foreground mb-8">
          Scan a certificate QR code to verify authenticity.
        </p>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Scanner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-square rounded-xl bg-muted/50 flex flex-col items-center justify-center border-2 border-dashed border-border">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center px-4">
                Camera access required for QR scanning.
                <br />
                <span className="text-sm">Enable on your mobile device.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </VerifierDashboardLayout>
  );
}

export default ScanQRPage;
