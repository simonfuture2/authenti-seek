// Certificate theme definitions for COA generation

export type CertificateTheme = "luxury" | "modern" | "tech";
export type SealStyle = "gold" | "platinum" | "copper";

export interface ThemeConfig {
  id: CertificateTheme;
  name: string;
  description: string;
  previewGradient: string;
  colors: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textMuted: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  borderStyle: "ornate" | "geometric" | "circuit";
}

export interface SealConfig {
  id: SealStyle;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    highlight: string;
    shadow: string;
  };
}

export const CERTIFICATE_THEMES: Record<CertificateTheme, ThemeConfig> = {
  luxury: {
    id: "luxury",
    name: "Luxury",
    description: "Elegant dark background with gold accents and ornate borders",
    previewGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    colors: {
      background: "#0d0d1a",
      primary: "#d4af37",
      secondary: "#8b7355",
      accent: "#f5e6c8",
      text: "#ffffff",
      textMuted: "#a0a0a0",
      border: "#d4af37",
    },
    fonts: {
      heading: "Playfair Display, serif",
      body: "Inter, sans-serif",
    },
    borderStyle: "ornate",
  },
  modern: {
    id: "modern",
    name: "Modern Minimal",
    description: "Clean white/gray with geometric patterns and crisp lines",
    previewGradient: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)",
    colors: {
      background: "#ffffff",
      primary: "#1a1a2e",
      secondary: "#495057",
      accent: "#14f195",
      text: "#1a1a2e",
      textMuted: "#6c757d",
      border: "#dee2e6",
    },
    fonts: {
      heading: "Space Grotesk, sans-serif",
      body: "Inter, sans-serif",
    },
    borderStyle: "geometric",
  },
  tech: {
    id: "tech",
    name: "Tech/Futuristic",
    description: "Holographic gradients, circuit patterns, Solana-inspired",
    previewGradient: "linear-gradient(135deg, #1a1a2e 0%, #14f195 50%, #9945ff 100%)",
    colors: {
      background: "#0a0a14",
      primary: "#14f195",
      secondary: "#9945ff",
      accent: "#00d4ff",
      text: "#ffffff",
      textMuted: "#8892b0",
      border: "#14f195",
    },
    fonts: {
      heading: "Orbitron, sans-serif",
      body: "JetBrains Mono, monospace",
    },
    borderStyle: "circuit",
  },
};

export const SEAL_STYLES: Record<SealStyle, SealConfig> = {
  gold: {
    id: "gold",
    name: "Gold Foil",
    description: "Premium gold authentication seal",
    colors: {
      primary: "#d4af37",
      secondary: "#b8860b",
      highlight: "#ffd700",
      shadow: "#8b7355",
    },
  },
  platinum: {
    id: "platinum",
    name: "Platinum",
    description: "Elegant platinum authentication seal",
    colors: {
      primary: "#e5e4e2",
      secondary: "#c0c0c0",
      highlight: "#ffffff",
      shadow: "#a8a8a8",
    },
  },
  copper: {
    id: "copper",
    name: "Copper",
    description: "Classic copper authentication seal",
    colors: {
      primary: "#b87333",
      secondary: "#cd7f32",
      highlight: "#da8a17",
      shadow: "#8b4513",
    },
  },
};

// Get theme by ID with fallback
export function getTheme(id: CertificateTheme): ThemeConfig {
  return CERTIFICATE_THEMES[id] || CERTIFICATE_THEMES.luxury;
}

// Get seal by ID with fallback
export function getSeal(id: SealStyle): SealConfig {
  return SEAL_STYLES[id] || SEAL_STYLES.gold;
}
