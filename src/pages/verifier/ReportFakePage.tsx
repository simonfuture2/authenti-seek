import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Upload, Send, Loader2, CheckCircle } from "lucide-react";
import { VerifierDashboardLayout } from "@/components/layout/VerifierDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ReportFakePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [serialNumber, setSerialNumber] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serialNumber.trim() || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both serial number and reason for the report.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("fake_reports").insert({
        reporter_id: user!.id,
        serial_number: serialNumber,
        reason: reason,
        status: "pending",
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Report Submitted",
        description: "Thank you for helping us fight counterfeits. We'll investigate this report.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSerialNumber("");
    setReason("");
    setSubmitted(false);
  };

  return (
    <VerifierDashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">Report Counterfeit</h1>
          </div>
          <p className="text-muted-foreground">
            Help us fight counterfeits by reporting suspicious products.
          </p>
        </motion.div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="glass-card border-success/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Report Submitted</h3>
                <p className="text-muted-foreground mb-6">
                  Thank you for your report. Our team will investigate and take
                  appropriate action. You may be contacted for additional information.
                </p>
                <Button onClick={handleReset}>Submit Another Report</Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>
                Provide as much information as possible to help us investigate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number or Certificate ID</Label>
                  <Input
                    id="serialNumber"
                    placeholder="Enter the serial number or certificate ID"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This can be found on the product label or certificate.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Report</Label>
                  <Textarea
                    id="reason"
                    placeholder="Describe why you believe this product is counterfeit..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={5}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Include details like visual differences, packaging issues, or
                    verification failures.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Evidence (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop photos here, or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 10MB
                    </p>
                  </div>
                </div>

                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">Important Notice</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        False reports may result in account suspension. Only report
                        products you genuinely believe to be counterfeit.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-destructive hover:bg-destructive/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Report
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </VerifierDashboardLayout>
  );
}

export default ReportFakePage;
