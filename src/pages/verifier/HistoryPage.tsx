import React from "react";
import { motion } from "framer-motion";
import { History, Search, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { VerifierDashboardLayout } from "@/components/layout/VerifierDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface VerificationResult {
  id: string;
  certificate_id: string;
  result_status: string;
  overall_confidence: number;
  created_at: string;
  certificate?: {
    product_name: string;
    serial_number: string;
  };
}

export function HistoryPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState("");

  const { data: verifications, isLoading } = useQuery({
    queryKey: ["verification-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_results")
        .select(`
          id,
          certificate_id,
          result_status,
          overall_confidence,
          created_at,
          certificates (
            product_name,
            serial_number
          )
        `)
        .eq("verifier_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return data.map((item: any) => ({
        ...item,
        certificate: item.certificates
      })) as VerificationResult[];
    },
    enabled: !!user,
  });

  const filteredVerifications = verifications?.filter(
    (v) =>
      v.certificate?.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.certificate?.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, confidence: number) => {
    if (status === "verified" || confidence >= 80) {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    } else if (status === "suspicious" || confidence < 50) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          <XCircle className="h-3 w-3 mr-1" />
          Suspicious
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          <Clock className="h-3 w-3 mr-1" />
          Inconclusive
        </Badge>
      );
    }
  };

  return (
    <VerifierDashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-secondary/10">
              <History className="h-6 w-6 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold">Verification History</h1>
          </div>
          <p className="text-muted-foreground">
            View all your past verification results.
          </p>
        </motion.div>

        {/* Search */}
        <Card className="glass-card border-border">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or serial number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Recent Verifications</CardTitle>
            <CardDescription>
              {filteredVerifications?.length || 0} verification(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading history...
              </div>
            ) : filteredVerifications?.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No verification history yet.</p>
                <p className="text-sm text-muted-foreground">
                  Start by scanning a QR code or searching for a certificate.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVerifications?.map((verification, index) => (
                  <motion.div
                    key={verification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {verification.certificate?.product_name || "Unknown Product"}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {verification.certificate?.serial_number || verification.certificate_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {verification.overall_confidence}% confidence
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(verification.created_at), "MMM d, yyyy")}
                        </div>
                      </div>
                      {getStatusBadge(verification.result_status, verification.overall_confidence)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VerifierDashboardLayout>
  );
}

export default HistoryPage;
