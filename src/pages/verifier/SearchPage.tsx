import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, CheckCircle2, XCircle, ExternalLink, Shield, Clock, AlertTriangle, Timer, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifierDashboardLayout } from "@/components/layout/VerifierDashboardLayout";
import { useCertificateSearch } from "@/hooks/useCertificates";
import { useVerification } from "@/hooks/useVerification";
import { useSolanaTransaction } from "@/hooks/useSolanaTransaction";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/errorHandler";
import { toast } from "sonner";
import { VerificationFlow } from "@/components/verification/VerificationFlow";
import { AuthentiSealMark } from "@/components/branding/AuthentiSealMark";

// 72 hours in milliseconds
const CHAIN_PENDING_TIMEOUT_MS = 72 * 60 * 60 * 1000;

interface ChainPendingStatus {
  isPending: boolean;
  isVoid: boolean;
  remainingTime: number | null;
  pendingAt: Date | null;
}

function getChainPendingStatus(chainPendingAt: string | null): ChainPendingStatus {
  if (!chainPendingAt) {
    return { isPending: false, isVoid: false, remainingTime: null, pendingAt: null };
  }

  const pendingAt = new Date(chainPendingAt);
  const now = new Date();
  const elapsed = now.getTime() - pendingAt.getTime();
  const remaining = CHAIN_PENDING_TIMEOUT_MS - elapsed;

  if (remaining <= 0) {
    return { isPending: true, isVoid: true, remainingTime: 0, pendingAt };
  }

  return { isPending: true, isVoid: false, remainingTime: remaining, pendingAt };
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    verified: boolean;
    onChainData: any;
    blockTime: number | null;
    slot: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [markingPending, setMarkingPending] = useState(false);
  const [showVerificationFlow, setShowVerificationFlow] = useState(false);
  
  const { user } = useAuth();
  const { searchCertificate } = useCertificateSearch();
  const { logVerification } = useVerification();
  const { verifyCertificate, getExplorerUrl } = useSolanaTransaction();
  
  // Rate limiting: track last search time
  const lastSearchTime = useRef<number>(0);
  const SEARCH_COOLDOWN_MS = 500;

  const handleSearch = useCallback(async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    if (trimmedQuery.length > 100) {
      toast.error("Search query is too long (max 100 characters)");
      return;
    }
    
    const now = Date.now();
    if (now - lastSearchTime.current < SEARCH_COOLDOWN_MS) {
      return;
    }
    lastSearchTime.current = now;
    
    setSearching(true);
    setSelectedCert(null);
    setVerificationStatus(null);
    try {
      const data = await searchCertificate(trimmedQuery);
      setResults(data || []);
    } catch (error) {
      logError(error, "SearchPage.handleSearch");
      toast.error("Search failed. Please try again.");
    }
    setSearching(false);
  }, [query, searchCertificate]);

  const handleVerify = async (cert: any) => {
    setSelectedCert(cert);
    setVerifying(true);
    
    try {
      await logVerification.mutateAsync({
        certificateId: cert.id,
        method: "search",
      });
    } catch (e) {
      logError(e, "SearchPage.handleVerify.logVerification");
    }
    
    if (cert.solana_signature) {
      const result = await verifyCertificate(cert.solana_signature);
      setVerificationStatus(result);
    } else {
      setVerificationStatus(null);
    }
    
    setVerifying(false);
  };

  const handleMarkChainPending = async (cert: any) => {
    if (!user) {
      toast.error("You must be logged in to mark certificates as pending");
      return;
    }

    setMarkingPending(true);
    try {
      const { error } = await supabase
        .from("certificates")
        .update({
          chain_pending_at: new Date().toISOString(),
          chain_pending_by: user.id,
        })
        .eq("id", cert.id);

      if (error) throw error;

      const updatedCert = {
        ...cert,
        chain_pending_at: new Date().toISOString(),
        chain_pending_by: user.id,
      };
      setSelectedCert(updatedCert);
      setResults(results.map(r => r.id === cert.id ? updatedCert : r));

      toast.success("Certificate marked as Chain Pending. Issuer has 72 hours to store on-chain.");
    } catch (error) {
      logError(error, "SearchPage.handleMarkChainPending");
      toast.error("Failed to mark certificate as pending");
    }
    setMarkingPending(false);
  };

  const renderCertificateStatus = () => {
    const chainStatus = getChainPendingStatus(selectedCert.chain_pending_at);
    
    // Check if VOID (72 hours passed without on-chain storage)
    if (chainStatus.isVoid && !selectedCert.solana_signature) {
      return (
        <div className="p-4 rounded-lg border bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Certificate VOID</p>
              <p className="text-sm text-muted-foreground">
                Issuer failed to store on-chain within 72 hours
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Check if Chain Pending (waiting for on-chain storage)
    if (chainStatus.isPending && !selectedCert.solana_signature) {
      return (
        <div className="p-4 rounded-lg border bg-warning/10 border-warning/30">
          <div className="flex items-center gap-3">
            <Timer className="h-6 w-6 text-warning animate-pulse" />
            <div className="flex-1">
              <p className="font-semibold text-warning">Chain Pending</p>
              <p className="text-sm text-muted-foreground">
                Issuer must store on-chain within {formatTimeRemaining(chainStatus.remainingTime!)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Normal status
    return (
      <div className={`p-4 rounded-lg border ${
        selectedCert.status === 'active'
          ? 'bg-success/10 border-success/30'
          : 'bg-warning/10 border-warning/30'
      }`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className={`h-6 w-6 ${
            selectedCert.status === 'active' ? 'text-success' : 'text-warning'
          }`} />
          <div>
            <p className="font-semibold">
              {selectedCert.status === 'active' ? 'Authentic Certificate' : 'Certificate Transferred'}
            </p>
            <p className="text-sm text-muted-foreground">
              This certificate was issued by a verified issuer
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderOnChainStatus = () => {
    if (selectedCert.solana_signature) {
      return (
        <div className={`p-4 rounded-lg border ${
          verificationStatus?.verified
            ? 'bg-primary/10 border-primary/30'
            : 'bg-muted border-border'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold">
                {verificationStatus?.verified 
                  ? 'Blockchain Verified' 
                  : 'Checking Blockchain...'}
              </p>
              <p className="text-xs text-muted-foreground">
                Recorded on Solana blockchain
              </p>
            </div>
          </div>
          
          {verificationStatus && (
            <div className="space-y-2 text-sm">
              {verificationStatus.blockTime && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {new Date(verificationStatus.blockTime * 1000).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <a
                  href={getExplorerUrl(selectedCert.solana_signature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  View on Solana Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      );
    }

    const chainStatus = getChainPendingStatus(selectedCert.chain_pending_at);

    return (
      <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            This certificate was not stored on-chain
          </p>
        </div>
        
        {!chainStatus.isPending && !chainStatus.isVoid && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkChainPending(selectedCert)}
            disabled={markingPending}
            className="w-full border-warning text-warning hover:bg-warning/10"
          >
            <Timer className="h-4 w-4 mr-2" />
            {markingPending ? "Marking..." : "Mark as Chain Pending (72h)"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <VerifierDashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <h1 className="text-3xl font-bold mb-2">Search Certificates</h1>
        <p className="text-muted-foreground mb-8">
          Search and verify certificates by serial number or product name.
        </p>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter serial number or product name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching} className="bg-solana-gradient">
            Search
          </Button>
        </div>

        <div className="grid gap-4">
          {/* Search Results */}
          {results.length > 0 ? (
            results.map((cert) => {
              const chainStatus = getChainPendingStatus(cert.chain_pending_at);
              const isVoid = chainStatus.isVoid && !cert.solana_signature;
              
              return (
                <Card 
                  key={cert.id} 
                  className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                    selectedCert?.id === cert.id ? 'border-primary' : ''
                  } ${isVoid ? 'opacity-60' : ''}`}
                  onClick={() => handleVerify(cert)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        isVoid ? 'bg-destructive/10' :
                        cert.solana_signature ? 'bg-success/10' : 
                        chainStatus.isPending ? 'bg-warning/10' : 'bg-muted'
                      }`}>
                        {isVoid ? (
                          <XCircle className="h-6 w-6 text-destructive" />
                        ) : cert.solana_signature ? (
                          <Shield className="h-6 w-6 text-success" />
                        ) : chainStatus.isPending ? (
                          <Timer className="h-6 w-6 text-warning" />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{cert.product_name}</h3>
                          {isVoid && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                              VOID
                            </span>
                          )}
                          {cert.solana_signature && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                              On-Chain
                            </span>
                          )}
                          {chainStatus.isPending && !cert.solana_signature && !isVoid && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                              Chain Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono text-muted-foreground">
                          {cert.serial_number}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Issued: {new Date(cert.issued_at).toLocaleDateString()}</span>
                          {cert.profiles?.company_name && (
                            <span>By: {cert.profiles.company_name}</span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleVerify(cert);
                      }}>
                        Verify
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : query && !searching ? (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No certificates found</p>
            </div>
          ) : !query ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mx-auto mb-4 opacity-80">
                <AuthentiSealMark size={88} state="verified" />
              </div>
              <p>Enter a serial or cert number to verify provenance</p>
            </div>
          ) : null}

          {/* Verification Result */}
          {selectedCert && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card overflow-hidden">
                <div className="h-1 bg-solana-gradient" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Verification Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {verifying ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-pulse text-muted-foreground">
                        Verifying certificate...
                      </div>
                    </div>
                  ) : (
                    <>
                      {renderCertificateStatus()}
                      {renderOnChainStatus()}

                      {/* Certificate Details */}
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 rounded bg-muted/30">
                          <span className="text-sm text-muted-foreground">Product</span>
                          <span className="text-sm font-medium">{selectedCert.product_name}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-muted/30">
                          <span className="text-sm text-muted-foreground">Serial</span>
                          <span className="text-sm font-mono">{selectedCert.serial_number}</span>
                        </div>
                        {selectedCert.product_category && (
                          <div className="flex justify-between p-2 rounded bg-muted/30">
                            <span className="text-sm text-muted-foreground">Category</span>
                            <span className="text-sm">{selectedCert.product_category}</span>
                          </div>
                        )}
                        <div className="flex justify-between p-2 rounded bg-muted/30">
                          <span className="text-sm text-muted-foreground">Issued</span>
                          <span className="text-sm">
                            {new Date(selectedCert.issued_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* AI Verification Button */}
                      <Button
                        onClick={() => setShowVerificationFlow(true)}
                        className="w-full bg-solana-gradient"
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Deep Verify with AI
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* AI Verification Flow Modal */}
        <AnimatePresence>
          {showVerificationFlow && selectedCert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-2xl my-8"
              >
                <VerificationFlow
                  certificate={selectedCert}
                  onComplete={() => {
                    setShowVerificationFlow(false);
                    toast.success("Verification complete!");
                  }}
                  onCancel={() => setShowVerificationFlow(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </VerifierDashboardLayout>
  );
}

export default SearchPage;
