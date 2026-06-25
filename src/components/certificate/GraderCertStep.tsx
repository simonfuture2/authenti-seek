import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Flag,
  Link2,
  Loader2,
  ShieldQuestion,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGraderVerification,
  type GraderId,
  type GraderMatchStatus,
  type GraderVerifyResult,
} from "@/hooks/useGraderVerification";

export type GraderChoice = GraderId | "none";

const GRADER_OPTIONS: Array<{ value: GraderChoice; label: string }> = [
  { value: "psa", label: "PSA" },
  { value: "tag", label: "TAG" },
  { value: "beckett", label: "Beckett (BGS)" },
  { value: "sgc", label: "SGC" },
  { value: "cgc", label: "CGC" },
  { value: "none", label: "None / raw card" },
];

const GRADER_LABEL: Record<GraderId, string> = {
  psa: "PSA",
  tag: "TAG",
  beckett: "Beckett",
  sgc: "SGC",
  cgc: "CGC",
};

interface Props {
  grader: GraderChoice;
  certNumber: string;
  onGraderChange: (g: GraderChoice) => void;
  onCertNumberChange: (n: string) => void;
  productName: string;
  collectAiCard?: {
    subject?: string | null;
    brand?: string | null;
    year?: string | null;
    cardNumber?: string | null;
  } | null;
  /** Notifies parent when the live status changes (used to gate the Seal button). */
  onStatusChange?: (
    status: GraderMatchStatus | null,
    result: GraderVerifyResult | null,
  ) => void;
  disabled?: boolean;
}

export function GraderCertStep({
  grader,
  certNumber,
  onGraderChange,
  onCertNumberChange,
  productName,
  collectAiCard,
  onStatusChange,
  disabled,
}: Props) {
  const { verify, reset, result, isLoading, error } = useGraderVerification();
  const [lastKey, setLastKey] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced PREVIEW lookup when both grader + cert are filled.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (grader === "none") {
      reset();
      setLastKey("");
      onStatusChange?.("self_attested", null);
      return;
    }
    if (!grader || !certNumber.trim()) {
      reset();
      setLastKey("");
      onStatusChange?.(null, null);
      return;
    }

    const key = `${grader}::${certNumber.trim()}::${productName ?? ""}`;
    if (key === lastKey) return;

    debounceRef.current = setTimeout(async () => {
      const r = await verify({
        grader: grader as GraderId,
        certNumber: certNumber.trim(),
        sealedCard: productName ? { product_name: productName } : null,
        collectAiCard: collectAiCard ?? null,
      });
      setLastKey(key);
      onStatusChange?.(r?.status ?? null, r ?? null);
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grader, certNumber, productName, collectAiCard]);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <ShieldQuestion className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Grading certificate</h3>
        <Badge variant="outline" className="text-[10px]">
          The grader is the authority
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        We verify the cert number with the grading company and cross-check the card
        details. The seal never claims authenticity on its own.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr]">
        <Select
          value={grader}
          onValueChange={(v) => onGraderChange(v as GraderChoice)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Grader" />
          </SelectTrigger>
          <SelectContent>
            {GRADER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={certNumber}
          onChange={(e) => onCertNumberChange(e.target.value)}
          placeholder={
            grader === "none"
              ? "No cert — issuer-attested only"
              : grader === "tag"
                ? "e.g. T1234567"
                : "Cert number"
          }
          disabled={disabled || grader === "none"}
        />
      </div>

      {/* Live status */}
      {grader !== "none" && certNumber.trim() && (
        <div className="pt-1">
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking with {GRADER_LABEL[grader as GraderId]}…
            </div>
          )}
          {!isLoading && error && (
            <div className="text-xs text-destructive">Lookup error: {error}</div>
          )}
          {!isLoading && result && (
            <StatusBadge result={result} grader={grader as GraderId} />
          )}
        </div>
      )}

      {grader === "none" && (
        <div className="text-xs text-muted-foreground">
          Status: <span className="font-medium">self-attested</span> — the seal will
          record only your attestation, with no third-party grader to verify against.
        </div>
      )}
    </div>
  );
}

function StatusBadge({ result, grader }: { result: GraderVerifyResult; grader: GraderId }) {
  const label = GRADER_LABEL[grader];

  if (result.status === "grader_verified") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border border-green-500/30 bg-green-500/10 p-3"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
            Verified against {label}
          </span>
          {result.grade && (
            <Badge variant="secondary" className="ml-auto">
              Grade {result.grade}
              {result.gradeScale ? ` / ${result.gradeScale}` : ""}
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <a
            href={result.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View {label} report <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {(result.images.front || result.images.back) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {result.images.front && (
              <img
                src={result.images.front}
                alt={`${label} front`}
                className="aspect-[3/4] w-full rounded border border-border object-cover"
              />
            )}
            {result.images.back && (
              <img
                src={result.images.back}
                alt={`${label} back`}
                className="aspect-[3/4] w-full rounded border border-border object-cover"
              />
            )}
          </div>
        )}
      </motion.div>
    );
  }

  if (result.status === "grader_linked") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 rounded-md border border-blue-500/30 bg-blue-500/10 p-3"
      >
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Links to {label} cert {result.certNumber}
          </span>
        </div>
        <Button asChild size="sm" variant="outline" className="h-7">
          <a href={result.reportUrl} target="_blank" rel="noopener noreferrer">
            Open report <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </motion.div>
    );
  }

  if (result.status === "self_attested") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground"
      >
        Couldn't confirm this cert with {label} — seal will be issuer-attested only.
      </motion.div>
    );
  }

  // mismatch
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-md border border-destructive/50 bg-destructive/10 p-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-destructive">
            ⚠ Cert details don't match this card — possible tampering
          </p>
          <p className="mt-1 text-xs text-destructive/80">
            The {label} record for cert {result.certNumber} describes a different card
            than what you're sealing. This is a common sign of a re-cased slab or
            cloned cert number. Sealing is blocked.
          </p>
        </div>
      </div>
      <SideBySide result={result} graderLabel={label} />
      <div className="flex items-center gap-2 pt-1">
        <Button asChild size="sm" variant="outline" className="h-7">
          <a href={result.reportUrl} target="_blank" rel="noopener noreferrer">
            View {label} record <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
        <Button asChild size="sm" variant="destructive" className="h-7">
          <a
            href={`/report?grader=${grader}&cert=${encodeURIComponent(result.certNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Flag className="mr-1 h-3 w-3" /> Report this
          </a>
        </Button>
      </div>
    </motion.div>
  );
}

function SideBySide({
  result,
  graderLabel,
}: {
  result: GraderVerifyResult;
  graderLabel: string;
}) {
  const matched = new Set(result.crossCheck.matched_fields);
  const rows: Array<[string, string | null, string | null]> = [
    ["Subject", result.card.subject, null],
    ["Brand", result.card.brand, null],
    ["Year", result.card.year, null],
    ["Card #", result.card.cardNumber, null],
  ];

  return (
    <div className="overflow-hidden rounded border border-destructive/30 bg-background/60 text-xs">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 bg-muted/50 px-2 py-1 font-semibold">
        <div>Field</div>
        <div>{graderLabel} record</div>
        <div>This card</div>
      </div>
      {rows.map(([label, graderVal]) => {
        const ok = matched.has(label.toLowerCase().replace(/[^a-z]/g, "")) ||
                   matched.has(label.toLowerCase());
        return (
          <div
            key={label}
            className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-t border-border px-2 py-1"
          >
            <div className="text-muted-foreground">{label}</div>
            <div className={ok ? "" : "text-destructive font-medium"}>
              {graderVal ?? <span className="text-muted-foreground">—</span>}
            </div>
            <div className="text-muted-foreground italic">
              (compare with entered details)
            </div>
          </div>
        );
      })}
    </div>
  );
}
