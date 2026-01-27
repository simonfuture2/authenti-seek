import React, { useState } from "react";
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
import { IssuerDashboardLayout } from "@/components/layout/IssuerDashboardLayout";
import { useCertificates, Certificate } from "@/hooks/useCertificates";
import { useToast } from "@/hooks/use-toast";

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
  const [createdCert, setCreatedCert] = useState<Certificate | null>(null);
  const { createCertificate } = useCertificates();
  const { publicKey } = useWallet();
  const { toast } = useToast();

  const form = useForm<CreateCertificateForm>({
    resolver: zodResolver(createCertificateSchema),
    defaultValues: {
      serial_number: "",
      product_name: "",
      product_description: "",
      product_category: "",
    },
  });

  const onSubmit = async (data: CreateCertificateForm) => {
    const result = await createCertificate.mutateAsync({
      serial_number: data.serial_number,
      product_name: data.product_name,
      product_description: data.product_description,
      product_category: data.product_category,
      current_owner_wallet: publicKey?.toBase58() || undefined,
    });
    setCreatedCert(result);
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
                className="mx-auto mb-4 p-4 rounded-full bg-success/10"
              >
                <CheckCircle2 className="h-12 w-12 text-success" />
              </motion.div>
              <CardTitle className="text-2xl">Certificate Created!</CardTitle>
              <p className="text-muted-foreground">
                Your Certificate of Authenticity has been created successfully.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCreatedCert(null)}
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
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">Create Certificate</h1>
          <p className="text-muted-foreground mb-8">
            Issue a new Certificate of Authenticity for your product.
          </p>

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
                        <FormLabel>Description (Optional)</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                    disabled={createCertificate.isPending}
                  >
                    {createCertificate.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Certificate"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </IssuerDashboardLayout>
  );
}

export default CreateCOAPage;
