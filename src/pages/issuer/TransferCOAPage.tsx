import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Loader2,
  Send,
  Search,
  Wallet,
  Package,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssuerDashboardLayout } from "@/components/layout/IssuerDashboardLayout";
import { useCertificates, Certificate } from "@/hooks/useCertificates";
import { cn } from "@/lib/utils";

const transferSchema = z.object({
  to_wallet: z.string().min(32, "Please enter a valid Solana wallet address").max(44),
});

type TransferForm = z.infer<typeof transferSchema>;

export function TransferCOAPage() {
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [transferComplete, setTransferComplete] = useState(false);
  const { certificates, isLoading, transferCertificate } = useCertificates();
  const { publicKey } = useWallet();

  const form = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      to_wallet: "",
    },
  });

  const filteredCertificates = certificates.filter(
    (cert) =>
      cert.status === "active" &&
      (cert.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.product_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const onSubmit = async (data: TransferForm) => {
    if (!selectedCert) return;

    await transferCertificate.mutateAsync({
      certificateId: selectedCert.id,
      fromWallet: publicKey?.toBase58() || selectedCert.current_owner_wallet || "unknown",
      toWallet: data.to_wallet,
    });

    setTransferComplete(true);
  };

  if (transferComplete && selectedCert) {
    return (
      <IssuerDashboardLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center"
        >
          <Card className="glass-card overflow-hidden">
            <div className="h-2 bg-solana-gradient" />
            <CardContent className="pt-8 pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mx-auto mb-6 p-4 rounded-full bg-success/10 w-fit"
              >
                <CheckCircle2 className="h-12 w-12 text-success" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Transfer Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Certificate ownership has been successfully transferred.
              </p>
              <div className="p-4 rounded-lg bg-muted/50 mb-6">
                <p className="text-sm font-medium">{selectedCert.product_name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedCert.serial_number}
                </p>
              </div>
              <Button
                onClick={() => {
                  setSelectedCert(null);
                  setTransferComplete(false);
                  form.reset();
                }}
                className="bg-solana-gradient"
              >
                Transfer Another
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </IssuerDashboardLayout>
    );
  }

  return (
    <IssuerDashboardLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">Transfer Certificate</h1>
          <p className="text-muted-foreground mb-8">
            Transfer ownership of a certificate to another wallet.
          </p>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Certificate Selection */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Select Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by serial or product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredCertificates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No active certificates found</p>
                    </div>
                  ) : (
                    filteredCertificates.map((cert) => (
                      <motion.button
                        key={cert.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedCert(cert)}
                        className={cn(
                          "w-full p-4 rounded-lg border text-left transition-all",
                          selectedCert?.id === cert.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{cert.product_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {cert.serial_number}
                            </p>
                          </div>
                          {selectedCert?.id === cert.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Transfer Form */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Transfer Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCert ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Selected Certificate */}
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">
                          Selected Certificate
                        </p>
                        <p className="font-medium">{selectedCert.product_name}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {selectedCert.serial_number}
                        </p>
                      </div>

                      {/* From Wallet */}
                      <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed">
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">From</p>
                          <p className="text-sm font-mono truncate">
                            {publicKey?.toBase58() ||
                              selectedCert.current_owner_wallet ||
                              "Connect wallet"}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>

                      {/* To Wallet */}
                      <FormField
                        control={form.control}
                        name="to_wallet"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Wallet Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  placeholder="Enter Solana wallet address"
                                  className="pl-10 font-mono text-sm"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full bg-solana-gradient hover:opacity-90"
                        disabled={transferCertificate.isPending}
                      >
                        {transferCertificate.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Transferring...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Transfer Ownership
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a certificate to transfer</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </IssuerDashboardLayout>
  );
}

export default TransferCOAPage;
