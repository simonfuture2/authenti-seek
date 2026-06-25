import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Flag,
  Info,
  Link2,
  ShieldQuestion,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type GraderMatchStatus =
  | "grader_verified"
  | "grader_linked"
  | "self_attested"
  | "mismatch";

const GRADER_LABEL: Record<string, string> = {
  psa: "PSA",
  tag: "TAG",
  beckett: "Beckett",
  sgc: "SGC",
  cgc: "CGC",
};

function labelFor(grader: string | null | undefined): string {
  if (!grader) return "the grader";
  return GRADER_LABEL[grader.toLowerCase()] ?? grader.toUpperCase();
}

interface GraderCardSnapshot {
  card?: {
    subject?: string | null;
    brand?: string | null;
    year?: string | null;
    cardNumber?: string | null;
  } | null;
}

interface SealedDetails {
  product_name?: string | null;
  category?: string | null;
  serial_number?: string | null;
}

interface Props {
  status: GraderMatchStatus | null | undefined;
  grader: string | null;
  graderCertNumber: string | null;
  graderGrade: string | null;
  graderGradeScale: string | null;
  graderReportUrl: string | null;
  graderImages: { front?: string | null; back?: string | null } | null;
  graderVerifiedAt: string | null;
  graderCardSnapshot: GraderCardSnapshot | null;
  sealed: SealedDetails;
  sealedImages?: string[] | null;
  /** Highlights the "Sealed by" block when status is self_attested. */
  onScrollToSeller?: () => void;
}

export function GraderTrustBadge({
  status,
  grader,
  graderCertNumber,
  graderGrade,
  graderGradeScale,
  graderReportUrl,
  graderImages,
  graderVerifiedAt,
  graderCardSnapshot,
  sealed,
  sealedImages,
  onScrollToSeller,
}: Props) {
  const effective: GraderMatchStatus = status ?? "self_attested";
  const label = labelFor(grader);

  if (effective === "grader_verified") {
    const dateStr = graderVerifiedAt
      ? new Date(graderVerifiedAt).toLocaleDateString()
      : null;
    return (
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-green-500/40 bg-green-500/10 p-5"
        aria-label="Grader verification status"
      >
        <header className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-green-700 dark:text-green-400">
              Verified against {label}
              {dateStr ? ` on ${dateStr}` : ""}
            </h3>
            <p className="text-xs text-muted-foreground">
              {label} confirmed cert {graderCertNumber} and the card details match
              this seal.
            </p>
          </div>
          {graderGrade && (
            <Badge variant="secondary" className="shrink-0">
              Grade {graderGrade}
              {graderGradeScale ? ` / ${graderGradeScale}` : ""}
            </Badge>
          )}
        </header>

        {graderReportUrl && (
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <a href={graderReportUrl} target="_blank" rel="noopener noreferrer">
                View {label} report <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        )}

        {(graderImages?.front || graderImages?.back || (sealedImages && sealedImages[0])) && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {graderImages?.front && (
              <ImageTile src={graderImages.front} caption={`${label} front`} />
            )}
            {graderImages?.back && (
              <ImageTile src={graderImages.back} caption={`${label} back`} />
            )}
            {sealedImages?.slice(0, 2).map((src, i) => (
              <ImageTile key={i} src={src} caption={`Sealed image ${i + 1}`} />
            ))}
          </div>
        )}
      </motion.section>
    );
  }

  if (effective === "grader_linked") {
    return (
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-xl border border-blue-500/40 bg-blue-500/10 p-4"
        aria-label="Grader link status"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
          <Link2 className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Links to {label} cert {graderCertNumber}
          </h3>
          <p className="text-xs text-muted-foreground">
            We don't auto-verify {label} certs yet — check the official record.
          </p>
        </div>
        {graderReportUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={graderReportUrl} target="_blank" rel="noopener noreferrer">
              Open {label} report <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )}
      </motion.section>
    );
  }

  if (effective === "self_attested") {
    return (
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-4"
        aria-label="Issuer-attested status"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <ShieldQuestion className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Issuer-attested — confirm the seller below</h3>
          <p className="text-xs text-muted-foreground">
            No third-party grader verified this card. Your trust here comes from the
            issuer (the seller). Review their identity before relying on this seal.
          </p>
          {onScrollToSeller && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2 h-7 px-2 text-xs"
              onClick={onScrollToSeller}
            >
              <Info className="mr-1 h-3 w-3" /> Jump to seller details
            </Button>
          )}
        </div>
      </motion.section>
    );
  }

  // mismatch
  const g = graderCardSnapshot?.card ?? null;
  const rows: Array<[string, string | null | undefined, string | null | undefined]> = [
    ["Subject / Title", g?.subject, sealed.product_name],
    ["Brand", g?.brand, null],
    ["Year", g?.year, null],
    ["Card #", g?.cardNumber, sealed.serial_number],
    ["Category", null, sealed.category],
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-xl border border-destructive/50 bg-destructive/10 p-5"
      aria-label="Grader mismatch warning"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-destructive">
            ⛔ Cert details don't match — possible tampering
          </h3>
          <p className="text-xs text-destructive/80">
            {label}'s record for cert {graderCertNumber} describes a different card
            than what this seal claims. This is a common sign of a re-cased slab or
            cloned cert number. Do not rely on this certificate.
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded border border-destructive/30 bg-background/70 text-xs">
        <div className="grid grid-cols-3 gap-2 bg-muted px-3 py-2 font-semibold">
          <div>Field</div>
          <div>{label} record</div>
          <div>This seal</div>
        </div>
        {rows.map(([f, a, b]) => (
          <div
            key={f}
            className="grid grid-cols-3 gap-2 border-t border-border px-3 py-2"
          >
            <div className="text-muted-foreground">{f}</div>
            <div className="font-medium">
              {a ?? <span className="text-muted-foreground">—</span>}
            </div>
            <div className="font-medium">
              {b ?? <span className="text-muted-foreground">—</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {graderReportUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={graderReportUrl} target="_blank" rel="noopener noreferrer">
              View {label} record <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )}
        <Button asChild size="sm" variant="destructive">
          <a
            href={`/report?grader=${grader ?? ""}&cert=${encodeURIComponent(graderCertNumber ?? "")}`}
          >
            <Flag className="mr-1 h-3 w-3" /> Report this cert
          </a>
        </Button>
      </div>
    </motion.section>
  );
}

function ImageTile({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="space-y-1">
      <img
        src={src}
        alt={caption}
        className="aspect-[3/4] w-full rounded border border-border object-cover"
        loading="lazy"
      />
      <figcaption className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
