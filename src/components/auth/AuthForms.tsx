import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, User, Building2, Shield, CheckCircle2 } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  companyName: z.string().optional(),
  role: z.enum(["issuer", "verifier"]),
});

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type SignUpForm = z.infer<typeof signUpSchema>;
type SignInForm = z.infer<typeof signInSchema>;

export function AuthForms() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [selectedRole, setSelectedRole] = useState<"issuer" | "verifier" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn } = useAuth();

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      companyName: "",
      role: "issuer",
    },
  });

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSignUp = async (data: SignUpForm) => {
    setIsLoading(true);
    const { error } = await signUp(
      data.email,
      data.password,
      data.role,
      data.displayName,
      data.companyName
    );
    setIsLoading(false);

    if (error) {
      signUpForm.setError("root", { message: error.message });
    }
  };

  const onSignIn = async (data: SignInForm) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      signInForm.setError("root", { message: error.message });
    }
  };

  const handleRoleSelect = (role: "issuer" | "verifier") => {
    setSelectedRole(role);
    signUpForm.setValue("role", role);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mode Toggle */}
      <div className="flex mb-8 p-1 glass-card rounded-lg">
        <button
          onClick={() => setMode("signin")}
          className={cn(
            "flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all",
            mode === "signin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode("signup")}
          className={cn(
            "flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all",
            mode === "signup"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Create Account
        </button>
      </div>

      {mode === "signin" ? (
        <motion.div
          key="signin"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <Form {...signInForm}>
            <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-6">
              <FormField
                control={signInForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10 glass-card"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signInForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 glass-card"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {signInForm.formState.errors.root && (
                <p className="text-sm text-destructive">
                  {signInForm.formState.errors.root.message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-solana-gradient hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </motion.div>
      ) : (
        <motion.div
          key="signup"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {!selectedRole ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center mb-6">
                Choose Your Role
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-8">
                Select one role. This cannot be changed later.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect("issuer")}
                className="w-full p-6 glass-card rounded-xl text-left hover:border-primary transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      Issuer Account
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create and manage Certificates of Authenticity. Issue COAs for your products and track their history.
                    </p>
                    <ul className="mt-3 space-y-1">
                      <li className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        Create COA certificates
                      </li>
                      <li className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        Transfer ownership
                      </li>
                      <li className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        View analytics
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect("verifier")}
                className="w-full p-6 glass-card rounded-xl text-left hover:border-secondary transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-secondary/10 text-secondary">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg group-hover:text-secondary transition-colors">
                      Verifier Account
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verify product authenticity. Scan QR codes, search certificates, and report counterfeits.
                    </p>
                    <ul className="mt-3 space-y-1">
                      <li className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        Scan QR codes
                      </li>
                      <li className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        Search certificates
                      </li>
                      <li className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        Report fakes
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.button>
            </div>
          ) : (
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-6">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-6">
                  {selectedRole === "issuer" ? (
                    <Shield className="h-5 w-5 text-primary" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-secondary" />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {selectedRole} Account
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </button>
                </div>

                <FormField
                  control={signUpForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="John Doe"
                            className="pl-10 glass-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRole === "issuer" && (
                  <FormField
                    control={signUpForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="Your Company"
                              className="pl-10 glass-card"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10 glass-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            className="pl-10 glass-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {signUpForm.formState.errors.root && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.root.message}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-solana-gradient hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </motion.div>
      )}
    </div>
  );
}
