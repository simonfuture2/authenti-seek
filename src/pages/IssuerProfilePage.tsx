import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  User,
  Award,
  CheckCircle2,
  FileCheck,
  ExternalLink,
  ArrowRight,
  Calendar,
  Package,
  Link as LinkIcon,
  Star,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import authentisealIcon from "@/assets/authentiseal-icon.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface IssuerProfile {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface CertificateStats {
  total: number;
  active: number;
  onChain: number;
  transferred: number;
}

interface TrustMetrics {
  score: number;
  level: "New" | "Verified" | "Trusted" | "Premium";
  factors: {
    name: string;
    score: number;
    maxScore: number;
    description: string;
  }[];
}

export function IssuerProfilePage() {
  const { issuerId } = useParams<{ issuerId: string }>();
  const [profile, setProfile] = useState<IssuerProfile | null>(null);
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [trustMetrics, setTrustMetrics] = useState<TrustMetrics | null>(null);
  const [recentCertificates, setRecentCertificates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (issuerId) {
      fetchIssuerData();
    }
  }, [issuerId]);

  const fetchIssuerData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name, company_name, avatar_url, created_at")
        .eq("user_id", issuerId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setError("Issuer not found");
        setIsLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch certificate stats using the public view
      const { data: certificates, error: certError } = await supabase
        .from("certificates_public" as any)
        .select("id, status, solana_signature, product_name, product_category, issued_at, product_images")
        .eq("issuer_id", issuerId);

      if (certError) throw certError;

      const certs = certificates || [];
      const certStats: CertificateStats = {
        total: certs.length,
        active: certs.filter((c: any) => c.status === "active").length,
        onChain: certs.filter((c: any) => c.solana_signature).length,
        transferred: certs.filter((c: any) => c.status === "transferred").length,
      };
      setStats(certStats);

      // Set recent certificates (last 6)
      const recent = certs
        .sort((a: any, b: any) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
        .slice(0, 6);
      setRecentCertificates(recent);

      // Calculate trust metrics
      const metrics = calculateTrustMetrics(certStats, profileData);
      setTrustMetrics(metrics);
    } catch (err) {
      console.error("Error fetching issuer data:", err);
      setError("Failed to load issuer profile");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTrustMetrics = (
    stats: CertificateStats,
    profile: IssuerProfile
  ): TrustMetrics => {
    const factors = [];

    // Factor 1: Certificate volume (max 25 points)
    const volumeScore = Math.min(stats.total * 2, 25);
    factors.push({
      name: "Certificate Volume",
      score: volumeScore,
      maxScore: 25,
      description: `${stats.total} certificates issued`,
    });

    // Factor 2: On-chain percentage (max 30 points)
    const onChainPercent = stats.total > 0 ? (stats.onChain / stats.total) * 100 : 0;
    const onChainScore = Math.round((onChainPercent / 100) * 30);
    factors.push({
      name: "Blockchain Verified",
      score: onChainScore,
      maxScore: 30,
      description: `${Math.round(onChainPercent)}% minted on-chain`,
    });

    // Factor 3: Account age (max 20 points)
    const accountAge = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const ageScore = Math.min(Math.floor(accountAge / 30) * 5, 20);
    factors.push({
      name: "Account Age",
      score: ageScore,
      maxScore: 20,
      description: `${accountAge} days active`,
    });

    // Factor 4: Profile completeness (max 15 points)
    let profileScore = 0;
    if (profile.company_name) profileScore += 5;
    if (profile.display_name) profileScore += 5;
    if (profile.avatar_url) profileScore += 5;
    factors.push({
      name: "Profile Completeness",
      score: profileScore,
      maxScore: 15,
      description: profileScore === 15 ? "Complete profile" : "Partial profile",
    });

    // Factor 5: Activity consistency (max 10 points)
    const activityScore = stats.active > 0 ? Math.min(stats.active, 10) : 0;
    factors.push({
      name: "Active Certificates",
      score: activityScore,
      maxScore: 10,
      description: `${stats.active} active certificates`,
    });

    const totalScore = factors.reduce((sum, f) => sum + f.score, 0);

    let level: TrustMetrics["level"] = "New";
    if (totalScore >= 80) level = "Premium";
    else if (totalScore >= 50) level = "Trusted";
    else if (totalScore >= 25) level = "Verified";

    return { score: totalScore, level, factors };
  };

  const getLevelColor = (level: TrustMetrics["level"]) => {
    switch (level) {
      case "Premium":
        return "text-amber-500";
      case "Trusted":
        return "text-green-500";
      case "Verified":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getLevelBadgeVariant = (level: TrustMetrics["level"]) => {
    switch (level) {
      case "Premium":
        return "default";
      case "Trusted":
        return "default";
      case "Verified":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading issuer profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={authentisealIcon} alt="AuthentiSeal" className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-bold gradient-text">AuthentiSeal</span>
            </Link>
          </div>
        </nav>
        <div className="pt-24 px-4">
          <div className="container mx-auto max-w-lg text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Issuer Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error || "This issuer profile does not exist or has been removed."}
            </p>
            <Link to="/">
              <Button>Return Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
              <img src={authentisealIcon} alt="AuthentiSeal" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-bold gradient-text">AuthentiSeal</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/verify">
              <Button variant="outline" size="sm">
                Verify Product
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-solana-gradient">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="glass-card overflow-hidden">
              <div className="h-24 bg-solana-gradient opacity-20" />
              <CardContent className="relative pt-0">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-12">
                  {/* Avatar */}
                  <div className="h-24 w-24 rounded-xl bg-background border-4 border-background flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.company_name || profile.display_name || "Issuer"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        {profile.company_name ? (
                          <Building2 className="h-10 w-10 text-muted-foreground" />
                        ) : (
                          <User className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-2xl font-bold">
                        {profile.company_name || profile.display_name || "Verified Issuer"}
                      </h1>
                      {trustMetrics && trustMetrics.level !== "New" && (
                        <Badge variant={getLevelBadgeVariant(trustMetrics.level)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {trustMetrics.level}
                        </Badge>
                      )}
                    </div>
                    {profile.company_name && profile.display_name && (
                      <p className="text-muted-foreground">{profile.display_name}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck className="h-4 w-4" />
                        {stats?.total || 0} certificates
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Stats Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Trust Score Card */}
              {trustMetrics && (
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Trust Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className={`text-5xl font-bold ${getLevelColor(trustMetrics.level)}`}>
                        {trustMetrics.score}
                      </div>
                      <p className="text-sm text-muted-foreground">out of 100</p>
                    </div>
                    <Progress value={trustMetrics.score} className="h-2 mb-4" />
                    <div className="space-y-3">
                      {trustMetrics.factors.map((factor, i) => (
                        <div key={i} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">{factor.name}</span>
                            <span className="font-medium">
                              {factor.score}/{factor.maxScore}
                            </span>
                          </div>
                          <Progress
                            value={(factor.score / factor.maxScore) * 100}
                            className="h-1"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Certificates</span>
                    <span className="font-bold text-lg">{stats?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active</span>
                    <Badge variant="outline">{stats?.active || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">On-Chain</span>
                    <Badge variant="secondary" className="gap-1">
                      <LinkIcon className="h-3 w-3" />
                      {stats?.onChain || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Transferred</span>
                    <Badge variant="outline">{stats?.transferred || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Certificates Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2"
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      Recent Certificates
                    </span>
                    {recentCertificates.length > 0 && (
                      <Badge variant="outline">{stats?.total} total</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentCertificates.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {recentCertificates.map((cert: any) => (
                        <Link
                          key={cert.id}
                          to={`/verify?serial=${cert.serial_number}`}
                          className="group"
                        >
                          <div className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
                            {cert.product_images && cert.product_images.length > 0 ? (
                              <div className="h-24 rounded-md overflow-hidden mb-3 bg-muted">
                                <img
                                  src={cert.product_images[0]}
                                  alt={cert.product_name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </div>
                            ) : (
                              <div className="h-24 rounded-md bg-muted flex items-center justify-center mb-3">
                                <Package className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                              {cert.product_name}
                            </h4>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {cert.product_category || "Uncategorized"}
                              </span>
                              <div className="flex items-center gap-1">
                                {cert.solana_signature && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    <LinkIcon className="h-2.5 w-2.5" />
                                  </Badge>
                                )}
                                <Badge
                                  variant={cert.status === "active" ? "default" : "outline"}
                                  className="text-xs px-1.5 py-0"
                                >
                                  {cert.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No certificates issued yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <p className="text-muted-foreground mb-4">
              Want to verify a product from this issuer?
            </p>
            <Link to="/verify">
              <Button className="bg-solana-gradient gap-2">
                Verify a Product
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
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

export default IssuerProfilePage;
