import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Download, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CertificateTheme,
  SealStyle,
  getTheme,
  getSeal,
} from "./CertificateThemes";

interface CertificatePreviewProps {
  theme: CertificateTheme;
  sealStyle: SealStyle;
  productImage?: string;
  aiSealImage?: string | null;
  productName: string;
  serialNumber: string;
  issuerName?: string;
  category?: string;
  onImageGenerated?: (dataUrl: string) => void;
  className?: string;
}

export function CertificatePreview({
  theme,
  sealStyle,
  productImage,
  aiSealImage,
  productName,
  serialNumber,
  issuerName,
  category,
  onImageGenerated,
  className,
}: CertificatePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generateCertificate = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 1024;
    canvas.width = size;
    canvas.height = size;

    const themeConfig = getTheme(theme);
    const sealConfig = getSeal(sealStyle);

    // Clear canvas
    ctx.fillStyle = themeConfig.colors.background;
    ctx.fillRect(0, 0, size, size);

    // Draw background pattern based on theme
    drawBackgroundPattern(ctx, size, themeConfig);

    // Draw border based on theme
    drawBorder(ctx, size, themeConfig);

    // Draw header
    drawHeader(ctx, size, themeConfig);

    // Draw product image, AI seal, or preset seal
    if (productImage) {
      await drawProductImage(ctx, size, productImage, themeConfig);
    } else if (aiSealImage) {
      await drawAISealImage(ctx, size, aiSealImage, themeConfig);
    } else {
      drawSeal(ctx, size, sealConfig, themeConfig);
    }

    // Draw certificate details
    drawDetails(ctx, size, themeConfig, {
      productName,
      serialNumber,
      issuerName,
      category,
    });

    // Draw footer
    drawFooter(ctx, size, themeConfig);

    // Generate data URL
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    setPreviewUrl(dataUrl);
    onImageGenerated?.(dataUrl);
    setIsGenerating(false);
  }, [theme, sealStyle, productImage, aiSealImage, productName, serialNumber, issuerName, category, onImageGenerated]);

  useEffect(() => {
    if (productName || serialNumber) {
      generateCertificate();
    }
  }, [generateCertificate, productName, serialNumber]);

  const downloadCertificate = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = `COA-${serialNumber || "certificate"}.png`;
    link.href = previewUrl;
    link.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Certificate Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateCertificate}
            disabled={isGenerating}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isGenerating && "animate-spin")} />
            Refresh
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadCertificate}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>

      <div className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
        <canvas ref={canvasRef} className="hidden" />
        
        {isGenerating ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : previewUrl ? (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={previewUrl}
            alt="Certificate Preview"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Enter product details to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper drawing functions
function drawBackgroundPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: ReturnType<typeof getTheme>
) {
  ctx.save();
  ctx.globalAlpha = 0.05;

  if (theme.borderStyle === "ornate") {
    // Luxury: subtle diagonal lines
    ctx.strokeStyle = theme.colors.primary;
    ctx.lineWidth = 1;
    for (let i = -size; i < size * 2; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
  } else if (theme.borderStyle === "geometric") {
    // Modern: grid pattern
    ctx.strokeStyle = theme.colors.primary;
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else if (theme.borderStyle === "circuit") {
    // Tech: circuit board pattern
    ctx.strokeStyle = theme.colors.primary;
    ctx.lineWidth = 2;
    const step = 80;
    for (let x = 0; x < size; x += step) {
      for (let y = 0; y < size; y += step) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + step / 2, y);
        ctx.lineTo(x + step / 2, y + step / 2);
        ctx.stroke();
        // Node dots
        ctx.beginPath();
        ctx.arc(x + step / 2, y + step / 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = theme.colors.primary;
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function drawBorder(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: ReturnType<typeof getTheme>
) {
  const padding = 40;
  const innerPadding = 60;

  ctx.save();

  if (theme.borderStyle === "ornate") {
    // Double ornate border
    ctx.strokeStyle = theme.colors.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);
    ctx.lineWidth = 2;
    ctx.strokeRect(innerPadding, innerPadding, size - innerPadding * 2, size - innerPadding * 2);

    // Corner ornaments
    const cornerSize = 30;
    ctx.fillStyle = theme.colors.primary;
    [
      [padding, padding],
      [size - padding - cornerSize, padding],
      [padding, size - padding - cornerSize],
      [size - padding - cornerSize, size - padding - cornerSize],
    ].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x + cornerSize / 2, y);
      ctx.lineTo(x + cornerSize, y + cornerSize);
      ctx.closePath();
      ctx.fill();
    });
  } else if (theme.borderStyle === "geometric") {
    // Clean geometric border
    ctx.strokeStyle = theme.colors.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);

    // Corner squares
    const cornerSize = 15;
    ctx.fillStyle = theme.colors.primary;
    [
      [padding - cornerSize / 2, padding - cornerSize / 2],
      [size - padding - cornerSize / 2, padding - cornerSize / 2],
      [padding - cornerSize / 2, size - padding - cornerSize / 2],
      [size - padding - cornerSize / 2, size - padding - cornerSize / 2],
    ].forEach(([x, y]) => {
      ctx.fillRect(x, y, cornerSize, cornerSize);
    });
  } else if (theme.borderStyle === "circuit") {
    // Circuit-style border with glow
    ctx.shadowColor = theme.colors.primary;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = theme.colors.primary;
    ctx.lineWidth = 3;
    ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);
    ctx.shadowBlur = 0;

    // Tech corner elements
    ctx.fillStyle = theme.colors.secondary;
    ctx.strokeStyle = theme.colors.accent;
    ctx.lineWidth = 2;
    const techSize = 40;
    [
      [padding, padding],
      [size - padding - techSize, padding],
      [padding, size - padding - techSize],
      [size - padding - techSize, size - padding - techSize],
    ].forEach(([x, y]) => {
      ctx.fillRect(x, y, techSize, techSize);
      ctx.strokeRect(x + 5, y + 5, techSize - 10, techSize - 10);
    });
  }

  ctx.restore();
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: ReturnType<typeof getTheme>
) {
  ctx.save();
  ctx.textAlign = "center";

  // Title
  ctx.font = `bold 48px ${theme.fonts.heading}`;
  ctx.fillStyle = theme.colors.primary;
  ctx.fillText("CERTIFICATE", size / 2, 130);

  ctx.font = `28px ${theme.fonts.heading}`;
  ctx.fillStyle = theme.colors.text;
  ctx.fillText("OF AUTHENTICITY", size / 2, 170);

  // Decorative line
  ctx.strokeStyle = theme.colors.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size / 2 - 150, 195);
  ctx.lineTo(size / 2 + 150, 195);
  ctx.stroke();

  ctx.restore();
}

async function drawProductImage(
  ctx: CanvasRenderingContext2D,
  size: number,
  imageUrl: string,
  theme: ReturnType<typeof getTheme>
) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const imgSize = 320;
      const x = (size - imgSize) / 2;
      const y = 230;

      // Draw frame
      ctx.save();
      ctx.strokeStyle = theme.colors.border;
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 10, y - 10, imgSize + 20, imgSize + 20);

      // Draw image with rounded corners
      ctx.beginPath();
      ctx.roundRect(x, y, imgSize, imgSize, 10);
      ctx.clip();
      ctx.drawImage(img, x, y, imgSize, imgSize);
      ctx.restore();

      resolve();
    };
    img.onerror = () => resolve();
    img.src = imageUrl;
  });
}

async function drawAISealImage(
  ctx: CanvasRenderingContext2D,
  size: number,
  imageUrl: string,
  theme: ReturnType<typeof getTheme>
) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const sealSize = 280;
      const x = (size - sealSize) / 2;
      const y = 250;

      // Draw glow effect
      ctx.save();
      ctx.shadowColor = theme.colors.primary;
      ctx.shadowBlur = 40;
      
      // Draw circular clip for the seal
      ctx.beginPath();
      ctx.arc(x + sealSize / 2, y + sealSize / 2, sealSize / 2, 0, Math.PI * 2);
      ctx.clip();
      
      // Draw the AI-generated seal image
      ctx.drawImage(img, x, y, sealSize, sealSize);
      ctx.restore();

      // Draw decorative ring around the seal
      ctx.save();
      ctx.strokeStyle = theme.colors.primary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + sealSize / 2, y + sealSize / 2, sealSize / 2 + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      resolve();
    };
    img.onerror = () => resolve();
    img.src = imageUrl;
  });
}

function drawSeal(
  ctx: CanvasRenderingContext2D,
  size: number,
  seal: ReturnType<typeof getSeal>,
  theme: ReturnType<typeof getTheme>
) {
  const centerX = size / 2;
  const centerY = 390;
  const radius = 120;

  ctx.save();

  // Outer glow
  ctx.shadowColor = seal.colors.primary;
  ctx.shadowBlur = 30;

  // Gradient for seal
  const gradient = ctx.createRadialGradient(
    centerX - 30,
    centerY - 30,
    0,
    centerX,
    centerY,
    radius
  );
  gradient.addColorStop(0, seal.colors.highlight);
  gradient.addColorStop(0.3, seal.colors.primary);
  gradient.addColorStop(0.7, seal.colors.secondary);
  gradient.addColorStop(1, seal.colors.shadow);

  // Main seal circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Inner ring
  ctx.strokeStyle = seal.colors.highlight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 15, 0, Math.PI * 2);
  ctx.stroke();

  // Seal text
  ctx.textAlign = "center";
  ctx.font = `bold 24px ${theme.fonts.heading}`;
  ctx.fillStyle = seal.id === "platinum" ? "#1a1a2e" : "#ffffff";
  ctx.fillText("AUTHENTIC", centerX, centerY - 20);

  ctx.font = `16px ${theme.fonts.body}`;
  ctx.fillText("VERIFIED", centerX, centerY + 10);

  // Seal icon (shield)
  ctx.font = "40px Arial";
  ctx.fillText("🛡️", centerX, centerY + 55);

  ctx.restore();
}

function drawDetails(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: ReturnType<typeof getTheme>,
  details: {
    productName: string;
    serialNumber: string;
    issuerName?: string;
    category?: string;
  }
) {
  ctx.save();
  ctx.textAlign = "center";

  const startY = 590;

  // Product name
  ctx.font = `bold 32px ${theme.fonts.heading}`;
  ctx.fillStyle = theme.colors.text;
  ctx.fillText(details.productName || "Product Name", size / 2, startY);

  // Serial number
  ctx.font = `18px ${theme.fonts.body}`;
  ctx.fillStyle = theme.colors.textMuted;
  ctx.fillText(`Serial: ${details.serialNumber || "---"}`, size / 2, startY + 40);

  // Category
  if (details.category) {
    ctx.fillText(`Category: ${details.category}`, size / 2, startY + 70);
  }

  // Issuer
  if (details.issuerName) {
    ctx.font = `italic 16px ${theme.fonts.body}`;
    ctx.fillText(`Issued by: ${details.issuerName}`, size / 2, startY + 100);
  }

  ctx.restore();
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: ReturnType<typeof getTheme>
) {
  ctx.save();
  ctx.textAlign = "center";

  // Date
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.font = `14px ${theme.fonts.body}`;
  ctx.fillStyle = theme.colors.textMuted;
  ctx.fillText(date, size / 2, size - 100);

  // Blockchain badge
  ctx.font = `12px ${theme.fonts.body}`;
  ctx.fillStyle = theme.colors.primary;
  ctx.fillText("🔗 Verified on Solana Blockchain", size / 2, size - 70);

  // AuthentiSeal branding
  ctx.font = `bold 16px ${theme.fonts.heading}`;
  ctx.fillStyle = theme.colors.primary;
  ctx.fillText("AuthentiSeal", size / 2, size - 40);

  ctx.restore();
}
