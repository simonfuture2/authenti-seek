import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import authentisealIcon from "@/assets/authentiseal-icon.png";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <img src={authentisealIcon} alt="AuthentiSeal" className="h-7 w-7 rounded-lg" />
            <span className="font-bold gradient-text">AuthentiSeal</span>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: February 10, 2026</p>

        <h2>1. Introduction</h2>
        <p>
          AuthentiSeal ("Service"), operated by W3MCT ("Company", "we", "us", or "our"), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Account Information</h3>
        <ul>
          <li>Email address (required for registration)</li>
          <li>Display name and company name (optional)</li>
          <li>Account role selection (issuer or verifier)</li>
        </ul>

        <h3>2.2 Product and Certificate Data</h3>
        <ul>
          <li>Product names, descriptions, categories, and serial numbers</li>
          <li>Product images uploaded for certificates</li>
          <li>Physical attributes and unique identifiers entered during certificate creation</li>
        </ul>

        <h3>2.3 Blockchain Data</h3>
        <ul>
          <li>Public wallet addresses connected to the Service</li>
          <li>Solana transaction signatures for minting, payments, and deposits</li>
          <li>On-chain certificate hashes and NFT metadata</li>
        </ul>
        <p>
          <strong>Important:</strong> Data written to the Solana blockchain is publicly visible and immutable. We minimize on-chain data exposure by using cryptographic hashes rather than raw product information.
        </p>

        <h3>2.4 Verification Data</h3>
        <ul>
          <li>Verification photos submitted during product authentication</li>
          <li>AI analysis results and confidence scores</li>
          <li>Verification timestamps and methods</li>
        </ul>

        <h3>2.5 Technical Data</h3>
        <ul>
          <li>Browser type and version (hashed for audit logs)</li>
          <li>Device platform and language preferences</li>
          <li>Timezone information</li>
        </ul>
        <p>
          We do <strong>not</strong> collect IP addresses in audit logs. User agent data is stored as a one-way SHA-256 hash to prevent identification while enabling fraud detection.
        </p>

        <h3>2.6 Payment Information</h3>
        <ul>
          <li>Transaction signatures for SOL payments (publicly visible on-chain)</li>
          <li>Credit purchase history and balance information</li>
        </ul>
        <p>We do not store credit card numbers, bank account details, or private keys.</p>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li><strong>Service delivery:</strong> Creating and managing certificates, processing verifications, and minting NFTs.</li>
          <li><strong>Payment processing:</strong> Verifying on-chain transactions and managing credit balances.</li>
          <li><strong>Security and fraud prevention:</strong> Audit logging of blockchain operations, counterfeit reporting, and abuse detection.</li>
          <li><strong>Service improvement:</strong> Analytics on usage patterns (aggregated and anonymized).</li>
          <li><strong>Communication:</strong> Account-related notifications and service updates.</li>
        </ul>

        <h2>4. Data Sharing and Disclosure</h2>
        <h3>4.1 Public by Design</h3>
        <p>The following data is intentionally public as part of the Service's trust model:</p>
        <ul>
          <li>Certificate details (product name, serial number, status) — accessible via the public verification portal</li>
          <li>Issuer profile information (display name, company name, avatar) — visible on public issuer pages</li>
          <li>On-chain transaction data — publicly visible on the Solana blockchain</li>
          <li>Asset LP summary data (total backing amounts) — visible for transparency</li>
        </ul>

        <h3>4.2 We Do Not</h3>
        <ul>
          <li>Sell your personal information to third parties</li>
          <li>Share your email address publicly (accessible only to you)</li>
          <li>Provide wallet-to-identity mapping to external parties</li>
          <li>Use your data for advertising or profiling</li>
        </ul>

        <h3>4.3 Third-Party Services</h3>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Solana blockchain:</strong> For immutable certificate storage and NFT minting</li>
          <li><strong>Cloud infrastructure:</strong> For database storage, authentication, and edge functions</li>
          <li><strong>Price oracles (Jupiter, CoinGecko):</strong> For real-time SOL/USD pricing (no user data shared)</li>
        </ul>

        <h2>5. Data Security</h2>
        <p>We implement industry-standard security measures:</p>
        <ul>
          <li><strong>Encryption:</strong> All data in transit uses TLS encryption. Sensitive data at rest is encrypted.</li>
          <li><strong>Row Level Security (RLS):</strong> Database-level access controls ensure users can only access their own data.</li>
          <li><strong>Hashing:</strong> Certificate data uses SHA-256 hashing. Audit identifiers are salted and hashed.</li>
          <li><strong>Authentication:</strong> Email verification required. JWT-based session management with automatic token refresh.</li>
          <li><strong>Enumeration prevention:</strong> Metadata URIs use hashed paths to prevent discovery attacks.</li>
        </ul>

        <h2>6. Data Retention</h2>
        <ul>
          <li><strong>Account data:</strong> Retained while your account is active. Deleted upon account deletion request.</li>
          <li><strong>Certificate data:</strong> Retained indefinitely as part of the authenticity record. On-chain data cannot be deleted.</li>
          <li><strong>Audit logs:</strong> Retained for a minimum of 2 years for security and compliance.</li>
          <li><strong>Verification results:</strong> Retained indefinitely as part of the product's verification history.</li>
        </ul>

        <h2>7. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your account and associated data</li>
          <li>Export your data in a portable format</li>
          <li>Object to certain data processing activities</li>
        </ul>
        <p>
          <strong>Blockchain limitation:</strong> Data written to the Solana blockchain (transaction signatures, certificate hashes, NFT metadata) cannot be modified or deleted due to the immutable nature of blockchain technology.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us for removal.
        </p>

        <h2>9. International Data Transfers</h2>
        <p>
          Your data may be processed in countries other than your own. By using the Service, you consent to the transfer of your data to jurisdictions that may have different data protection laws. We ensure appropriate safeguards are in place for such transfers.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated through the Service. The "Last updated" date at the top of this page indicates when the policy was last revised.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          For privacy-related inquiries or to exercise your data rights, contact us at{" "}
          <a href="mailto:privacy@authentiseal.app" className="text-primary">privacy@authentiseal.app</a>.
        </p>
      </main>
    </div>
  );
}
