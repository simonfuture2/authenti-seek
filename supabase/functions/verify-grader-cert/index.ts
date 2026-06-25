// verify-grader-cert
//
// Looks up a card grading-company cert (PSA live; TAG/others link-out),
// cross-checks the grader's record against the sealed-card / MyCollectAi
// identity, and returns a trust state (grader_verified | grader_linked |
// self_attested | mismatch). When certificateId is supplied, commits the
// result to public.certificates and writes a grader_verifications audit row.
//
// IMPORTANT: never claims authenticity itself. The grading company is the
// authority. This function only resolves "does the grader's record match
// what's being sealed?".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GRADERS, getGrader, type GraderCertResult } from "../_shared/graders/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CardLike = {
  subject?: string | null;
  brand?: string | null;
  year?: string | number | null;
  cardNumber?: string | number | null;
  product_name?: string | null; // free-text fallback (sealedCard)
};

type RequestBody = {
  grader?: string;
  certNumber?: string;
  certificateId?: string | null;
  sealedCard?: CardLike | null;
  collectAiCard?: CardLike | null;
};

type MatchStatus = "grader_verified" | "grader_linked" | "self_attested" | "mismatch";

const COMPARE_FIELDS = ["subject", "brand", "year", "cardNumber"] as const;
type CompareField = typeof COMPARE_FIELDS[number];

function norm(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getField(card: CardLike | null | undefined, field: CompareField): string {
  if (!card) return "";
  return norm((card as Record<string, unknown>)[field]);
}

/** Returns true if values agree (one contains the other, both non-empty). */
function fieldsAgree(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

/** Fuzzy match: how many of the grader's fields appear in product_name free text. */
function freeTextAgreements(grader: GraderCertResult, freeText: string): {
  matched: CompareField[];
  mismatched: CompareField[];
  comparable: CompareField[];
} {
  const haystack = norm(freeText);
  const matched: CompareField[] = [];
  const mismatched: CompareField[] = [];
  const comparable: CompareField[] = [];
  if (!haystack) return { matched, mismatched, comparable };

  for (const f of COMPARE_FIELDS) {
    const needle = getField(grader.card as unknown as CardLike, f);
    if (!needle) continue;
    comparable.push(f);
    if (haystack.includes(needle)) matched.push(f);
    else mismatched.push(f);
  }
  return { matched, mismatched, comparable };
}

function pairwise(a: CardLike, b: CardLike): {
  matched: CompareField[];
  mismatched: CompareField[];
  comparable: CompareField[];
} {
  const matched: CompareField[] = [];
  const mismatched: CompareField[] = [];
  const comparable: CompareField[] = [];
  for (const f of COMPARE_FIELDS) {
    const av = getField(a, f);
    const bv = getField(b, f);
    if (!av || !bv) continue;
    comparable.push(f);
    if (fieldsAgree(av, bv)) matched.push(f);
    else mismatched.push(f);
  }
  return { matched, mismatched, comparable };
}

function classify(opts: {
  adapterCanVerify: boolean;
  graderFound: boolean;
  matched: CompareField[];
  mismatched: CompareField[];
  comparable: CompareField[];
}): MatchStatus {
  if (!opts.adapterCanVerify) return "grader_linked";
  if (!opts.graderFound) return "self_attested";
  if (opts.matched.length >= 3) return "grader_verified";
  if (opts.matched.length <= 1 && opts.comparable.length >= 2) return "mismatch";
  return "grader_linked";
}

function buildSnapshot(g: GraderCertResult) {
  return {
    grader: g.grader,
    certNumber: g.certNumber,
    grade: g.grade,
    gradeScale: g.gradeScale,
    card: g.card,
    images: g.images,
    reportUrl: g.reportUrl,
    capturedAt: new Date().toISOString(),
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const graderId = (body.grader ?? "").toString().toLowerCase().trim();
  const adapter = getGrader(graderId);
  if (!adapter) {
    return json(
      { error: `Unknown grader '${graderId}'. Supported: ${Object.keys(GRADERS).join(", ")}` },
      400,
    );
  }

  const rawCert = (body.certNumber ?? "").toString();
  const certNumber = adapter.normalizeCertNumber(rawCert);
  if (!certNumber) {
    return json({ error: `Malformed cert number for ${adapter.label}` }, 400);
  }

  // 1) Lookup (or link-out shell).
  let graderResult: GraderCertResult;
  try {
    graderResult = adapter.canVerify
      ? await adapter.lookup(certNumber)
      : {
          found: false,
          grader: adapter.id,
          certNumber,
          grade: null,
          gradeScale: null,
          card: {
            subject: null, brand: null, year: null,
            cardNumber: null, variety: null, category: null,
          },
          images: { front: null, back: null },
          reportUrl: adapter.reportUrl(certNumber),
          raw: null,
        };
  } catch (err) {
    console.error("[verify-grader-cert] lookup failed", err);
    return json(
      { error: `Grader lookup failed: ${(err as Error).message ?? "unknown error"}` },
      502,
    );
  }

  // 2) Cross-check.
  const A = body.collectAiCard ?? null;
  const C = body.sealedCard ?? null;
  const graderAsCard = graderResult.card as unknown as CardLike;

  let cmp: { matched: CompareField[]; mismatched: CompareField[]; comparable: CompareField[] };
  let comparisonMode: "A-vs-B" | "B-vs-C-fields" | "B-vs-C-freetext" | "none";

  if (graderResult.found && A) {
    cmp = pairwise(A, graderAsCard);
    comparisonMode = "A-vs-B";
  } else if (graderResult.found && C) {
    const structured = pairwise(graderAsCard, C);
    if (structured.comparable.length >= 2) {
      cmp = structured;
      comparisonMode = "B-vs-C-fields";
    } else {
      const ft = freeTextAgreements(graderResult, C.product_name ?? "");
      cmp = ft;
      comparisonMode = "B-vs-C-freetext";
    }
  } else {
    cmp = { matched: [], mismatched: [], comparable: [] };
    comparisonMode = "none";
  }

  const status = classify({
    adapterCanVerify: adapter.canVerify,
    graderFound: graderResult.found,
    matched: cmp.matched,
    mismatched: cmp.mismatched,
    comparable: cmp.comparable,
  });

  const snapshot = graderResult.found ? buildSnapshot(graderResult) : null;

  const crossCheck = {
    mode: comparisonMode,
    matched_fields: cmp.matched,
    mismatched_fields: cmp.mismatched,
    comparable_fields: cmp.comparable,
    sources: {
      collectAi: !!A,
      grader: graderResult.found,
      sealed: !!C,
    },
  };

  const responsePayload = {
    status,
    grade: graderResult.grade,
    gradeScale: graderResult.gradeScale,
    reportUrl: graderResult.reportUrl,
    card: graderResult.card,
    images: graderResult.images,
    crossCheck,
    snapshot,
    certNumber,
    grader: adapter.id,
    mode: body.certificateId ? "commit" : "preview",
  };

  // PREVIEW: no DB writes.
  if (!body.certificateId) return json(responsePayload);

  // COMMIT: require auth + ownership.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Authentication required to commit grader result" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Invalid auth token" }, 401);
  }
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: cert, error: certErr } = await admin
    .from("certificates")
    .select("id, issuer_id")
    .eq("id", body.certificateId)
    .maybeSingle();
  if (certErr || !cert) return json({ error: "Certificate not found" }, 404);
  if (cert.issuer_id !== userId) {
    return json({ error: "Not authorized for this certificate" }, 403);
  }

  const { error: updErr } = await admin
    .from("certificates")
    .update({
      grader: adapter.id,
      grader_cert_number: certNumber,
      grader_grade: graderResult.grade,
      grader_grade_scale: graderResult.gradeScale,
      grader_report_url: graderResult.reportUrl,
      grader_images: graderResult.images ?? {},
      grader_match_status: status,
      grader_verified_at: new Date().toISOString(),
      grader_card_snapshot: snapshot ?? {},
    })
    .eq("id", body.certificateId);

  if (updErr) {
    console.error("[verify-grader-cert] cert update failed", updErr);
    return json({ error: "Failed to update certificate" }, 500);
  }

  const { error: auditErr } = await admin.from("grader_verifications").insert({
    certificate_id: body.certificateId,
    grader: adapter.id,
    grader_cert_number: certNumber,
    result_status: status,
    raw_response: graderResult.raw ?? null,
    cross_check: crossCheck,
    checked_by: userId,
  });
  if (auditErr) {
    console.error("[verify-grader-cert] audit insert failed", auditErr);
    // non-fatal: certificate is already updated
  }

  return json(responsePayload);
});
