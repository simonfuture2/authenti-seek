// PSA (Professional Sports Authenticator) adapter.
// Live verification via PSA's Public API.
//
// NOTE: PSA's exact response field casing (PascalCase vs camelCase) varies
// across docs. We defensively read both shapes via `pick()`. If the live
// API differs, adjust the field names in `mapCert()` — the rest of the
// pipeline depends only on the normalized GraderCertResult.

import type { GraderAdapter, GraderCertResult } from "./types.ts";
import { emptyCard, emptyImages } from "./types.ts";

const PSA_API_BASE = "https://api.psacard.com/publicapi/cert/GetByCertNumber";

function pick<T = unknown>(obj: Record<string, unknown> | null | undefined, ...keys: string[]): T | null {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k] as T;
  }
  return null;
}

function mapCert(certNumber: string, payload: unknown): GraderCertResult {
  // PSA typically returns { PSACert: {...} }; sometimes nested under a wrapper.
  const root = (payload ?? {}) as Record<string, unknown>;
  const cert =
    (root.PSACert as Record<string, unknown>) ??
    (root.psaCert as Record<string, unknown>) ??
    root;

  const grade = pick<string | number>(cert, "CardGrade", "Grade", "cardGrade", "grade");
  const subject = pick<string>(cert, "Subject", "subject");
  const brand = pick<string>(cert, "Brand", "brand");
  const year = pick<string | number>(cert, "Year", "year");
  const cardNumber = pick<string | number>(cert, "CardNumber", "cardNumber");
  const variety = pick<string>(cert, "Variety", "variety", "Variant", "variant");
  const category = pick<string>(cert, "Category", "category", "SpecSport", "specSport");
  const front = pick<string>(cert, "ImageUrl", "FrontImageUrl", "imageUrl", "frontImageUrl");
  const back = pick<string>(cert, "BackImageUrl", "backImageUrl");

  return {
    found: true,
    grader: "psa",
    certNumber,
    grade: grade != null ? String(grade) : null,
    gradeScale: "1-10",
    card: {
      subject: subject ? String(subject) : null,
      brand: brand ? String(brand) : null,
      year: year != null ? String(year) : null,
      cardNumber: cardNumber != null ? String(cardNumber) : null,
      variety: variety ? String(variety) : null,
      category: category ? String(category) : null,
    },
    images: {
      front: front ? String(front) : null,
      back: back ? String(back) : null,
    },
    reportUrl: `https://www.psacard.com/cert/${certNumber}`,
    raw: payload,
  };
}

export const psa: GraderAdapter = {
  id: "psa",
  label: "PSA",
  canVerify: true,

  normalizeCertNumber(input: string): string | null {
    const digits = (input ?? "").replace(/\D+/g, "");
    if (digits.length < 7 || digits.length > 10) return null;
    return digits;
  },

  reportUrl(certNumber: string): string {
    return `https://www.psacard.com/cert/${certNumber}`;
  },

  async lookup(certNumber: string): Promise<GraderCertResult> {
    const token = Deno.env.get("PSA_API_TOKEN");
    if (!token) {
      throw new Error("PSA_API_TOKEN is not configured");
    }

    const url = `${PSA_API_BASE}/${encodeURIComponent(certNumber)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `bearer ${token}`,
        Accept: "application/json",
      },
    });

    // PSA returns 204 No Content when the cert number does not exist.
    if (res.status === 204) {
      return {
        found: false,
        grader: "psa",
        certNumber,
        grade: null,
        gradeScale: "1-10",
        card: emptyCard(),
        images: emptyImages(),
        reportUrl: this.reportUrl(certNumber),
        raw: null,
      };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PSA lookup failed: ${res.status} ${text.slice(0, 200)}`);
    }

    const payload = await res.json();
    return mapCert(certNumber, payload);
  },
};
