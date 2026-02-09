/**
 * AuthentiSeal Embeddable Verification Widget
 * 
 * Copy this file into any React project (e.g., CollectAI) to add
 * "Verify on AuthentiSeal" functionality. No dependencies beyond React.
 * 
 * Usage:
 *   <AuthentiSealVerify serialNumber="COA-MKYPZ1FB-3OG7" />
 *   <AuthentiSealVerify serialNumber={card.serial} variant="compact" />
 *   <AuthentiSealVerify serialNumber={serial} onResult={(r) => console.log(r)} />
 */

import React, { useState, useCallback } from "react";

const AUTHENTISEAL_API =
  "https://vfttlgqsexcdpxihtwzl.supabase.co/functions/v1/verify-public";
const AUTHENTISEAL_URL = "https://authenti-seek.lovable.app";

interface VerifyResult {
  verified: boolean;
  certificate: {
    id: string;
    serial_number: string;
    product_name: string;
    product_description: string | null;
    product_category: string | null;
    product_images: string[] | null;
    status: string;
    issued_at: string;
    on_chain: boolean;
    issuer: {
      display_name: string | null;
      company_name: string | null;
    } | null;
    verify_url: string;
    issuer_profile_url: string | null;
  } | null;
  error?: string;
}

interface AuthentiSealVerifyProps {
  /** The certificate serial number to verify */
  serialNumber: string;
  /** Widget style variant */
  variant?: "full" | "compact" | "badge";
  /** Callback when verification completes */
  onResult?: (result: VerifyResult) => void;
  /** Custom class name */
  className?: string;
}

export function AuthentiSealVerify({
  serialNumber,
  variant = "full",
  onResult,
  className = "",
}: AuthentiSealVerifyProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "verified" | "not_found" | "error">("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = useCallback(async () => {
    if (!serialNumber) return;
    setStatus("loading");

    try {
      const res = await fetch(
        `${AUTHENTISEAL_API}?serial=${encodeURIComponent(serialNumber)}`
      );
      const data: VerifyResult = await res.json();
      setResult(data);
      setStatus(data.verified ? "verified" : data.certificate ? "not_found" : "not_found");
      onResult?.(data);
    } catch {
      setStatus("error");
      const errorResult: VerifyResult = { verified: false, certificate: null, error: "Network error" };
      setResult(errorResult);
      onResult?.(errorResult);
    }
  }, [serialNumber, onResult]);

  const shieldIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );

  const checkIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );

  const xIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );

  const loaderIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );

  // Badge variant — minimal inline badge
  if (variant === "badge") {
    return (
      <button
        onClick={verify}
        disabled={status === "loading"}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 600,
          borderRadius: "9999px",
          border: "1px solid",
          borderColor:
            status === "verified" ? "#22c55e" : status === "not_found" ? "#ef4444" : "#e5e7eb",
          backgroundColor:
            status === "verified"
              ? "rgba(34,197,94,0.1)"
              : status === "not_found"
              ? "rgba(239,68,68,0.1)"
              : "transparent",
          color:
            status === "verified" ? "#16a34a" : status === "not_found" ? "#dc2626" : "#6b7280",
          cursor: status === "loading" ? "wait" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {status === "loading" ? loaderIcon : status === "verified" ? checkIcon : status === "not_found" ? xIcon : shieldIcon}
        {status === "idle" && "Verify"}
        {status === "loading" && "Checking..."}
        {status === "verified" && "Authentic"}
        {status === "not_found" && "Not Found"}
        {status === "error" && "Error"}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </button>
    );
  }

  // Compact variant — small button
  if (variant === "compact") {
    return (
      <button
        onClick={verify}
        disabled={status === "loading"}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          fontSize: "13px",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 600,
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          backgroundColor: status === "verified" ? "rgba(34,197,94,0.1)" : "#fff",
          color: status === "verified" ? "#16a34a" : "#1f2937",
          cursor: status === "loading" ? "wait" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {status === "loading" ? loaderIcon : status === "verified" ? checkIcon : shieldIcon}
        <span>
          {status === "idle" && "Verify on AuthentiSeal"}
          {status === "loading" && "Verifying..."}
          {status === "verified" && `Verified: ${result?.certificate?.product_name}`}
          {status === "not_found" && "Not Found on AuthentiSeal"}
          {status === "error" && "Verification Failed"}
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </button>
    );
  }

  // Full variant — card with details
  return (
    <div
      className={className}
      style={{
        fontFamily: "system-ui, sans-serif",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "#fff",
        maxWidth: "400px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #f3f4f6",
          background: "linear-gradient(135deg, #9945FF10, #14F19510)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {shieldIcon}
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f2937" }}>
            AuthentiSeal
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#9ca3af" }}>Certificate Verification</span>
      </div>

      {/* Body */}
      <div style={{ padding: "16px" }}>
        {status === "idle" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
              Serial: <code style={{ fontFamily: "monospace", fontWeight: 600, color: "#1f2937" }}>{serialNumber}</code>
            </p>
            <button
              onClick={verify}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(135deg, #9945FF, #14F195)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Verify on AuthentiSeal
            </button>
          </div>
        )}

        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#6b7280" }}>
              {loaderIcon}
              <span style={{ fontSize: "14px" }}>Verifying certificate...</span>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {status === "verified" && result?.certificate && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(34,197,94,0.15)",
                  color: "#16a34a",
                  marginBottom: "8px",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <p style={{ fontWeight: 700, fontSize: "16px", color: "#16a34a", margin: 0 }}>
                Authentic
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "13px",
                lineHeight: "1.6",
              }}
            >
              <div><span style={{ color: "#6b7280" }}>Product:</span> <strong>{result.certificate.product_name}</strong></div>
              <div><span style={{ color: "#6b7280" }}>Serial:</span> <code style={{ fontFamily: "monospace" }}>{result.certificate.serial_number}</code></div>
              {result.certificate.issuer && (
                <div>
                  <span style={{ color: "#6b7280" }}>Issuer:</span>{" "}
                  {result.certificate.issuer.company_name || result.certificate.issuer.display_name}
                </div>
              )}
              <div>
                <span style={{ color: "#6b7280" }}>On-chain:</span>{" "}
                {result.certificate.on_chain ? "✓ Solana" : "Off-chain"}
              </div>
            </div>

            <a
              href={result.certificate.verify_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: "12px",
                fontSize: "12px",
                color: "#9945FF",
                textDecoration: "none",
              }}
            >
              View full certificate →
            </a>
          </div>
        )}

        {status === "not_found" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(239,68,68,0.15)",
                color: "#dc2626",
                marginBottom: "8px",
              }}
            >
              {xIcon}
            </div>
            <p style={{ fontWeight: 600, color: "#dc2626", margin: "0 0 4px" }}>Not Found</p>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>
              This serial number is not registered on AuthentiSeal.
            </p>
            <button
              onClick={() => { setStatus("idle"); setResult(null); }}
              style={{
                marginTop: "12px",
                padding: "6px 16px",
                fontSize: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ fontSize: "13px", color: "#dc2626" }}>Connection error. Please try again.</p>
            <button
              onClick={() => { setStatus("idle"); setResult(null); }}
              style={{
                marginTop: "8px",
                padding: "6px 16px",
                fontSize: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          fontSize: "10px",
          color: "#9ca3af",
        }}
      >
        {shieldIcon}
        Powered by{" "}
        <a
          href={AUTHENTISEAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#9945FF", fontWeight: 600, textDecoration: "none" }}
        >
          AuthentiSeal
        </a>
      </div>
    </div>
  );
}

export default AuthentiSealVerify;
