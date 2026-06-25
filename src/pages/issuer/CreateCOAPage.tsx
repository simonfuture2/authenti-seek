import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useWallet } from "@solana/wallet-adapter-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Loader2,
  Package,
  FileText,
  Tag,
  Hash,
  Wallet,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Link2,
  ImageIcon,
  Sparkles,
  Wand2,
  BarChart3,
  ShieldCheck,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IssuerDashboardLayout } from "@/components/layout/IssuerDashboardLayout";
import { useCertificates, Certificate } from "@/hooks/useCertificates";
import { useSolanaTransaction } from "@/hooks/useSolanaTransaction";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/ui/image-upload";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useCertificateAI } from "@/hooks/useCertificateAI";
import { useCredits } from "@/hooks/useCredits";
import { useCertificateImageUpload } from "@/hooks/useCertificateImageUpload";

// Certificate theming components
import { ThemeSelector } from "@/components/certificate/ThemeSelector";
import { SealSelector } from "@/components/certificate/SealSelector";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import { CertificateTheme, SealStyle } from "@/components/certificate/CertificateThemes";
import { MintModeSelector } from "@/components/certificate/MintModeSelector";
import { MintingMode } from "@/lib/metaplex";
import { useNFTMinting } from "@/hooks/useNFTMinting";

// Verification data components
import { PhysicalAttributesForm } from "@/components/issuer/PhysicalAttributesForm";
import { UniqueIdentifiersForm } from "@/components/issuer/UniqueIdentifiersForm";
import { useCollectAIIdentify, CollectAIResult } from "@/hooks/useCollectAIIdentify";
import { CollectAIIdentifyButton } from "@/components/ecosystem/CollectAIIdentifyButton";
import {
  GraderCertStep,
  type GraderChoice,
} from "@/components/certificate/GraderCertStep";
import {
  useGraderVerification,
  type GraderMatchStatus,
  type GraderVerifyResult,
} from "@/hooks/useGraderVerification";

const createCertificateSchema = z.object({
  serial_number: z.string().min(3, "Serial number must be at least 3 characters").max(50),
  product_name: z.string().min(2, "Product name is required").max(100),
  product_description: z.string().max(500).optional(),
  product_category: z.string().optional(),
});

type CreateCertificateForm = z.infer<typeof createCertificateSchema>;

const categories = [
  "Art",
  "Collectibles",
  "Electronics",
  "Fashion",
  "Jewelry",
  "Luxury Goods",
  "Memorabilia",
  "Watches",
  "Wine & Spirits",
  "Other",
];

export function CreateCOAPage() {
  const [searchParams] = useSearchParams();
  const [collectAIToken] = useState(() => searchParams.get("token"));
  const [collectAIPrefilled, setCollectAIPrefilled] = useState(false);
  const [collectAILoading, setCollectAILoading] = useState(false);
  const [collectAICallbackUrl, setCollectAICallbackUrl] = useState<string | null>(null);
  const [collectAICardId, setCollectAICardId] = useState<string | null>(null);
  const isCollectAIReferral = searchParams.get("ref") === "collectai";
  const [createdCert, setCreatedCert] = useState<Certificate | null>(null);
  const [storeOnChain, setStoreOnChain] = useState(true);
  const [onChainSignature, setOnChainSignature] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [certificateImageUrl, setCertificateImageUrl] = useState<string | null>(null);
  
  // Theme and seal selection
  const [selectedTheme, setSelectedTheme] = useState<CertificateTheme>("luxury");
  const [selectedSeal, setSelectedSeal] = useState<SealStyle>("gold");
  
  // Physical attributes and identifiers for verification
  const [physicalAttributes, setPhysicalAttributes] = useState<Record<string, string>>({});
  const [uniqueIdentifiers, setUniqueIdentifiers] = useState<Record<string, string>>({});
  
  // AI features state
  const [authenticityScore, setAuthenticityScore] = useState<{
    score: number;
    confidence: string;
    factors: string[];
  } | null>(null);
  const [aiSealImage, setAiSealImage] = useState<string | null>(null);
  
  // Minting mode selection
  const [mintingMode, setMintingMode] = useState<MintingMode>("nft");

  // Grader cert verification (Phase 1)
  const [graderChoice, setGraderChoice] = useState<GraderChoice>("none");
  const [graderCertNumber, setGraderCertNumber] = useState("");
  const [graderStatus, setGraderStatus] = useState<GraderMatchStatus | null>("self_attested");
  const [graderResult, setGraderResult] = useState<GraderVerifyResult | null>(null);
  const { verify: commitGraderVerification } = useGraderVerification();

  const { createCertificate } = useCertificates();
  const { mintCertificate, isSubmitting: isMinting } = useNFTMinting();
  const { publicKey, connected } = useWallet();
  const { submitCertificate, isSubmitting, getExplorerUrl } = useSolanaTransaction();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { uploadImages, uploading, uploadProgress } = useImageUpload();
  const {
    isLoading: aiLoading, 
    isGeneratingImage,
    generateDescription, 
    analyzeAuthenticity,
    generateSealImage,
  } = useCertificateAI();
  const { uploadCertificateImage, uploading: uploadingCertImage } = useCertificateImageUpload();
  const { credits, refetchCredits } = useCredits();
  const { identify, isIdentifying, result: collectAIResult, clearResult: clearCollectAIResult } = useCollectAIIdentify();
  
  const AI_SEAL_CREDIT_COST = 0.5;
  const hasEnoughCreditsForSeal = (credits?.balance ?? 0) >= AI_SEAL_CREDIT_COST;

  const handleCollectAIIdentify = async () => {
    if (productImages.length === 0) return;
    await identify(productImages[0]);
  };

  const handleApplyCollectAIResult = (result: CollectAIResult) => {
    if (result.name) form.setValue("product_name", result.name);
    if (result.description) form.setValue("product_description", result.description);
    if (result.category) {
      // Map CollectAI category to our categories
      const matchedCategory = categories.find(
        (c) => c.toLowerCase() === result.category?.toLowerCase()
      );
      if (matchedCategory) {
        form.setValue("product_category", matchedCategory);
      }
    }
    toast({ title: "CollectAI data applied to certificate fields" });
  };

  const form = useForm<CreateCertificateForm>({
    resolver: zodResolver(createCertificateSchema),
    defaultValues: {
      serial_number: "",
      product_name: "",
      product_description: "",
      product_category: "",
    },
  });

  const watchedProductName = form.watch("product_name");
  const watchedSerialNumber = form.watch("serial_number");
  const watchedCategory = form.watch("product_category");
  const watchedDescription = form.watch("product_description");

  // Verify CollectAI JWT and pre-fill form
  useEffect(() => {
    if (!collectAIToken || collectAIPrefilled) return;

    const verifyAndPrefill = async () => {
      setCollectAILoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("verify-collectai-jwt", {
          body: { token: collectAIToken },
        });

        if (error || !data?.success) {
          toast({
            title: "CollectAI Token Invalid",
            description: data?.error || "Could not verify the token. Please fill in the form manually.",
            variant: "destructive",
          });
          return;
        }

        const cardData = data.data;
        if (cardData.cardName) form.setValue("product_name", cardData.cardName);
        if (cardData.cardDescription) form.setValue("product_description", cardData.cardDescription);
        if (cardData.cardCategory) {
          const matched = categories.find(
            (c) => c.toLowerCase() === cardData.cardCategory?.toLowerCase()
          );
          if (matched) form.setValue("product_category", matched);
        }
        if (cardData.serialNumber) form.setValue("serial_number", cardData.serialNumber);
        if (cardData.cardImage) setProductImages([cardData.cardImage]);
        if (cardData.callbackUrl) setCollectAICallbackUrl(cardData.callbackUrl);
        if (cardData.cardId) setCollectAICardId(cardData.cardId);

        setCollectAIPrefilled(true);
        toast({ title: "Pre-filled from CollectAI", description: "Certificate fields have been populated from your CollectAI data." });
      } catch (err) {
        console.error("CollectAI JWT verification failed:", err);
        toast({
          title: "Verification Error",
          description: "Failed to verify CollectAI token. Please fill in the form manually.",
          variant: "destructive",
        });
      } finally {
        setCollectAILoading(false);
      }
    };

    verifyAndPrefill();
  }, [collectAIToken, collectAIPrefilled]);

  const handleFilesSelected = async (files: File[]) => {
    const urls = await uploadImages(files);
    if (urls.length > 0) {
      setProductImages((prev) => [...prev, ...urls]);
    }
  };

  const handleAIDescription = async () => {
    const result = await generateDescription({
      productName: watchedProductName,
      productCategory: watchedCategory,
      existingDescription: watchedDescription,
      productImageUrl: productImages[0],
    });
    if (result) {
      form.setValue("product_description", result);
    }
  };

  const handleAIAnalysis = async () => {
    const result = await analyzeAuthenticity({
      productName: watchedProductName,
      productCategory: watchedCategory,
      serialNumber: watchedSerialNumber,
      productImageUrl: productImages[0],
    });
    if (result) {
      setAuthenticityScore({
        score: result.score,
        confidence: result.confidence,
        factors: result.factors,
      });
    }
  };

  const handleGenerateAISeal = async () => {
    if (!hasEnoughCreditsForSeal) {
      toast({
        title: "Insufficient Credits",
        description: `AI seal generation requires ${AI_SEAL_CREDIT_COST} credits. Please purchase more credits.`,
        variant: "destructive",
      });
      return;
    }
    
    // Deduct credits for AI seal
    const { data: deductResult, error: deductError } = await supabase
      .rpc("deduct_credits", {
        p_user_id: user!.id,
        p_amount: AI_SEAL_CREDIT_COST,
        p_transaction_type: "certificate_creation",
        p_description: `AI seal generation for ${watchedProductName || "certificate"}`,
      });
    
    if (deductError || !deductResult?.[0]?.success) {
      toast({
        title: "Credit Deduction Failed",
        description: deductResult?.[0]?.message || "Failed to deduct credits for AI seal.",
        variant: "destructive",
      });
      return;
    }
    
    const imageUrl = await generateSealImage({
      productName: watchedProductName,
      productCategory: watchedCategory,
      sealStyle: selectedSeal,
    });
    
    if (imageUrl) {
      setAiSealImage(imageUrl);
      refetchCredits();
      toast({
        title: "AI Seal Generated",
        description: `${AI_SEAL_CREDIT_COST} credits deducted. Remaining balance: ${deductResult[0].new_balance} credits.`,
      });
    } else {
      // Refund credits if generation failed
      await supabase.rpc("add_credits", {
        p_user_id: user!.id,
        p_amount: AI_SEAL_CREDIT_COST,
        p_payment_method: "sol",
        p_description: "Refund: AI seal generation failed",
      });
      refetchCredits();
    }
  };

  const handleCertificateImageGenerated = (dataUrl: string) => {
    setCertificateImageUrl(dataUrl);
  };

  const onSubmit = async (data: CreateCertificateForm) => {
    // Hard guard: never seal while the grader cross-check is in mismatch.
    if (graderStatus === "mismatch") {
      toast({
        title: "Cannot seal — grader mismatch",
        description:
          "The grading company's record describes a different card. Resolve or report before sealing.",
        variant: "destructive",
      });
      return;
    }

    // Create certificate in database first
    const result = await createCertificate.mutateAsync({
      serial_number: data.serial_number,
      product_name: data.product_name,
      product_description: data.product_description,
      product_category: data.product_category,
      product_images: productImages.length > 0 ? productImages : undefined,
      current_owner_wallet: publicKey?.toBase58() || undefined,
      metadata: {
        theme: selectedTheme,
        sealStyle: productImages.length === 0 ? selectedSeal : undefined,
        authenticityScore: authenticityScore,
      },
    });

    // Persist the grader preview snapshot onto the new certificate row.
    // The COMMIT call below will overwrite grader_match_status + grader_verified_at
    // and append the audit row, but writing here first guarantees the snapshot
    // sticks even if the edge function call fails.
    if (graderChoice !== "none" && graderCertNumber.trim()) {
      const { error: graderUpdateErr } = await supabase
        .from("certificates")
        .update({
          grader: graderChoice,
          grader_cert_number: graderCertNumber.trim(),
          ...(graderResult
            ? {
                grader_grade: graderResult.grade ?? null,
                grader_grade_scale: graderResult.gradeScale ?? null,
                grader_report_url: graderResult.reportUrl,
                grader_images: (graderResult.images ?? {}) as never,
                grader_card_snapshot: (graderResult.snapshot ?? {}) as never,
                grader_match_status: graderResult.status,
              }
            : {}),
        })
        .eq("id", result.id);
      if (graderUpdateErr) {
        console.error("Grader snapshot save failed:", graderUpdateErr);
      }
    }

    // Update certificate with physical attributes and identifiers
    const hasPhysicalData = Object.values(physicalAttributes).some(v => v);
    const hasIdentifiers = Object.values(uniqueIdentifiers).some(v => v);
    
    if (hasPhysicalData || hasIdentifiers) {
      await supabase
        .from("certificates")
        .update({
          physical_attributes: hasPhysicalData ? physicalAttributes : {},
          unique_identifiers: hasIdentifiers ? uniqueIdentifiers : {},
        })
        .eq("id", result.id);
    }

    // Upload certificate image to storage if available
    let storedImageUrl: string | null = null;
    if (certificateImageUrl) {
      storedImageUrl = await uploadCertificateImage(
        certificateImageUrl,
        result.id,
        data.serial_number
      );
      
      // Update certificate with stored image URL
      if (storedImageUrl) {
        await supabase
          .from("certificates")
          .update({ 
            metadata: {
              theme: selectedTheme,
              sealStyle: productImages.length === 0 ? selectedSeal : undefined,
              authenticityScore: authenticityScore,
              certificateImageUrl: storedImageUrl,
            }
          })
          .eq("id", result.id);
      }
    }

    // If user wants to store on-chain and wallet is connected
    if (storeOnChain && connected && publicKey) {
      const timestamp = Date.now();
      
      // Include the stored certificate image URL in on-chain metadata
      const onChainResult = await submitCertificate({
        serialNumber: data.serial_number,
        productName: data.product_name,
        issuerId: user?.id || "",
        timestamp,
        metadataHash: storedImageUrl || result.id, // Use image URL as metadata reference if available
      });

      if (onChainResult) {
        setOnChainSignature(onChainResult.signature);
        
        // Update certificate with Solana signature
        await supabase
          .from("certificates")
          .update({ solana_signature: onChainResult.signature })
          .eq("id", result.id);
      }
    }

    // Update local state with stored URL
    if (storedImageUrl) {
      setCertificateImageUrl(storedImageUrl);
    }

    setCreatedCert(result);

    // Commit grader verification to the new certificate (Phase 1).
    if (graderChoice !== "none" && graderCertNumber.trim()) {
      try {
        await commitGraderVerification({
          grader: graderChoice,
          certNumber: graderCertNumber.trim(),
          certificateId: result.id,
          sealedCard: { product_name: data.product_name },
          collectAiCard: collectAIResult
            ? {
                subject: collectAIResult.name ?? null,
                brand: collectAIResult.brand ?? null,
                year: collectAIResult.year ?? null,
                cardNumber: null,
              }
            : null,
        });
      } catch (err) {
        console.error("Grader commit failed:", err);
        toast({
          title: "Grader record not saved",
          description: "Certificate created, but the grader cross-check couldn't be saved.",
          variant: "destructive",
        });
      }
    }

    // Fire CollectAI callback if this was a CollectAI referral
    if (collectAICallbackUrl && collectAICardId) {
      try {
        const { error: cbError } = await supabase.functions.invoke("collectai-callback", {
          body: {
            callback_url: collectAICallbackUrl,
            card_id: collectAICardId,
            serial_number: data.serial_number,
          },
        });
        if (cbError) {
          console.error("CollectAI callback failed:", cbError);
          toast({ title: "CollectAI notification failed", description: "The certificate was created, but we couldn't notify CollectAI.", variant: "destructive" });
        } else {
          toast({ title: "CollectAI has been notified", description: "Certificate details sent back to CollectAI." });
        }
      } catch (err) {
        console.error("CollectAI callback error:", err);
      }
    }
  };

  const generateSerialNumber = () => {
    const prefix = "COA";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    form.setValue("serial_number", `${prefix}-${timestamp}-${random}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const downloadQR = () => {
    const svg = document.getElementById("qr-code");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `COA-${createdCert?.serial_number}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  if (createdCert) {
    return (
      <IssuerDashboardLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="glass-card overflow-hidden">
            <div className="h-2 bg-solana-gradient" />
            <CardHeader className="text-center pb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mx-auto mb-4"
              >
                <AuthentiSealMark size={128} state="verified" />
              </motion.div>
              <CardTitle className="text-2xl">Certificate Sealed!</CardTitle>
              <p className="text-muted-foreground">
                Your Certificate of Authenticity has been created successfully.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* On-Chain Status */}
              {onChainSignature && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-primary/10 border border-primary/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-primary">Stored On-Chain</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    This certificate is permanently recorded on the Solana blockchain.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted/50 px-2 py-1 rounded truncate">
                      {onChainSignature}
                    </code>
                    <button
                      onClick={() => copyToClipboard(onChainSignature)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <a
                      href={getExplorerUrl(onChainSignature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </motion.div>
              )}

              {/* Generated Certificate Image */}
              {certificateImageUrl && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img
                    src={certificateImageUrl}
                    alt="Generated Certificate"
                    className="w-full"
                  />
                </div>
              )}

              {/* QR Code */}
              <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl">
                <QRCodeSVG
                  id="qr-code"
                  value={createdCert.qr_code_data || ""}
                  size={200}
                  level="H"
                  includeMargin
                  bgColor="white"
                  fgColor="#1a1a2e"
                />
                <Button variant="outline" size="sm" onClick={downloadQR}>
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </div>

              {/* Certificate Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Serial Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{createdCert.serial_number}</span>
                    <button
                      onClick={() => copyToClipboard(createdCert.serial_number)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Product</span>
                  <span className="text-sm font-medium">{createdCert.product_name}</span>
                </div>
                {createdCert.product_category && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="text-sm">{createdCert.product_category}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Certificate ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs truncate max-w-[150px]">
                      {createdCert.id}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdCert.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Images */}
              {createdCert.product_images && createdCert.product_images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Product Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {createdCert.product_images.map((url, index) => (
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

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCreatedCert(null);
                    setOnChainSignature(null);
                    setProductImages([]);
                    setCertificateImageUrl(null);
                    setAuthenticityScore(null);
                    setPhysicalAttributes({});
                    setUniqueIdentifiers({});
                    form.reset();
                  }}
                >
                  Create Another
                </Button>
                <Button className="flex-1 bg-solana-gradient">
                  View Certificate
                </Button>
              </div>
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Seal a Card</h1>
              <p className="text-muted-foreground">
                Create a tamper-proof Certificate of Authenticity for a card in your collection.
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI Enhanced
            </Badge>
          </div>

          {/* CollectAI Referral Banner */}
          {isCollectAIReferral && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <ScanSearch className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  You were referred from{" "}
                  <a
                    href="https://collectai.lovable.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold"
                  >
                    CollectAI
                  </a>
                </p>
                <p className="text-xs text-muted-foreground">
                  {collectAIPrefilled
                    ? "Your card data has been pre-filled below."
                    : collectAILoading
                      ? "Verifying your data…"
                      : "AI-Powered Card Grading → Blockchain-Verified Certificate"}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                Ecosystem
              </Badge>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Column */}
            <Card className="glass-card">
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  placeholder="COA-XXXXX-XXXX"
                                  className="pl-10"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={generateSerialNumber}
                              >
                                Generate
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Unique identifier for this certificate
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="product_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                {...field}
                                placeholder="e.g., Limited Edition Watch"
                                className="pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="product_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-muted-foreground" />
                                  <SelectValue placeholder="Select a category" />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="product_description"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Description</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleAIDescription}
                              disabled={!watchedProductName || aiLoading}
                              className="h-7 text-xs gap-1"
                            >
                              {aiLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Wand2 className="h-3 w-3" />
                              )}
                              AI Write
                            </Button>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Textarea
                                {...field}
                                placeholder="Describe the product, its unique features, materials, etc."
                                className="pl-10 min-h-[100px]"
                              />
                    </div>
                          </FormControl>

                    {/* CollectAI Auto-Identify */}
                    <CollectAIIdentifyButton
                      onIdentify={handleCollectAIIdentify}
                      isIdentifying={isIdentifying}
                      result={collectAIResult}
                      onClearResult={clearCollectAIResult}
                      onApplyResult={handleApplyCollectAIResult}
                      disabled={createCertificate.isPending}
                      hasImage={productImages.length > 0}
                    />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Certificate Theme Selection */}
                    <ThemeSelector
                      selectedTheme={selectedTheme}
                      onThemeChange={setSelectedTheme}
                      disabled={createCertificate.isPending}
                    />

                    {/* Product Images Upload */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <FormLabel>Product Images (Optional)</FormLabel>
                      </div>
                      <ImageUpload
                        images={productImages}
                        onImagesChange={setProductImages}
                        onFilesSelected={handleFilesSelected}
                        uploading={uploading}
                        uploadProgress={uploadProgress}
                        maxImages={5}
                      />
                    </div>

                    {/* Physical Attributes for Verification */}
                    <PhysicalAttributesForm
                      attributes={physicalAttributes}
                      onChange={setPhysicalAttributes}
                      disabled={createCertificate.isPending}
                    />

                    {/* Unique Identifiers for Verification */}
                    <UniqueIdentifiersForm
                      identifiers={uniqueIdentifiers}
                      onChange={setUniqueIdentifiers}
                      disabled={createCertificate.isPending}
                    />

                    {/* Seal Selection */}
                    <SealSelector
                      selectedSeal={selectedSeal}
                      onSealChange={(seal) => {
                        setSelectedSeal(seal);
                        setAiSealImage(null); // Clear AI seal when preset selected
                      }}
                      hasProductImage={productImages.length > 0}
                      disabled={createCertificate.isPending}
                      onGenerateAISeal={handleGenerateAISeal}
                      isGeneratingAISeal={isGeneratingImage}
                      aiSealImage={aiSealImage}
                      productName={watchedProductName}
                      productCategory={watchedCategory}
                      creditCost={AI_SEAL_CREDIT_COST}
                      hasEnoughCredits={hasEnoughCreditsForSeal}
                    />

                    {/* AI Authenticity Analysis */}
                    {watchedProductName && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">AI Authenticity Score</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleAIAnalysis}
                            disabled={aiLoading}
                            className="h-7 text-xs gap-1"
                          >
                            {aiLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <BarChart3 className="h-3 w-3" />
                            )}
                            Analyze
                          </Button>
                        </div>
                        
                        {authenticityScore && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="p-4 rounded-lg bg-muted/50 border border-border space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-primary">
                                {authenticityScore.score}%
                              </span>
                              <Badge
                                variant={
                                  authenticityScore.confidence === "high"
                                    ? "default"
                                    : authenticityScore.confidence === "medium"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {authenticityScore.confidence} confidence
                              </Badge>
                            </div>
                            <Progress value={authenticityScore.score} className="h-2" />
                            <div className="flex flex-wrap gap-1">
                              {authenticityScore.factors.slice(0, 3).map((factor, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Grading Certificate Step */}
                    <GraderCertStep
                      grader={graderChoice}
                      certNumber={graderCertNumber}
                      onGraderChange={setGraderChoice}
                      onCertNumberChange={setGraderCertNumber}
                      productName={watchedProductName ?? ""}
                      collectAiCard={
                        collectAIResult
                          ? {
                              subject: collectAIResult.name ?? null,
                              brand: collectAIResult.brand ?? null,
                              year: collectAIResult.year ?? null,
                              cardNumber: null,
                            }
                          : null
                      }
                      onStatusChange={(status, result) => {
                        setGraderStatus(status);
                        setGraderResult(result);
                      }}
                      disabled={createCertificate.isPending}
                    />

                    {/* On-Chain Storage Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Link2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Store On-Chain</p>
                          <p className="text-xs text-muted-foreground">
                            Permanently record on Solana blockchain
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={storeOnChain}
                        onCheckedChange={setStoreOnChain}
                        disabled={!connected}
                      />
                    </div>

                    {/* Minting Mode Selector - shown when on-chain is enabled */}
                    {storeOnChain && connected && (
                      <MintModeSelector
                        value={mintingMode}
                        onChange={setMintingMode}
                        disabled={createCertificate.isPending || isMinting}
                      />
                    )}

                    {storeOnChain && !connected && (
                      <p className="text-sm text-warning">
                        ⚠️ Connect your wallet to store on-chain
                      </p>
                    )}

                    {publicKey && (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                        <Wallet className="h-5 w-5 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Connected Wallet</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {publicKey.toBase58()}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-solana-gradient hover:opacity-90"
                      disabled={
                        createCertificate.isPending ||
                        isSubmitting ||
                        isMinting ||
                        uploading ||
                        uploadingCertImage ||
                        graderStatus === "mismatch"
                      }
                    >
                      {createCertificate.isPending || isSubmitting || isMinting || uploadingCertImage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {uploadingCertImage ? "Uploading Certificate..." : (isSubmitting || isMinting) ? "Storing On-Chain..." : "Creating..."}
                        </>
                      ) : graderStatus === "mismatch" ? (
                        <>⚠ Resolve grader mismatch to seal</>
                      ) : (
                        <>
                          Create Certificate
                          {storeOnChain && connected && (mintingMode === "nft" ? " + Mint NFT" : " + Store On-Chain")}
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Preview Column */}
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Live Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <CertificatePreview
                    theme={selectedTheme}
                    sealStyle={selectedSeal}
                    productImage={productImages[0]}
                    aiSealImage={aiSealImage}
                    productName={watchedProductName || "Product Name"}
                    serialNumber={watchedSerialNumber || "COA-XXXXX"}
                    category={watchedCategory}
                    issuerName={profile?.company_name || profile?.display_name || undefined}
                    showSealWithImage={productImages.length > 0}
                    onImageGenerated={handleCertificateImageGenerated}
                  />
                </CardContent>
              </Card>

              {/* AI Features Info */}
              <Card className="glass-card border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">AI-Powered Features</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-primary" />
                      Auto-generate product descriptions
                    </li>
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Authenticity scoring & analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Dynamic certificate generation
                    </li>
                    <li className="flex items-center gap-2">
                      <ScanSearch className="h-4 w-4 text-primary" />
                      CollectAI auto-identification
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </IssuerDashboardLayout>
  );
}

export default CreateCOAPage;
