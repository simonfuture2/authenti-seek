import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Package, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifierDashboardLayout } from "@/components/layout/VerifierDashboardLayout";
import { useCertificateSearch } from "@/hooks/useCertificates";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { searchCertificate } = useCertificateSearch();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await searchCertificate(query);
      setResults(data || []);
    } catch (error) {
      console.error(error);
    }
    setSearching(false);
  };

  return (
    <VerifierDashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-3xl font-bold mb-2">Search Certificates</h1>
        <p className="text-muted-foreground mb-8">
          Search by serial number or product name.
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

        <div className="space-y-4">
          {results.length > 0 ? (
            results.map((cert) => (
              <Card key={cert.id} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-success/10">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{cert.product_name}</h3>
                      <p className="text-sm font-mono text-muted-foreground">
                        {cert.serial_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Issued: {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : query && !searching ? (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No certificates found</p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter a search term to find certificates</p>
            </div>
          )}
        </div>
      </motion.div>
    </VerifierDashboardLayout>
  );
}

export default SearchPage;
