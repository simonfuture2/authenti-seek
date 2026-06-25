// Grader adapter registry.
// Add new graders (beckett, sgc, cgc, ...) here as canVerify=false stubs
// until/unless their official APIs become available.

import type { GraderAdapter } from "./types.ts";
import { psa } from "./psa.ts";
import { tag } from "./tag.ts";

export const GRADERS = {
  psa,
  tag,
  // beckett: { ... canVerify: false ... },
  // sgc:     { ... canVerify: false ... },
  // cgc:     { ... canVerify: false ... },
} satisfies Record<string, GraderAdapter>;

export type GraderId = keyof typeof GRADERS;

export function getGrader(id: string): GraderAdapter | null {
  return (GRADERS as Record<string, GraderAdapter>)[id] ?? null;
}

export type { GraderAdapter, GraderCertResult } from "./types.ts";
