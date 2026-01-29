import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Download,
  ExternalLink,
  Copy,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  ImageIcon,
  Shield,
  Timer,
  AlertTriangle,
  Wallet,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { IssuerDashboardLayout } from "@/components/layout/IssuerDashboardLayout";
import { useCertificates, Certificate } from "@/hooks/useCertificates";
import { useToast } from "@/hooks/use-toast";
import { useNFTMinting } from "@/hooks/useNFTMinting";
import { getExplorerUrl } from "@/lib/solana";
import { MintingMode } from "@/lib/metaplex";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { WalletButton } from "@/components/wallet/WalletButton";
import { MintModeSelector } from "@/components/certificate/MintModeSelector";

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "transferred" | "revoked" | "chain_pending";

// 72 hours in milliseconds
const CHAIN_PENDING_TIMEOUT_MS = 72 * 60 * 60 * 1000;

type ChainPendingStatus = "none" | "pending" | "expired";

const getChainPendingStatus = (cert: Certificate): ChainPendingStatus => {
  if (cert.solana_signature) return "none";
  if (!cert.chain_pending_at) return "none";
  
  const pendingTime = new Date(cert.chain_pending_at).getTime();
  const now = Date.now();
  const elapsed = now - pendingTime;
  
  if (elapsed >= CHAIN_PENDING_TIMEOUT_MS) {
    return "expired";
  }
  return "pending";
};

const formatTimeRemaining = (chain_pending_at: string): string => {
  const pendingTime = new Date(chain_pending_at).getTime();
  const deadline = pendingTime + CHAIN_PENDING_TIMEOUT_MS;
  const remaining = deadline - Date.now();
  
  if (remaining <= 0) return "Expired";
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};

export default function CertificatesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [, setTick] = useState(0); // For triggering re-renders for countdown
  const [isMarkingPending, setIsMarkingPending] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingMode, setMintingMode] = useState<MintingMode>("nft");
  
  const { certificates, isLoading, refetch } = useCertificates();
  const { toast } = useToast();
  const { mintCertificate, isConnected, publicKey, isSubmitting } = useNFTMinting();

  // Store certificate on-chain
  const handleStoreOnChain = async (cert: Certificate) => {
    if (!isConnected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Solana wallet to store on-chain.",
        variant: "destructive",
      });
      return;
    }

    if (cert.solana_signature) {
      toast({
        title: "Already On-Chain",
        description: "This certificate is already stored on the blockchain.",
      });
      return;
    }

    setIsMinting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use the new NFT minting hook with selected mode
      const result = await mintCertificate(cert, user.id, mintingMode);
      
      if (result?.success && result.signature) {
        // Build update object based on minting mode
        const updateData: Record<string, unknown> = {
          solana_signature: result.signature,
          chain_pending_at: null,
          chain_pending_by: null,
        };

        // For NFT mode, also store the mint address in metadata
        if (result.mode === "nft" && result.mintAddress) {
          const currentMetadata = (cert.metadata || {}) as Record<string, unknown>;
          updateData.metadata = {
            ...currentMetadata,
            solana_mint_address: result.mintAddress,
          };
          updateData.solana_account = result.mintAddress;
        }

        // Update database with Solana signature
        const { error } = await supabase
          .from("certificates")
          .update(updateData)
          .eq("id", cert.id)
          .eq("issuer_id", user.id);

        if (error) throw error;

        refetch();
        // Update selected cert to reflect the change
        setSelectedCert(prev => prev ? { 
          ...prev, 
          solana_signature: result.signature,
          solana_account: result.mintAddress || null,
          chain_pending_at: null,
          chain_pending_by: null,
        } : null);
      }
    } catch (error: any) {
      toast({
        title: "Minting Failed",
        description: error.message || "Failed to store certificate on-chain",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

  // Mark certificate as chain pending (issuer initiated)
  const handleMarkChainPending = async (cert: Certificate) => {
    if (cert.solana_signature || cert.chain_pending_at) {
      toast({
        title: "Cannot Mark as Pending",
        description: "This certificate is already on-chain or has a pending status.",
        variant: "destructive",
      });
      return;
    }

    setIsMarkingPending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("certificates")
        .update({
          chain_pending_at: new Date().toISOString(),
          chain_pending_by: user.id,
        })
        .eq("id", cert.id)
        .eq("issuer_id", user.id);

      if (error) throw error;

      toast({
        title: "Chain Pending Initiated",
        description: "You have 72 hours to store this certificate on-chain.",
      });

      refetch();
      // Update selected cert to reflect the change
      setSelectedCert(prev => prev ? { ...prev, chain_pending_at: new Date().toISOString(), chain_pending_by: user.id } : null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as chain pending",
        variant: "destructive",
      });
    } finally {
      setIsMarkingPending(false);
    }
  };

  // Real-time subscription for certificate updates
  useEffect(() => {
    const channel = supabase
      .channel('issuer-certificates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'certificates',
        },
        (payload) => {
          console.log('Certificate updated:', payload);
          refetch();
          
          // If chain_pending_at was just set, show a toast
          const newData = payload.new as Certificate;
          if (newData.chain_pending_at && !payload.old?.chain_pending_at) {
            toast({
              title: "Chain Pending Alert",
              description: `Certificate ${newData.serial_number} requires on-chain storage within 72 hours.`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, toast]);

  // Update countdown timer every minute
  useEffect(() => {
    const hasChainPending = certificates.some(c => c.chain_pending_at && !c.solana_signature);
    if (!hasChainPending) return;
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [certificates]);

  // Filter certificates
  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.product_category?.toLowerCase().includes(searchQuery.toLowerCase());

    const chainPendingStatus = getChainPendingStatus(cert);
    
    let matchesStatus = false;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "chain_pending") {
      matchesStatus = chainPendingStatus === "pending" || chainPendingStatus === "expired";
    } else {
      matchesStatus = cert.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Count chain pending certificates
  const chainPendingCount = certificates.filter(c => {
    const status = getChainPendingStatus(c);
    return status === "pending" || status === "expired";
  }).length;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/30";
      case "transferred":
        return "bg-primary/10 text-primary border-primary/30";
      case "revoked":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-3 w-3" />;
      case "transferred":
        return <Send className="h-3 w-3" />;
      case "revoked":
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Get certificate image from metadata or product images
  const getCertificateImage = (cert: Certificate): string | null => {
    const metadata = cert.metadata as { certificateImageUrl?: string } | null;
    if (metadata?.certificateImageUrl) {
      return metadata.certificateImageUrl;
    }
    if (cert.product_images && cert.product_images.length > 0) {
      return cert.product_images[0];
    }
    return null;
  };

  return (
    <IssuerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">My Certificates</h1>
          <p className="text-muted-foreground">
            View and manage all certificates you've issued
          </p>
        </motion.div>

        {/* Filters and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, serial, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="chain_pending">Chain Pending</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-4"
        >
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold">{certificates.length}</p>
              <p className="text-xs text-muted-foreground">Total Issued</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-success">
                {certificates.filter((c) => c.status === "active").length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-primary">
                {certificates.filter((c) => c.status === "transferred").length}
              </p>
              <p className="text-xs text-muted-foreground">Transferred</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold">
                {certificates.filter((c) => c.solana_signature).length}
              </p>
              <p className="text-xs text-muted-foreground">On-Chain</p>
            </CardContent>
          </Card>
          <Card className={cn("glass-card", chainPendingCount > 0 && "border-warning/50")}>
            <CardContent className="pt-4 pb-4">
              <p className={cn("text-2xl font-bold", chainPendingCount > 0 ? "text-warning" : "")}>
                {chainPendingCount}
              </p>
              <p className="text-xs text-muted-foreground">Chain Pending</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading State */}
        {isLoading ? (
          <div className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-3"
          )}>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-card overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="pt-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCertificates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No certificates found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first certificate to get started"}
            </p>
          </motion.div>
        ) : (
          /* Certificate Grid/List */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            )}
          >
            {filteredCertificates.map((cert, index) => {
              const certImage = getCertificateImage(cert);
              const chainPendingStatus = getChainPendingStatus(cert);

              return (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {viewMode === "grid" ? (
                    <Card
                      className={cn(
                        "glass-card overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group",
                        chainPendingStatus === "expired" && "border-destructive/50",
                        chainPendingStatus === "pending" && "border-warning/50"
                      )}
                      onClick={() => setSelectedCert(cert)}
                    >
                      {/* Certificate Image */}
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {certImage ? (
                          <img
                            src={certImage}
                            alt={cert.product_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Shield className="h-16 w-16 text-muted-foreground/30" />
                          </div>
                        )}

                        {/* Status badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                          {cert.solana_signature && (
                            <Badge className="bg-solana-gradient text-white text-xs">
                              On-Chain
                            </Badge>
                          )}
                          {chainPendingStatus === "pending" && (
                            <Badge className="bg-warning text-warning-foreground text-xs gap-1">
                              <Timer className="h-3 w-3" />
                              {formatTimeRemaining(cert.chain_pending_at!)}
                            </Badge>
                          )}
                          {chainPendingStatus === "expired" && (
                            <Badge className="bg-destructive text-destructive-foreground text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              VOID
                            </Badge>
                          )}
                        </div>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>

                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold truncate flex-1">
                            {cert.product_name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn("ml-2 gap-1", getStatusColor(cert.status))}
                          >
                            {getStatusIcon(cert.status)}
                            {cert.status}
                          </Badge>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {cert.serial_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(cert.issued_at), "MMM d, yyyy")}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    /* List View */
                    <Card
                      className={cn(
                        "glass-card cursor-pointer hover:border-primary/50 transition-colors",
                        chainPendingStatus === "expired" && "border-destructive/50",
                        chainPendingStatus === "pending" && "border-warning/50"
                      )}
                      onClick={() => setSelectedCert(cert)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Thumbnail */}
                          <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {certImage ? (
                              <img
                                src={certImage}
                                alt={cert.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Shield className="h-6 w-6 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold truncate">
                                {cert.product_name}
                              </h3>
                              {cert.solana_signature && (
                                <Badge className="bg-solana-gradient text-white text-xs">
                                  On-Chain
                                </Badge>
                              )}
                              {chainPendingStatus === "pending" && (
                                <Badge className="bg-warning text-warning-foreground text-xs gap-1">
                                  <Timer className="h-3 w-3" />
                                  {formatTimeRemaining(cert.chain_pending_at!)}
                                </Badge>
                              )}
                              {chainPendingStatus === "expired" && (
                                <Badge className="bg-destructive text-destructive-foreground text-xs gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  VOID
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-mono text-muted-foreground">
                              {cert.serial_number}
                            </p>
                          </div>

                          {/* Status & Date */}
                          <div className="text-right flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={cn("mb-1 gap-1", getStatusColor(cert.status))}
                            >
                              {getStatusIcon(cert.status)}
                              {cert.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(cert.issued_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Certificate Detail Modal */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedCert.product_name}
                  <Badge
                    variant="outline"
                    className={cn("gap-1", getStatusColor(selectedCert.status))}
                  >
                    {getStatusIcon(selectedCert.status)}
                    {selectedCert.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Chain Pending Alert */}
                {(() => {
                  const chainStatus = getChainPendingStatus(selectedCert);
                  if (chainStatus === "pending") {
                    return (
                      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Timer className="h-5 w-5 text-warning" />
                          <span className="font-semibold text-warning">
                            Chain Pending - Action Required
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          A verifier has flagged this certificate for on-chain storage. 
                          You must store it on the blockchain within the deadline to maintain validity.
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-warning text-warning-foreground gap-1">
                            <Timer className="h-3 w-3" />
                            {formatTimeRemaining(selectedCert.chain_pending_at!)} remaining
                          </Badge>
                        </div>
                      </div>
                    );
                  }
                  if (chainStatus === "expired") {
                    return (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <span className="font-semibold text-destructive">
                            Certificate VOID
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          The 72-hour deadline has passed without on-chain storage. 
                          This certificate is no longer considered authentic.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Certificate Image */}
                {getCertificateImage(selectedCert) && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img
                      src={getCertificateImage(selectedCert)!}
                      alt={selectedCert.product_name}
                      className="w-full"
                    />
                  </div>
                )}

                {/* On-chain info */}
                {selectedCert.solana_signature && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-primary">
                        Stored On-Chain
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-muted/50 px-2 py-1 rounded truncate">
                        {selectedCert.solana_signature}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(selectedCert.solana_signature!)
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <a
                        href={getExplorerUrl(selectedCert.solana_signature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}

                {/* QR Code */}
                {selectedCert.qr_code_data && (
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl">
                      <QRCodeSVG
                        value={selectedCert.qr_code_data}
                        size={150}
                        level="H"
                        includeMargin
                        bgColor="white"
                        fgColor="#1a1a2e"
                      />
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      Serial Number
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {selectedCert.serial_number}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(selectedCert.serial_number)
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {selectedCert.product_category && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        Category
                      </span>
                      <span className="text-sm">
                        {selectedCert.product_category}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      Issued
                    </span>
                    <span className="text-sm">
                      {format(new Date(selectedCert.issued_at), "PPpp")}
                    </span>
                  </div>

                  {selectedCert.current_owner_wallet && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        Current Owner
                      </span>
                      <code className="text-xs font-mono truncate max-w-[200px]">
                        {selectedCert.current_owner_wallet}
                      </code>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedCert.product_description && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">
                      Description
                    </p>
                    <p className="text-sm">{selectedCert.product_description}</p>
                  </div>
                )}

                {/* Product Images */}
                {selectedCert.product_images &&
                  selectedCert.product_images.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Product Images
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedCert.product_images.map((url, index) => (
                          <div
                            key={index}
                            className="aspect-square rounded-lg overflow-hidden border border-border"
                          >
                            <img
                              src={url}
                              alt={`Product ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Wallet Connection & Minting Section - show if certificate needs on-chain storage */}
                {!selectedCert.solana_signature && (
                  <div className="space-y-4">
                    {/* Wallet Connection */}
                    <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Solana Wallet</span>
                      </div>
                      <WalletButton />
                      {isConnected && publicKey && (
                        <p className="text-xs text-muted-foreground">
                          Connected: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                        </p>
                      )}
                    </div>

                    {/* Minting Mode Selector */}
                    {isConnected && (
                      <MintModeSelector
                        value={mintingMode}
                        onChange={setMintingMode}
                        disabled={isMinting || isSubmitting}
                      />
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-[120px]"
                    onClick={() => setSelectedCert(null)}
                  >
                    Close
                  </Button>
                  
                  {/* Store on Chain button - show for chain-pending or off-chain certificates */}
                  {!selectedCert.solana_signature && (
                    <Button
                      variant="default"
                      className="flex-1 min-w-[120px] bg-solana-gradient text-white border-0 hover:opacity-90"
                      onClick={() => handleStoreOnChain(selectedCert)}
                      disabled={isMinting || isSubmitting || !isConnected}
                    >
                      {isMinting || isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {mintingMode === "nft" ? "Minting NFT..." : "Storing Memo..."}
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          {selectedCert.chain_pending_at 
                            ? (mintingMode === "nft" ? "Mint NFT Now" : "Store Memo Now")
                            : (mintingMode === "nft" ? "Mint as NFT" : "Store as Memo")}
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Mark as Chain Pending button - show only if not on-chain and not already pending */}
                  {!selectedCert.solana_signature && !selectedCert.chain_pending_at && (
                    <Button
                      variant="default"
                      className="flex-1 min-w-[120px] bg-warning hover:bg-warning/90 text-warning-foreground"
                      onClick={() => handleMarkChainPending(selectedCert)}
                      disabled={isMarkingPending}
                    >
                      {isMarkingPending ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <Timer className="h-4 w-4 mr-2" />
                          Mark Chain Pending
                        </>
                      )}
                    </Button>
                  )}
                  
                  {getCertificateImage(selectedCert) && (
                    <Button
                      className="flex-1 min-w-[120px]"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = getCertificateImage(selectedCert)!;
                        link.download = `COA-${selectedCert.serial_number}.png`;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </IssuerDashboardLayout>
  );
}
