import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  QrCode,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Coins,
  FileCheck,
  Users,
  Globe,
} from "lucide-react";
import authentisealIcon from "@/assets/authentiseal-icon.png";
import authentisealBanner from "@/assets/authentiseal-banner.png";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MobileNav } from "@/components/layout/MobileNav";
import { SolPriceTicker } from "@/components/wallet/SolPriceTicker";
import { useSolPrice } from "@/hooks/useSolPrice";
import { EcosystemBadge } from "@/components/ecosystem/EcosystemBadge";

const features = [
  {
    icon: FileCheck,
    title: "Issue Certificates",
    description:
      "Create tamper-proof digital certificates of authenticity for your products in seconds.",
  },
  {
    icon: QrCode,
    title: "QR Code Verification",
    description:
      "Generate unique QR codes that link to blockchain-verified certificates.",
  },
  {
    icon: Lock,
    title: "Blockchain Security",
    description:
      "Every certificate is stored immutably on Solana for permanent verification.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Solana's 400ms finality means instant certificate creation and verification.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Create Account",
    description:
      "Sign up as an issuer to create certificates or as a verifier to authenticate products.",
  },
  {
    step: "02",
    title: "Purchase Credits",
    description:
      "Buy credits using credit card or SOL. Credits are used to create and verify certificates.",
  },
  {
    step: "03",
    title: "Issue or Verify",
    description:
      "Issuers create certificates with product details. Verifiers scan QR codes to authenticate.",
  },
  {
    step: "04",
    title: "On-Chain Proof",
    description:
      "Optionally mint certificates as NFTs on Solana for permanent blockchain verification.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    credits: 50,
    priceUsd: 25,
    features: [
      "50 credits",
      "Create up to 50 certificates",
      "Basic verification",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Pro",
    credits: 200,
    priceUsd: 75,
    features: [
      "200 credits",
      "Create up to 200 certificates",
      "AI-powered verification",
      "Priority support",
      "Analytics dashboard",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    credits: 1000,
    priceUsd: 300,
    features: [
      "1000 credits",
      "Unlimited certificates",
      "Advanced AI verification",
      "Dedicated support",
      "Custom branding",
      "API access",
    ],
    popular: false,
  },
];

const faqs = [
  {
    question: "What is a Certificate of Authenticity (COA)?",
    answer:
      "A Certificate of Authenticity is a digital document that verifies the genuineness of a product. Our COAs are stored on the Solana blockchain, making them tamper-proof and permanently verifiable.",
  },
  {
    question: "How do credits work?",
    answer:
      "Credits are used to perform actions on the platform. Creating a certificate costs 1 credit, and deep AI verification costs 1 credit. You can purchase credits with credit card or SOL cryptocurrency.",
  },
  {
    question: "Can I mint certificates as NFTs?",
    answer:
      "Yes! You can optionally mint your certificates as NFTs on Solana. This creates an on-chain record that can be transferred and verified by anyone with a Solana wallet.",
  },
  {
    question: "What products can I certify?",
    answer:
      "AuthentiSeal can certify any physical product including luxury goods, art, collectibles, electronics, watches, sneakers, and more. You provide the product details, and we create the verifiable certificate.",
  },
  {
    question: "How do verifiers authenticate products?",
    answer:
      "Verifiers can scan the QR code on a product or search by serial number. Our AI-powered verification compares photos against the original certificate to detect counterfeits.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. All data is encrypted and stored securely. Certificate data on the blockchain is immutable and cannot be altered. We never share your information with third parties.",
  },
];

export function LandingPage() {
  const { usdToSolFormatted } = useSolPrice();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={authentisealIcon} alt="AuthentiSeal" className="h-9 w-9 rounded-lg" />
            <div className="flex flex-col">
              <span className="text-xl font-bold gradient-text leading-tight">AuthentiSeal</span>
              <SolPriceTicker compact />
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Verify Product
            </Link>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link to="/auth" className="hidden md:inline-flex">
              <Button className="bg-solana-gradient hover:opacity-90">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <MobileNav
              links={[
                { label: "Verify Product", href: "/verify", isRoute: true },
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
                { label: "FAQ", href: "#faq" },
              ]}
            />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">Powered by Solana</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Blockchain-Verified
              <span className="block gradient-text">Certificates of Authenticity</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Issue, verify, and track authentic products on the blockchain.
              Tamper-proof certificates powered by Solana's lightning-fast network.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-solana-gradient hover:opacity-90 w-full sm:w-auto">
                  Start Issuing Certificates
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Learn How It Works
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Banner */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-12 max-w-4xl mx-auto"
          >
            <div className="rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10">
              <img
                src={authentisealBanner}
                alt="AuthentiSeal - Blockchain Certificates of Authenticity"
                className="w-full h-auto"
              />
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-3 gap-4 md:gap-8 mt-16 max-w-2xl mx-auto"
          >
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <div className="text-2xl md:text-3xl font-bold gradient-text">400ms</div>
              <p className="text-xs md:text-sm text-muted-foreground">Finality</p>
            </div>
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <div className="text-2xl md:text-3xl font-bold gradient-text">$0.0002</div>
              <p className="text-xs md:text-sm text-muted-foreground">Per Transaction</p>
            </div>
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <div className="text-2xl md:text-3xl font-bold gradient-text">100%</div>
              <p className="text-xs md:text-sm text-muted-foreground">Immutable</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to
              <span className="gradient-text"> Authenticate Products</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete platform for issuing and verifying certificates of authenticity
              on the blockchain.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 rounded-xl hover:border-primary/50 transition-colors"
              >
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple four-step process.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-bold gradient-text mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, <span className="gradient-text">Credit-Based</span> Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pay only for what you use. 1 credit = 1 certificate creation or 1 AI verification.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card p-6 md:p-8 rounded-xl relative ${
                  plan.popular ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-solana-gradient rounded-full text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">${plan.priceUsd}</span>
                  <span className="text-muted-foreground"> / {plan.credits} credits</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  or {usdToSolFormatted(plan.priceUsd) ?? "loading..."} 
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button
                    className={`w-full ${
                      plan.popular ? "bg-solana-gradient hover:opacity-90" : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="h-4 w-4" />
              <span>Pay with credit card or Solana (SOL)</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about AuthentiSeal.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="glass-card rounded-xl px-6 border-none"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="font-medium">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pl-8 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 rounded-2xl text-center max-w-4xl mx-auto border-primary/20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to <span className="gradient-text">Authenticate</span> Your Products?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of brands using AuthentiSeal to protect their products
              and customers from counterfeits.
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-solana-gradient hover:opacity-90">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              3 free credits included • No credit card required
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-3">
              <img src={authentisealIcon} alt="AuthentiSeal" className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-bold gradient-text">AuthentiSeal</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors py-1">
                Features
              </a>
              <a href="#pricing" className="hover:text-foreground transition-colors py-1">
                Pricing
              </a>
              <a href="#faq" className="hover:text-foreground transition-colors py-1">
                FAQ
              </a>
              <Link to="/auth" className="hover:text-foreground transition-colors py-1">
                Sign In
              </Link>
            </div>

            {/* Ecosystem Links */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Ecosystem</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <EcosystemBadge app="collectai" variant="inline" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>© 2025 AuthentiSeal. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
