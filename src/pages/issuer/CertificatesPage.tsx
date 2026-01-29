import React, { useState } from "react";
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
import { getExplorerUrl } from "@/lib/solana";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "transferred" | "revoked";

export default function CertificatesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  
  const { certificates, isLoading } = useCertificates();
  const { toast } = useToast();

  // Filter certificates
  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.product_category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || cert.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
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

              return (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {viewMode === "grid" ? (
                    <Card
                      className="glass-card overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group"
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

                        {/* On-chain badge */}
                        {cert.solana_signature && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-solana-gradient text-white text-xs">
                              On-Chain
                            </Badge>
                          </div>
                        )}

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
                      className="glass-card cursor-pointer hover:border-primary/50 transition-colors"
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
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">
                                {cert.product_name}
                              </h3>
                              {cert.solana_signature && (
                                <Badge className="bg-solana-gradient text-white text-xs">
                                  On-Chain
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

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedCert(null)}
                  >
                    Close
                  </Button>
                  {getCertificateImage(selectedCert) && (
                    <Button
                      className="flex-1"
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
