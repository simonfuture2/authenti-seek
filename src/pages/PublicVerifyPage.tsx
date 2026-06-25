import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Clock,
  Hash,
  ArrowRight,
  User,
  Building2,
  Package,
  Calendar,
  Tag,
} from "lucide-react";
import authentisealIcon from "@/assets/authentiseal-icon.png";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRScanner } from "@/components/scanner/QRScanner";
// supabase client no longer needed - public verification uses edge function directly
import { verifyCertificateOnChain, getExplorerUrl } from "@/lib/solana";
import { useToast } from "@/hooks/use-toast";
import { CollectAILink } from "@/components/ecosystem/CollectAILink";
import { EcosystemBadge } from "@/components/ecosystem/EcosystemBadge";
import { GraderTrustBadge } from "@/components/certificate/GraderTrustBadge";

interface PublicCertificate {
  id: string;
  serial_number: string;
  product_name: string;
  product_description: string | null;
  product_category: string | null;
  product_images: string[] | null;
  status: string;
  issued_at: string;
  created_at: string;
  solana_signature: string | null;
  issuer_id: string | null;
  profiles?: {
    display_name: string | null;
    company_name: string | null;
  } | null;
  // Grader verification (Phase 1)
  grader: string | null;
  grader_cert_number: string | null;
  grader_grade: string | null;
  grader_grade_scale: string | null;
  grader_report_url: string | null;
  grader_images: { front?: string | null; back?: string | null } | null;
  grader_match_status:
    | "grader_verified"
    | "grader_linked"
    | "self_attested"
    | "mismatch"
    | null;
  grader_verified_at: string | null;
  grader_card_snapshot: {
    card?: {
      subject?: string | null;
      brand?: string | null;
      year?: string | null;
      cardNumber?: string | null;
    } | null;
  } | null;
}

interface OnChainResult {
  verified: boolean;
  slot: number;
  blockTime: number | null;
  cluster?: string;
}

export function PublicVerifyPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"search" | "scan">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [certificate, setCertificate] = useState<PublicCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onChainResult, setOnChainResult] = useState<OnChainResult | null>(null);
  const [verifyingOnChain, setVerifyingOnChain] = useState(false);
  const { toast } = useToast();

  // Check for serial number in URL params on mount
  useEffect(() => {
    const serial = searchParams.get("serial");
    if (serial) {
      setSearchQuery(serial);
      handleSearch(serial);
    }
  }, [searchParams]);

  const fetchCertificate = async (query: string, isId: boolean = false) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const url = new URL(`${supabaseUrl}/functions/v1/verify-public`);
    if (isId) {
      url.searchParams.set("id", query);
    } else {
      url.searchParams.set("serial", query);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Verification service error");

    const result = await response.json();

    if (!result.verified || !result.certificate) return null;

    const cert = result.certificate;
    return {
      id: cert.id,
      serial_number: cert.serial_number,
      product_name: cert.product_name,
      product_description: cert.product_description,
      product_category: cert.product_category,
      product_images: cert.product_images,
      status: cert.status,
      issued_at: cert.issued_at,
      created_at: cert.issued_at,
      solana_signature: cert.solana_signature || null,
      issuer_id: null,
      profiles: cert.issuer,
      grader: cert.grader ?? null,
      grader_cert_number: cert.grader_cert_number ?? null,
      grader_grade: cert.grader_grade ?? null,
      grader_grade_scale: cert.grader_grade_scale ?? null,
      grader_report_url: cert.grader_report_url ?? null,
      grader_images: cert.grader_images ?? null,
      grader_match_status: cert.grader_match_status ?? "self_attested",
      grader_verified_at: cert.grader_verified_at ?? null,
      grader_card_snapshot: cert.grader_card_snapshot ?? null,
    } as PublicCertificate;
  };

  const handleSearch = async (query?: string) => {
    const searchValue = query || searchQuery.trim();
    if (!searchValue) {
      toast({
        title: "Enter Serial Number",
        description: "Please enter a serial number to verify.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setCertificate(null);
    setOnChainResult(null);

    try {
      const cert = await fetchCertificate(searchValue);

      if (cert) {
        setCertificate(cert);
        toast({
          title: "Certificate Found ✓",
          description: `Verified: ${cert.product_name}`,
        });
      } else {
        setError("No certificate found with this serial number");
        toast({
          title: "Not Found",
          description: "This serial number is not registered in our system.",
          variant: "destructive",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async (data: string) => {
    setIsLoading(true);
    setError(null);
    setCertificate(null);
    setOnChainResult(null);
    setActiveTab("search");

    try {
      let cert: PublicCertificate | null = null;

      // Try to parse as JSON (our QR format)
      try {
        const qrData = JSON.parse(data);
        if (qrData.type === "COA" && qrData.serial) {
          cert = await fetchCertificate(qrData.serial);
        } else if (qrData.id) {
          cert = await fetchCertificate(qrData.id, true);
        }
      } catch {
        // Not JSON, treat as serial number
        cert = await fetchCertificate(data);
      }

      if (cert) {
        setCertificate(cert);
        setSearchQuery(cert.serial_number);
        toast({
          title: "Certificate Found ✓",
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
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
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

  const resetVerification = () => {
    setCertificate(null);
    setError(null);
    setOnChainResult(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={authentisealIcon} alt="AuthentiSeal" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-bold gradient-text">AuthentiSeal</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">Public Verification</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Verify <span className="gradient-text">Authenticity</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Enter a serial number or scan a QR code to verify if a product is authentic.
              No account required.
            </p>
          </motion.div>

          {/* Verification Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Certificate Verification
                </CardTitle>
                <CardDescription>
                  Instantly verify any AuthentiSeal certificate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "search" | "scan")}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="search" className="gap-2">
                      <Search className="h-4 w-4" />
                      Serial Number
                    </TabsTrigger>
                    <TabsTrigger value="scan" className="gap-2">
                      <QrCode className="h-4 w-4" />
                      Scan QR
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="search" className="space-y-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearch();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="Enter serial number (e.g., SN-2024-001)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                        disabled={isLoading}
                      />
                      <Button type="submit" disabled={isLoading} className="bg-solana-gradient">
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Verify
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="scan">
                    <QRScanner onScan={handleScan} />
                  </TabsContent>
                </Tabs>

                {/* Loading State */}
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Verifying certificate...</p>
                  </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                      <XCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Not Found</h3>
                    <p className="text-muted-foreground text-sm mb-4 max-w-sm">{error}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      This product may not be registered in our system, or the serial number may be incorrect.
                    </p>
                    <Button onClick={resetVerification} variant="outline">
                      Try Again
                    </Button>
                  </motion.div>
                )}

                {/* Success Result */}
                {certificate && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4 mt-6"
                  >
                    {/* Grader trust badge (replaces single "Authentic Product" claim) */}
                    <GraderTrustBadge
                      status={certificate.grader_match_status}
                      grader={certificate.grader}
                      graderCertNumber={certificate.grader_cert_number}
                      graderGrade={certificate.grader_grade}
                      graderGradeScale={certificate.grader_grade_scale}
                      graderReportUrl={certificate.grader_report_url}
                      graderImages={certificate.grader_images}
                      graderVerifiedAt={certificate.grader_verified_at}
                      graderCardSnapshot={certificate.grader_card_snapshot}
                      sealed={{
                        product_name: certificate.product_name,
                        category: certificate.product_category,
                        serial_number: certificate.serial_number,
                      }}
                      sealedImages={certificate.product_images}
                      onScrollToSeller={() => {
                        document
                          .getElementById("sealed-by-block")
                          ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    />

                    <div className="flex items-center justify-center pt-1">
                      <Badge
                        variant={certificate.status === "active" ? "default" : "secondary"}
                      >
                        Status: {certificate.status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Product Image */}
                    {certificate.product_images && certificate.product_images.length > 0 && (
                      <div className="rounded-lg overflow-hidden border border-border">
                        <img
                          src={certificate.product_images[0]}
                          alt={certificate.product_name}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}

                    {/* Product Details */}
                    <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                      <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            Product
                          </p>
                          <p className="font-semibold text-lg">{certificate.product_name}</p>
                        </div>
                      </div>

                      {certificate.product_description && (
                        <div className="pl-8">
                          <p className="text-sm text-muted-foreground">
                            {certificate.product_description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-start gap-3">
                          <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Serial Number
                            </p>
                            <p className="font-mono text-sm">{certificate.serial_number}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Category
                            </p>
                            <p className="text-sm">{certificate.product_category || "N/A"}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Issued
                            </p>
                            <p className="text-sm">
                              {new Date(certificate.issued_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          {certificate.profiles?.company_name ? (
                            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Sealed By
                            </p>
                            {certificate.issuer_id ? (
                              <Link
                                to={`/issuer/${certificate.issuer_id}`}
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                {certificate.profiles?.company_name ||
                                  certificate.profiles?.display_name ||
                                  "Verified Collector"}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <p className="text-sm">
                                {certificate.profiles?.company_name ||
                                  certificate.profiles?.display_name ||
                                  "Verified Collector"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Blockchain Verification */}
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
                          <div
                            className={`p-3 rounded-lg ${
                              onChainResult.verified
                                ? "bg-green-500/10 border border-green-500/30"
                                : "bg-destructive/10 border border-destructive/30"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {onChainResult.verified ? (
                                <>
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  <span className="font-medium text-green-500">
                                    Verified On-Chain
                                  </span>
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
                                {onChainResult.cluster && (
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3" />
                                    <span className="capitalize">
                                      Network: {onChainResult.cluster}
                                    </span>
                                  </div>
                                )}
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

                    {/* CollectAI Integration - Show for collectible categories */}
                    {certificate.product_category &&
                      ["collectibles", "trading cards", "sports cards", "pokemon", "cards"].some(
                        (cat) => certificate.product_category?.toLowerCase().includes(cat)
                      ) && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            CollectAI Integration
                          </p>
                          <div className="grid gap-2">
                            <CollectAILink
                              action="grade"
                              productName={certificate.product_name}
                              variant="card"
                            />
                            <CollectAILink
                              action="market"
                              productName={certificate.product_name}
                              variant="card"
                            />
                          </div>
                        </div>
                      )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button onClick={resetVerification} variant="outline" className="flex-1">
                        Verify Another
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Are you a brand or seller? Create your own verified certificates.
            </p>
            <Link to="/auth">
              <Button variant="link" className="gap-2">
                Create an Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={authentisealIcon} alt="AuthentiSeal" className="h-7 w-7 rounded-lg" />
            <span className="font-bold gradient-text">AuthentiSeal</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <EcosystemBadge app="collectai" variant="inline" />
          </div>
          <p className="text-xs text-muted-foreground">
            Blockchain-verified certificates of authenticity powered by Solana
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PublicVerifyPage;
