import React, { useState } from "react";
import { motion } from "framer-motion";
import { QrCode, CheckCircle2, XCircle, Loader2, ExternalLink, Shield, Clock, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifierDashboardLayout } from "@/components/layout/VerifierDashboardLayout";
import { QRScanner } from "@/components/scanner/QRScanner";
import { useCertificateSearch } from "@/hooks/useCertificates";
import { useVerification } from "@/hooks/useVerification";
import { verifyCertificateOnChain, getExplorerUrl } from "@/lib/solana";
import { useToast } from "@/hooks/use-toast";

interface ScannedCertificate {
  id: string;
  serial_number: string;
  product_name: string;
  product_description: string | null;
  product_category: string | null;
  status: string;
  issued_at: string;
  solana_signature: string | null;
  issuer_id: string | null;
}

interface OnChainResult {
  verified: boolean;
  slot: number;
  blockTime: number | null;
}

export function ScanQRPage() {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<ScannedCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onChainResult, setOnChainResult] = useState<OnChainResult | null>(null);
  const [verifyingOnChain, setVerifyingOnChain] = useState(false);
  
  const { getCertificateBySerial, getCertificateById } = useCertificateSearch();
  const { logVerification } = useVerification();
  const { toast } = useToast();

  const handleScan = async (data: string) => {
    setScannedData(data);
    setIsLoading(true);
    setError(null);
    setCertificate(null);
    setOnChainResult(null);

    try {
      // Try to parse as JSON (our QR format)
      let searchQuery: string;
      try {
        const qrData = JSON.parse(data);
        if (qrData.type === "COA" && qrData.serial) {
          searchQuery = qrData.serial;
        } else if (qrData.id) {
          // Direct certificate ID
          const cert = await getCertificateById(qrData.id);
          if (cert) {
            setCertificate({
              id: cert.id,
              serial_number: cert.serial_number,
              product_name: cert.product_name,
              product_description: cert.product_description,
              product_category: cert.product_category,
              status: cert.status,
              issued_at: cert.issued_at,
              solana_signature: cert.solana_signature,
              issuer_id: cert.issuer_id,
            });
            await logVerification.mutateAsync({
              certificateId: cert.id,
              method: "qr_scan",
            });
            toast({
              title: "Certificate Found",
              description: `Verified: ${cert.product_name}`,
            });
            setIsLoading(false);
            return;
          }
          throw new Error("Certificate not found");
        } else {
          searchQuery = data;
        }
      } catch {
        // Not JSON, treat as serial number
        searchQuery = data;
      }

      const cert = await getCertificateBySerial(searchQuery);
      
      if (cert) {
        setCertificate({
          id: cert.id,
          serial_number: cert.serial_number,
          product_name: cert.product_name,
          product_description: cert.product_description,
          product_category: cert.product_category,
          status: cert.status,
          issued_at: cert.issued_at,
          solana_signature: cert.solana_signature,
          issuer_id: cert.issuer_id,
        });
        await logVerification.mutateAsync({
          certificateId: cert.id,
          method: "qr_scan",
        });
        toast({
          title: "Certificate Found",
          description: `Verified: ${cert.product_name}`,
        });
      } else {
        setError("No certificate found for this QR code");
        toast({
          title: "Not Found",
          description: "This QR code is not associated with any registered certificate.",
          variant: "destructive",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify certificate";
      setError(message);
      toast({
        title: "Verification Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOnChain = async () => {
    if (!certificate?.solana_signature) return;
    
    setVerifyingOnChain(true);
    try {
      const result = await verifyCertificateOnChain(certificate.solana_signature);
      setOnChainResult(result);
    } catch {
      toast({
        title: "Verification Failed",
        description: "Could not verify on-chain record",
        variant: "destructive",
      });
    } finally {
      setVerifyingOnChain(false);
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setCertificate(null);
    setError(null);
    setOnChainResult(null);
  };

  return (
    <VerifierDashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Scan QR Code</h1>
          <p className="text-muted-foreground">
            Scan a certificate QR code to verify authenticity instantly.
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Scanner
            </CardTitle>
            <CardDescription>
              Point your camera at a product's QR code
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!scannedData ? (
              <QRScanner onScan={handleScan} />
            ) : (
              <div className="space-y-4">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Verifying certificate...</p>
                  </div>
                )}

                {error && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                      <XCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Verification Failed</h3>
                    <p className="text-muted-foreground text-sm mb-4">{error}</p>
                    <Button onClick={resetScanner} variant="outline">
                      Scan Another
                    </Button>
                  </div>
                )}

                {certificate && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                      </div>
                      <h3 className="font-semibold text-lg">Authentic Product</h3>
                      <Badge 
                        variant={certificate.status === "active" ? "default" : "secondary"}
                        className="mt-2"
                      >
                        {certificate.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Product</p>
                        <p className="font-medium">{certificate.product_name}</p>
                      </div>
                      {certificate.product_description && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Description</p>
                          <p className="text-sm">{certificate.product_description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Serial</p>
                          <p className="font-mono text-sm">{certificate.serial_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Category</p>
                          <p className="text-sm">{certificate.product_category || "N/A"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Issued</p>
                        <p className="text-sm">
                          {new Date(certificate.issued_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* On-Chain Verification Section */}
                    {certificate.solana_signature && (
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="font-medium">Blockchain Verification</span>
                        </div>
                        
                        <div className="p-2 rounded bg-muted/50 mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Transaction</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs font-mono truncate">
                              {certificate.solana_signature}
                            </code>
                            <a
                              href={getExplorerUrl(certificate.solana_signature)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>

                        {onChainResult ? (
                          <div className={`p-3 rounded-lg ${
                            onChainResult.verified 
                              ? "bg-green-500/10 border border-green-500/30" 
                              : "bg-destructive/10 border border-destructive/30"
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {onChainResult.verified ? (
                                <>
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  <span className="font-medium text-green-500">Verified On-Chain</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5 text-destructive" />
                                  <span className="font-medium text-destructive">Not Found</span>
                                </>
                              )}
                            </div>
                            {onChainResult.verified && (
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {onChainResult.blockTime && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {new Date(onChainResult.blockTime * 1000).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Hash className="h-3 w-3" />
                                  <span>Slot: {onChainResult.slot.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button
                            onClick={handleVerifyOnChain}
                            disabled={verifyingOnChain}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            {verifyingOnChain ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              "Verify On-Chain"
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={resetScanner} variant="outline" className="flex-1">
                        Scan Another
                      </Button>
                      <Button asChild variant="default" className="flex-1 gap-2">
                        <a 
                          href={`/verifier/search?serial=${certificate.serial_number}`}
                        >
                          Full Details
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </VerifierDashboardLayout>
  );
}

export default ScanQRPage;
