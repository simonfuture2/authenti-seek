// Shared types for grading-company adapters.
// Downstream code (edge functions, crosscheck) depends ONLY on the
// normalized GraderCertResult shape — never on raw provider payloads.

export interface GraderCard {
  subject: string | null;       // e.g. player name / character / subject
  brand: string | null;          // e.g. "Topps", "Panini", "Pokemon"
  year: string | null;           // string to preserve "1986-87" style ranges
  cardNumber: string | null;     // e.g. "#150"
  variety: string | null;        // e.g. "Refractor", "Holo", "1st Edition"
  category: string | null;       // e.g. "Baseball", "Pokemon TCG"
}

export interface GraderImages {
  front: string | null;
  back: string | null;
}

export interface GraderCertResult {
  found: boolean;
  grader: string;                // adapter id, e.g. "psa"
  certNumber: string;            // normalized cert number echoed back
  grade: string | null;          // e.g. "10", "9.5", "PR1"
  gradeScale: string | null;     // e.g. "1-10", "1-1000"
  card: GraderCard;
  images: GraderImages;
  reportUrl: string;             // always populated (link-out target)
  raw: unknown;                  // verbatim provider response, for audit
}

export interface GraderAdapter {
  id: string;
  label: string;
  /** true if `lookup()` hits a real provider API; false = link-out only. */
  canVerify: boolean;
  /** Returns a canonical cert number string, or null if input is invalid. */
  normalizeCertNumber(input: string): string | null;
  /** Performs a live lookup. For canVerify=false adapters, returns a found:false shell. */
  lookup(certNumber: string): Promise<GraderCertResult>;
  /** Public report URL for a given cert number. Used for link-out and provenance. */
  reportUrl(certNumber: string): string;
}

export function emptyCard(): GraderCard {
  return {
    subject: null,
    brand: null,
    year: null,
    cardNumber: null,
    variety: null,
    category: null,
  };
}

export function emptyImages(): GraderImages {
  return { front: null, back: null };
}
