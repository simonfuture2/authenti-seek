import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Package, CheckCircle2, XCircle, ExternalLink, Shield, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifierDashboardLayout } from "@/components/layout/VerifierDashboardLayout";
import { useCertificateSearch, Certificate } from "@/hooks/useCertificates";
import { useVerification } from "@/hooks/useVerification";
import { useSolanaTransaction } from "@/hooks/useSolanaTransaction";
import { logError } from "@/lib/errorHandler";
import { toast } from "sonner";

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
  
  const { searchCertificate } = useCertificateSearch();
  const { logVerification } = useVerification();
  const { verifyCertificate, getExplorerUrl } = useSolanaTransaction();
  
  // Rate limiting: track last search time
  const lastSearchTime = useRef<number>(0);
  const SEARCH_COOLDOWN_MS = 500; // 500ms between searches

  const handleSearch = useCallback(async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    // Input validation: limit search query length
    if (trimmedQuery.length > 100) {
      toast.error("Search query is too long (max 100 characters)");
      return;
    }
    
    // Rate limiting: prevent rapid searches
    const now = Date.now();
    if (now - lastSearchTime.current < SEARCH_COOLDOWN_MS) {
      return; // Silently ignore rapid searches
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
    
    // Log verification
    try {
      await logVerification.mutateAsync({
        certificateId: cert.id,
        method: "search",
      });
    } catch (e) {
      logError(e, "SearchPage.handleVerify.logVerification");
    }
    
    // Verify on-chain if signature exists
    if (cert.solana_signature) {
      const result = await verifyCertificate(cert.solana_signature);
      setVerificationStatus(result);
    } else {
      setVerificationStatus(null);
    }
    
    setVerifying(false);
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
            results.map((cert) => (
              <Card 
                key={cert.id} 
                className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                  selectedCert?.id === cert.id ? 'border-primary' : ''
                }`}
                onClick={() => handleVerify(cert)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      cert.solana_signature ? 'bg-success/10' : 'bg-muted'
                    }`}>
                      {cert.solana_signature ? (
                        <Shield className="h-6 w-6 text-success" />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{cert.product_name}</h3>
                        {cert.solana_signature && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                            On-Chain
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
            ))
          ) : query && !searching ? (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No certificates found</p>
            </div>
          ) : !query ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter a search term to find certificates</p>
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
                      {/* Certificate Status */}
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

                      {/* On-Chain Verification */}
                      {selectedCert.solana_signature ? (
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
                      ) : (
                        <div className="p-4 rounded-lg bg-muted/50 border border-border">
                          <p className="text-sm text-muted-foreground">
                            This certificate was not stored on-chain
                          </p>
                        </div>
                      )}

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
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </motion.div>
    </VerifierDashboardLayout>
  );
}

export default SearchPage;
