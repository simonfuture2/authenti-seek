import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import authentisealIcon from "@/assets/authentiseal-icon.png";

export default function TermsPage() {
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
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Last updated: February 10, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the AuthentiSeal platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. AuthentiSeal is operated by W3MCT ("Company", "we", "us", or "our").
        </p>

        <h2>2. Description of Service</h2>
        <p>
          AuthentiSeal provides a blockchain-based certificate of authenticity platform built on the Solana network. The Service allows issuers to create digital certificates for physical products, and verifiers to authenticate those products through QR codes, serial numbers, and on-chain verification.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and keep your account credentials secure. You are responsible for all activity that occurs under your account.
        </p>

        <h2>4. Credits and Payments</h2>
        <p>
          The Service operates on a credit-based model. Credits may be purchased using supported cryptocurrency (SOL) or other accepted payment methods. All credit purchases are final and non-refundable except where required by applicable law. Credit prices are denominated in USD and may be paid in SOL at the prevailing market rate at the time of purchase.
        </p>
        <ul>
          <li>Certificate creation: 1 credit</li>
          <li>AI-assisted verification: 0.5 credits</li>
          <li>Asset LP creation: 20 credits</li>
          <li>Additional LP deposits: 5 credits</li>
        </ul>

        <h2>5. Blockchain Transactions</h2>
        <p>
          Certain actions on the Service involve transactions on the Solana blockchain. You acknowledge that:
        </p>
        <ul>
          <li>Blockchain transactions are irreversible once confirmed.</li>
          <li>You are solely responsible for the security of your wallet and private keys.</li>
          <li>Network fees (gas) are determined by the Solana network and are your responsibility.</li>
          <li>The Company is not responsible for losses due to wallet compromise, incorrect addresses, or network failures.</li>
        </ul>

        <h2>6. NFT Minting</h2>
        <p>
          Certificates may optionally be minted as non-fungible tokens (NFTs) on Solana. Minted NFTs remain associated with the certificate data. The Company does not guarantee any secondary market value for minted NFTs. Transfer of NFTs does not constitute transfer of any intellectual property rights in the underlying product.
        </p>

        <h2>7. Asset Liquidity Pairs</h2>
        <p>
          Issuers may back certificates with SOL and stablecoin deposits to establish a floor value. These deposits are held in a project treasury wallet and are not investment products. The Company makes no guarantees about the market value of deposited assets. Floor value backing is informational and does not represent a guarantee of product value.
        </p>

        <h2>8. Intellectual Property</h2>
        <p>
          The Service, including its design, code, and branding, is owned by the Company. You retain ownership of any product data, images, and descriptions you upload. By uploading content, you grant us a non-exclusive, worldwide license to display and process that content solely for providing the Service.
        </p>

        <h2>9. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service to create fraudulent or misleading certificates.</li>
          <li>Attempt to manipulate, reverse-engineer, or exploit the Service.</li>
          <li>Upload illegal, infringing, or harmful content.</li>
          <li>Circumvent credit requirements or payment verification.</li>
          <li>Use automated tools to scrape data or abuse the Service.</li>
        </ul>

        <h2>10. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. THE COMPANY DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. BLOCKCHAIN DATA IS IMMUTABLE BUT THE COMPANY DOES NOT GUARANTEE THE ACCURACY OF USER-SUBMITTED INFORMATION.
        </p>

        <h2>11. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR DIGITAL ASSETS, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
        </p>

        <h2>12. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless the Company, its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
        </p>

        <h2>13. Termination</h2>
        <p>
          We may suspend or terminate your account at any time for violation of these Terms. Upon termination, your right to use the Service ceases immediately. On-chain data (minted NFTs, memo records) will persist on the Solana blockchain regardless of account status.
        </p>

        <h2>14. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction in which the Company is incorporated, without regard to conflict of law principles.
        </p>

        <h2>15. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Material changes will be communicated through the Service. Continued use of the Service after changes constitutes acceptance of the revised Terms.
        </p>

        <h2>16. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:legal@authentiseal.app" className="text-primary">legal@authentiseal.app</a>.
        </p>
      </main>
    </div>
  );
}
