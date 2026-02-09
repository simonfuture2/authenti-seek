import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Code, Copy, ExternalLink, Shield } from "lucide-react";
import authentisealIcon from "@/assets/authentiseal-icon.png";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthentiSealVerify } from "@/components/ecosystem/AuthentiSealVerify";
import { useToast } from "@/hooks/use-toast";
import { ECOSYSTEM_APPS } from "@/lib/cross-app";

const DEMO_SERIAL = "COA-MKYPZ1FB-3OG7";

const codeSnippets = {
  install: `// 1. Copy AuthentiSealVerify.tsx into your project
// 2. Import and use:
import { AuthentiSealVerify } from "./components/AuthentiSealVerify";`,

  full: `<AuthentiSealVerify 
  serialNumber="COA-MKYPZ1FB-3OG7"
  variant="full"
  onResult={(result) => {
    console.log("Verified:", result.verified);
    console.log("Certificate:", result.certificate);
  }}
/>`,

  compact: `<AuthentiSealVerify 
  serialNumber="COA-MKYPZ1FB-3OG7"
  variant="compact"
/>`,

  badge: `<AuthentiSealVerify 
  serialNumber="COA-MKYPZ1FB-3OG7"
  variant="badge"
/>`,

  api: `// Direct API usage (any framework / vanilla JS)
const response = await fetch(
  "${ECOSYSTEM_APPS.authentiseal.apiBaseUrl}/verify-public?serial=COA-MKYPZ1FB-3OG7"
);
const { verified, certificate } = await response.json();

if (verified) {
  console.log("Product:", certificate.product_name);
  console.log("On-chain:", certificate.on_chain);
  console.log("Issuer:", certificate.issuer?.company_name);
}`,
};

export default function DevelopersPage() {
  const { toast } = useToast();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={authentisealIcon} alt="AuthentiSeal" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-bold gradient-text">AuthentiSeal</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Code className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">Developer API</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Integrate <span className="gradient-text">AuthentiSeal</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Add certificate verification to your app with our embeddable widget or REST API.
              Perfect for CollectAI and other ecosystem partners.
            </p>
          </motion.div>

          {/* API Endpoint Reference */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Public Verification API
                    </CardTitle>
                    <CardDescription>No authentication required</CardDescription>
                  </div>
                  <Badge variant="secondary">GET</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 font-mono text-sm break-all">
                  {ECOSYSTEM_APPS.authentiseal.apiBaseUrl}/verify-public?serial=<span className="text-primary">{'<serial_number>'}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-2">Query Parameters</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">serial</code> — Serial number lookup</li>
                      <li><code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">id</code> — UUID lookup</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Response</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li><code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">verified</code> — boolean</li>
                      <li><code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">certificate</code> — object or null</li>
                    </ul>
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted/50 text-sm overflow-x-auto font-mono">
                    {codeSnippets.api}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(codeSnippets.api)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Widget Variants */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card mb-8">
              <CardHeader>
                <CardTitle>Embeddable Widget</CardTitle>
                <CardDescription>
                  Drop-in React component — copy <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">AuthentiSealVerify.tsx</code> into your project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="full">Full Card</TabsTrigger>
                    <TabsTrigger value="compact">Compact</TabsTrigger>
                    <TabsTrigger value="badge">Badge</TabsTrigger>
                  </TabsList>

                  <TabsContent value="full" className="space-y-4">
                    <div className="flex justify-center p-6 rounded-lg bg-muted/30 border border-border">
                      <AuthentiSealVerify serialNumber={DEMO_SERIAL} variant="full" />
                    </div>
                    <div className="relative">
                      <pre className="p-4 rounded-lg bg-muted/50 text-sm overflow-x-auto font-mono">
                        {codeSnippets.full}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(codeSnippets.full)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="compact" className="space-y-4">
                    <div className="flex justify-center p-6 rounded-lg bg-muted/30 border border-border">
                      <AuthentiSealVerify serialNumber={DEMO_SERIAL} variant="compact" />
                    </div>
                    <div className="relative">
                      <pre className="p-4 rounded-lg bg-muted/50 text-sm overflow-x-auto font-mono">
                        {codeSnippets.compact}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(codeSnippets.compact)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="badge" className="space-y-4">
                    <div className="flex justify-center p-6 rounded-lg bg-muted/30 border border-border">
                      <AuthentiSealVerify serialNumber={DEMO_SERIAL} variant="badge" />
                    </div>
                    <div className="relative">
                      <pre className="p-4 rounded-lg bg-muted/50 text-sm overflow-x-auto font-mono">
                        {codeSnippets.badge}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(codeSnippets.badge)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* Getting Started */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
                <CardDescription>Get started in under a minute</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                    <div>
                      <p className="font-medium text-sm">Copy the component</p>
                      <p className="text-xs text-muted-foreground">
                        Copy <code className="font-mono bg-muted px-1 rounded">AuthentiSealVerify.tsx</code> into your React project's components folder
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                    <div>
                      <p className="font-medium text-sm">Import and use</p>
                      <p className="text-xs text-muted-foreground">
                        No dependencies needed — just React
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                    <div>
                      <p className="font-medium text-sm">Pass the serial number</p>
                      <p className="text-xs text-muted-foreground">
                        The widget handles the API call, loading states, and result display automatically
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted/50 text-sm overflow-x-auto font-mono">
                    {codeSnippets.install}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(codeSnippets.install)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={authentisealIcon} alt="AuthentiSeal" className="h-7 w-7 rounded-lg" />
            <span className="font-bold gradient-text">AuthentiSeal</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Blockchain-verified certificates of authenticity powered by Solana
          </p>
        </div>
      </footer>
    </div>
  );
}
