import React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Package,
  CheckCircle2,
  Send,
  Eye,
  Trophy,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { IssuerDashboardLayout } from "@/components/layout/IssuerDashboardLayout";
import { useIssuerAnalytics } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const COLORS = ["hsl(280, 100%, 65%)", "hsl(174, 100%, 42%)", "hsl(38, 92%, 50%)", "hsl(142, 76%, 45%)"];

export function AnalyticsPage() {
  const { data: analytics, isLoading } = useIssuerAnalytics();

  if (isLoading) {
    return (
      <IssuerDashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </IssuerDashboardLayout>
    );
  }

  const stats = [
    {
      title: "Total Certificates",
      value: analytics?.totalCertificates || 0,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Certificates",
      value: analytics?.activeCertificates || 0,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Transferred",
      value: analytics?.transferredCertificates || 0,
      icon: Send,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total Verifications",
      value: analytics?.totalVerifications || 0,
      icon: Eye,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <IssuerDashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Analytics</h1>
            <p className="text-muted-foreground">
              Track your certificate performance and verification stats.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card hover:glow-effect transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Verifications Over Time */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Verifications (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {analytics?.verificationsOverTime &&
                analytics.verificationsOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.verificationsOverTime}>
                      <defs>
                        <linearGradient id="colorVerifications" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(280, 100%, 65%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(280, 100%, 65%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(240, 5%, 55%)"
                        fontSize={12}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(240, 10%, 8%)",
                          border: "1px solid hsl(240, 10%, 15%)",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(280, 100%, 65%)"
                        fillOpacity={1}
                        fill="url(#colorVerifications)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No verification data yet</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Certificates by Category */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-secondary" />
                Certificates by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {analytics?.certificatesByCategory &&
                analytics.certificatesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.certificatesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="category"
                        label={({ category, count }) => `${category}: ${count}`}
                        labelLine={false}
                      >
                        {analytics.certificatesByCategory.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(240, 10%, 8%)",
                          border: "1px solid hsl(240, 10%, 15%)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No certificates created yet</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Summary */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Verifications (7 days)
                </p>
                <p className="text-2xl font-bold gradient-text">
                  {analytics?.recentVerifications || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Active Rate</p>
                <p className="text-2xl font-bold text-success">
                  {analytics?.totalCertificates
                    ? Math.round(
                        ((analytics.activeCertificates || 0) /
                          analytics.totalCertificates) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Avg Verifications/Cert
                </p>
                <p className="text-2xl font-bold text-secondary">
                  {analytics?.totalCertificates
                    ? (
                        (analytics.totalVerifications || 0) /
                        analytics.totalCertificates
                      ).toFixed(1)
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Most Verified Items */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Most Verified Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.mostVerifiedItems && analytics.mostVerifiedItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Verifications</TableHead>
                    <TableHead>Last Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.mostVerifiedItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 
                            ? "bg-warning/20 text-warning" 
                            : index === 1 
                            ? "bg-muted text-muted-foreground" 
                            : index === 2 
                            ? "bg-orange-500/20 text-orange-400" 
                            : "bg-muted/50 text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {item.serialNumber}
                        </code>
                      </TableCell>
                      <TableCell>
                        {item.category ? (
                          <Badge variant="secondary">{item.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{item.verificationCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.lastVerified ? (
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(item.lastVerified), { addSuffix: true })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Trophy className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No verification data yet</p>
                  <p className="text-sm">Verified items will appear here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </IssuerDashboardLayout>
  );
}

export default AnalyticsPage;
