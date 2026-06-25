// TAG (Technical Authentication and Grading) adapter.
// Link-out only — TAG does not currently expose a public verification API.
// `lookup()` returns a found:false shell so the crosscheck pipeline can
// still record the cert number, report URL, and result_status = grader_linked.

import type { GraderAdapter, GraderCertResult } from "./types.ts";
import { emptyCard, emptyImages } from "./types.ts";

export const tag: GraderAdapter = {
  id: "tag",
  label: "TAG",
  canVerify: false,

  normalizeCertNumber(input: string): string | null {
    const trimmed = (input ?? "").trim().toUpperCase();
    // 1 letter + 7 digits, e.g. T1234567
    return /^[A-Z]\d{7}$/.test(trimmed) ? trimmed : null;
  },

  reportUrl(certNumber: string): string {
    return `https://tagd.co/${certNumber}`;
  },

  async lookup(certNumber: string): Promise<GraderCertResult> {
    return {
      found: false,
      grader: "tag",
      certNumber,
      grade: null,
      gradeScale: "1-1000",
      card: emptyCard(),
      images: emptyImages(),
      reportUrl: this.reportUrl(certNumber),
      raw: null,
    };
  },
};
