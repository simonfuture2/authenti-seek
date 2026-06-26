/**
 * Cross-app integration configuration for the AuthentiSeal ecosystem.
 * Manages deep linking between AuthentiSeal and CollectAI.
 */

export const ECOSYSTEM_APPS = {
  authentiseal: {
    name: "AuthentiSeal",
    tagline: "Blockchain-Verified Certificates",
    url: "https://authenti-seek.lovable.app",
    verifyUrl: (serial: string) =>
      `https://authenti-seek.lovable.app/verify?serial=${encodeURIComponent(serial)}`,
    issuerProfileUrl: (issuerId: string) =>
      `https://authenti-seek.lovable.app/issuer/${issuerId}`,
    apiBaseUrl: "https://ffudcsfmihkrjodfilnt.supabase.co/functions/v1",
    verifyApiUrl: (serial: string) =>
      `https://ffudcsfmihkrjodfilnt.supabase.co/functions/v1/verify-public?serial=${encodeURIComponent(serial)}`,
    collectaiIdentifyUrl:
      "https://ffudcsfmihkrjodfilnt.supabase.co/functions/v1/collectai-identify",
    createCOAUrl: (token: string) =>
      `https://authenti-seek.lovable.app/issuer/create?token=${encodeURIComponent(token)}&ref=collectai`,
  },
  collectai: {
    name: "CollectAI",
    tagline: "AI-Powered Card Grading",
    url: "https://mycollectai.com",
    gradeUrl: (cardId?: string) =>
      cardId
        ? `https://mycollectai.com/grade?ref=authentiseal&card=${encodeURIComponent(cardId)}`
        : `https://mycollectai.com/grade?ref=authentiseal`,
    marketUrl: (query?: string) =>
      query
        ? `https://mycollectai.com/market?q=${encodeURIComponent(query)}`
        : `https://mycollectai.com/market`,
    identifyApiUrl:
      "https://irncxwszrawrndsdaqel.supabase.co/functions/v1/collectai-identify",
  },
} as const;

/**
 * Check if the current referrer is from a linked ecosystem app.
 */
export function getEcosystemReferrer(): string | null {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ref in ECOSYSTEM_APPS) {
    return ref;
  }
  return null;
}

/**
 * Build a deep link URL with referrer tracking.
 */
export function buildDeepLink(
  app: keyof typeof ECOSYSTEM_APPS,
  path: string,
  params?: Record<string, string>
): string {
  const base = ECOSYSTEM_APPS[app].url;
  const url = new URL(path, base);
  url.searchParams.set("ref", "authentiseal");
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}
