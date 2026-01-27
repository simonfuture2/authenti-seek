import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { AuthForms } from "@/components/auth/AuthForms";

export function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero Section */}
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-background via-muted to-background p-8 lg:p-16 flex flex-col justify-center">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-solana-gradient">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">AuthentiSeal</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Certificate of Authenticity
            <span className="block gradient-text">on Solana</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            Issue, verify, and track authentic products on the blockchain.
            Tamper-proof certificates powered by Solana.
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4 rounded-xl">
              <div className="text-2xl font-bold gradient-text">Fast</div>
              <p className="text-xs text-muted-foreground">400ms finality</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <div className="text-2xl font-bold gradient-text">Secure</div>
              <p className="text-xs text-muted-foreground">Immutable records</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <div className="text-2xl font-bold gradient-text">Low Cost</div>
              <p className="text-xs text-muted-foreground">$0.00025/tx</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Auth Forms Section */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <AuthForms />
        </motion.div>
      </div>
    </div>
  );
}

export default AuthPage;
