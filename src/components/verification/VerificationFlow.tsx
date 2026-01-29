import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Hash,
  Ruler,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { useImageUpload } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Certificate } from "@/hooks/useCertificates";
import type { Json } from "@/integrations/supabase/types";

interface VerificationFlowProps {
  certificate: Certificate & {
    profiles?: { display_name?: string; company_name?: string } | null;
    physical_attributes?: Record<string, string>;
    unique_identifiers?: Record<string, string>;
  };
  onComplete: () => void;
  onCancel: () => void;
}

interface VerificationResult {
  overallConfidence: number;
  imageConfidence: number;
  attributeConfidence: number;
  identifierConfidence: number;
  resultStatus: "authentic" | "suspicious" | "counterfeit";
  analysis: string;
  attributeMatches: Record<string, { matches: boolean; notes: string }>;
  identifierMatches: Record<string, { matches: boolean; notes: string }>;
}

type Step = "photos" | "identifiers" | "attributes" | "analyzing" | "results";

export function VerificationFlow({ certificate, onComplete, onCancel }: VerificationFlowProps) {
  const [step, setStep] = useState<Step>("photos");
  const [verificationPhotos, setVerificationPhotos] = useState<string[]>([]);
  const [reportedIdentifiers, setReportedIdentifiers] = useState<Record<string, string>>({});
  const [reportedAttributes, setReportedAttributes] = useState<Record<string, string>>({});
  const [attributeChecklist, setAttributeChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadImages, uploading, uploadProgress } = useImageUpload();

  // Parse JSONB fields safely
  const physicalAttributes = (certificate.physical_attributes || {}) as Record<string, string>;
  const uniqueIdentifiers = (certificate.unique_identifiers || {}) as Record<string, string>;

  const handleFilesSelected = async (files: File[]) => {
    const urls = await uploadImages(files);
    if (urls.length > 0) {
      setVerificationPhotos((prev) => [...prev, ...urls]);
    }
  };

  const runVerification = async () => {
    setStep("analyzing");
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-authenticity", {
        body: {
          certificateId: certificate.id,
          certificateImages: certificate.product_images || [],
          productName: certificate.product_name,
          productDescription: certificate.product_description,
          physicalAttributes,
          uniqueIdentifiers,
          verificationPhotos,
          reportedIdentifiers,
          reportedAttributes,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Verification failed");

      setResult(data.result);

      // Save verification result to database
      const { error: saveError } = await supabase.from("verification_results").insert({
        certificate_id: certificate.id,
        verifier_id: user!.id,
        overall_confidence: data.result.overallConfidence,
        image_confidence: data.result.imageConfidence,
        attribute_confidence: data.result.attributeConfidence,
        identifier_confidence: data.result.identifierConfidence,
        verification_photos: verificationPhotos,
        attribute_checklist: attributeChecklist as unknown as Json,
        identifier_matches: data.result.identifierMatches as unknown as Json,
        ai_analysis: data.result.analysis,
        notes,
        result_status: data.result.resultStatus,
      });

      if (saveError) {
        console.error("Failed to save verification result:", saveError);
      }

      setStep("results");
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setStep("attributes"); // Go back to last step
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "authentic":
        return "text-success";
      case "suspicious":
        return "text-warning";
      case "counterfeit":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "authentic":
        return <CheckCircle2 className="h-12 w-12 text-success" />;
      case "suspicious":
        return <AlertTriangle className="h-12 w-12 text-warning" />;
      case "counterfeit":
        return <XCircle className="h-12 w-12 text-destructive" />;
      default:
        return <ShieldCheck className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <Card className="glass-card max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verify Authenticity
          </CardTitle>
          <Badge variant="outline">{certificate.serial_number}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{certificate.product_name}</p>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {/* Step 1: Photos */}
          {step === "photos" && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Camera className="h-4 w-4" />
                <span>Step 1 of 3: Take photos of the physical item</span>
              </div>

              {/* Certificate reference images */}
              {certificate.product_images && certificate.product_images.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Reference Images (from certificate)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {certificate.product_images.map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                        <img src={url} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification photos */}
              <div className="space-y-2">
                <Label>Your Verification Photos</Label>
                <p className="text-xs text-muted-foreground">
                  Take clear photos of the physical item from multiple angles
                </p>
                <ImageUpload
                  images={verificationPhotos}
                  onImagesChange={setVerificationPhotos}
                  onFilesSelected={handleFilesSelected}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  maxImages={5}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep("identifiers")}
                  disabled={verificationPhotos.length === 0}
                  className="flex-1"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Identifiers */}
          {step === "identifiers" && (
            <motion.div
              key="identifiers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Hash className="h-4 w-4" />
                <span>Step 2 of 3: Verify unique identifiers</span>
              </div>

              <p className="text-sm text-muted-foreground">
                Enter the serial numbers, tags, or codes found on the physical item:
              </p>

              <div className="space-y-4">
                {/* Serial Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Serial Number</Label>
                    {uniqueIdentifiers.serialNumber && (
                      <span className="text-xs text-muted-foreground">
                        Expected: {uniqueIdentifiers.serialNumber}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="Enter serial number from item"
                    value={reportedIdentifiers.serialNumber || ""}
                    onChange={(e) =>
                      setReportedIdentifiers((prev) => ({ ...prev, serialNumber: e.target.value }))
                    }
                  />
                </div>

                {/* Model Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Model Number</Label>
                    {uniqueIdentifiers.modelNumber && (
                      <span className="text-xs text-muted-foreground">
                        Expected: {uniqueIdentifiers.modelNumber}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="Enter model number"
                    value={reportedIdentifiers.modelNumber || ""}
                    onChange={(e) =>
                      setReportedIdentifiers((prev) => ({ ...prev, modelNumber: e.target.value }))
                    }
                  />
                </div>

                {/* NFC Tag ID */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>NFC Tag ID (if applicable)</Label>
                    {uniqueIdentifiers.nfcTagId && (
                      <span className="text-xs text-muted-foreground">
                        Expected: {uniqueIdentifiers.nfcTagId}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="Scan or enter NFC tag ID"
                    value={reportedIdentifiers.nfcTagId || ""}
                    onChange={(e) =>
                      setReportedIdentifiers((prev) => ({ ...prev, nfcTagId: e.target.value }))
                    }
                  />
                </div>

                {/* Batch Code */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Batch/Lot Code</Label>
                    {uniqueIdentifiers.batchCode && (
                      <span className="text-xs text-muted-foreground">
                        Expected: {uniqueIdentifiers.batchCode}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="Enter batch or lot code"
                    value={reportedIdentifiers.batchCode || ""}
                    onChange={(e) =>
                      setReportedIdentifiers((prev) => ({ ...prev, batchCode: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("photos")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep("attributes")} className="flex-1">
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Attributes */}
          {step === "attributes" && (
            <motion.div
              key="attributes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Ruler className="h-4 w-4" />
                <span>Step 3 of 3: Verify physical attributes</span>
              </div>

              <p className="text-sm text-muted-foreground">
                Measure and inspect the physical item:
              </p>

              <div className="space-y-4">
                {/* Weight */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Weight
                    </Label>
                    {physicalAttributes.weight && (
                      <span className="text-xs text-muted-foreground">
                        Expected: {physicalAttributes.weight}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g., 150g"
                    value={reportedAttributes.weight || ""}
                    onChange={(e) =>
                      setReportedAttributes((prev) => ({ ...prev, weight: e.target.value }))
                    }
                  />
                </div>

                {/* Dimensions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Dimensions
                    </Label>
                    {physicalAttributes.dimensions && (
                      <span className="text-xs text-muted-foreground">
                        Expected: {physicalAttributes.dimensions}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g., 42mm x 12mm"
                    value={reportedAttributes.dimensions || ""}
                    onChange={(e) =>
                      setReportedAttributes((prev) => ({ ...prev, dimensions: e.target.value }))
                    }
                  />
                </div>

                {/* Materials */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Materials</Label>
                    {physicalAttributes.materials && (
                      <span className="text-xs text-muted-foreground">
                        Expected: {physicalAttributes.materials}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g., 18k Gold, Sapphire Crystal"
                    value={reportedAttributes.materials || ""}
                    onChange={(e) =>
                      setReportedAttributes((prev) => ({ ...prev, materials: e.target.value }))
                    }
                  />
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Color</Label>
                    {physicalAttributes.color && (
                      <span className="text-xs text-muted-foreground">
                        Expected: {physicalAttributes.color}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g., Rose Gold, Black"
                    value={reportedAttributes.color || ""}
                    onChange={(e) =>
                      setReportedAttributes((prev) => ({ ...prev, color: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
                <Label className="text-sm font-medium">Visual Inspection Checklist</Label>
                <div className="space-y-2">
                  {[
                    "Materials match description",
                    "No signs of tampering",
                    "Branding/logos are authentic",
                    "Finish quality matches expectations",
                    "No obvious defects or damage",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Checkbox
                        id={item}
                        checked={attributeChecklist[item] || false}
                        onCheckedChange={(checked) =>
                          setAttributeChecklist((prev) => ({ ...prev, [item]: !!checked }))
                        }
                      />
                      <Label htmlFor={item} className="text-sm cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  placeholder="Any observations or concerns..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("identifiers")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={runVerification} className="flex-1 bg-solana-gradient">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verify with AI
                </Button>
              </div>
            </motion.div>
          )}

          {/* Analyzing */}
          {step === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center space-y-6"
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Analyzing Authenticity</h3>
                <p className="text-muted-foreground">
                  AI is comparing your photos and data with the certificate...
                </p>
              </div>
              <Progress value={66} className="max-w-xs mx-auto" />
            </motion.div>
          )}

          {/* Results */}
          {step === "results" && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Main Result */}
              <div className="text-center py-6">
                <div className="mx-auto mb-4">{getStatusIcon(result.resultStatus)}</div>
                <h3 className={`text-2xl font-bold capitalize ${getStatusColor(result.resultStatus)}`}>
                  {result.resultStatus}
                </h3>
                <p className="text-4xl font-bold mt-2">{result.overallConfidence.toFixed(1)}%</p>
                <p className="text-muted-foreground">Confidence Score</p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <ImageIcon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{result.imageConfidence.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Image Match</p>
                  <Progress
                    value={result.imageConfidence}
                    className={`h-1 mt-2 ${getConfidenceColor(result.imageConfidence)}`}
                  />
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Hash className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{result.identifierConfidence.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">ID Match</p>
                  <Progress
                    value={result.identifierConfidence}
                    className={`h-1 mt-2 ${getConfidenceColor(result.identifierConfidence)}`}
                  />
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Ruler className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{result.attributeConfidence.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Attributes</p>
                  <Progress
                    value={result.attributeConfidence}
                    className={`h-1 mt-2 ${getConfidenceColor(result.attributeConfidence)}`}
                  />
                </div>
              </div>

              {/* AI Analysis */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <Label className="text-sm font-medium mb-2 block">AI Analysis</Label>
                <p className="text-sm text-muted-foreground">{result.analysis}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={onComplete} className="flex-1">
                  Done
                </Button>
                {result.resultStatus !== "authentic" && (
                  <Button variant="destructive" className="flex-1">
                    Report as Fake
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
