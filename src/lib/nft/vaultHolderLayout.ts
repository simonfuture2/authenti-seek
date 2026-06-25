/**
 * Pure (no-DOM) layout + formatting helpers for the Vault Holder NFT renderer.
 *
 * Kept separate from the canvas renderer so they can be exercised in any
 * JS environment (Node, browser, future Vitest) without requiring a real
 * <canvas> element.
 */

import type { SealState } from "@/components/branding/AuthentiSealMark";

export type Grader = "PSA" | "TAG" | "BECKETT" | "BGS" | "SGC" | "CGC" | "NONE";

export interface VaultHolderInput {
  /** Hi-res image of the card. Prefer the grader's image when available. */
  cardImageUrl: string;
  grader: Grader | string;
  certNumber?: string | null;
  grade?: string | number | null;
  serialNumber: string;
  state: SealState;
}

/**
 * MyCollectAi-aligned palette. Mirrors the runtime CSS tokens so the
 * NFT artwork reads as part of the same product family as the dApp UI.
 */
export const VAULT_PALETTE = {
  // Background / chrome
  bgTop: "#0a0a0a",
  bgBottom: "#141416",
  chrome: "#1a1a1d",
  chromeBorder: "rgba(255,255,255,0.08)",

  // Brand
  goldFrom: "#d4af37",
  goldTo: "#f4e4a6",
  goldMid: "#e8c969",

  // Text
  ink: "#f5f3ee",
  inkMuted: "rgba(245,243,238,0.62)",

  // State tints (mirror the SealState mapping in AuthentiSealMark)
  state: {
    verified: "#22c55e",
    linked: "#3aa7e0", // collectai-blue
    attested: "#8b8b91",
    mismatch: "#ef4444",
  } as Record<SealState, string>,

  // CollectAi accent (used as a thin under-glow)
  collectaiPurple: "#a855d6",
};

export function stateLabel(state: SealState): string {
  switch (state) {
    case "verified":
      return "VERIFIED";
    case "linked":
      return "LINKED";
    case "attested":
      return "ATTESTED";
    case "mismatch":
      return "MISMATCH";
  }
}

export function stateTint(state: SealState): string {
  return VAULT_PALETTE.state[state];
}

/**
 * Normalize a grade for display. Accepts "10", 10, "Gem Mint 10", "PSA 9.5".
 * Returns { value, scale } so the renderer can size them independently.
 */
export function formatGrade(
  grader: string,
  grade: string | number | null | undefined,
): { value: string; scale: string } {
  if (grade === null || grade === undefined || grade === "") {
    return { value: "—", scale: "UNGRADED" };
  }
  const raw = String(grade).trim();
  // Pull the trailing numeric token, e.g. "Gem Mint 10" -> "10"
  const m = raw.match(/(\d+(?:\.\d+)?)\s*$/);
  const value = m ? m[1] : raw;
  const scale = grader && grader !== "NONE" ? grader.toUpperCase() : "RAW";
  return { value, scale };
}

export function formatCertLabel(
  grader: string,
  certNumber?: string | null,
): string {
  if (!certNumber || grader === "NONE") return "ISSUER ATTESTED";
  return `${grader.toUpperCase()} · ${certNumber}`;
}

/**
 * Canonical 1024x1024 layout. Returning concrete pixel boxes (not ratios)
 * makes the renderer trivial to read and lets us snapshot-test layout
 * without spinning up a canvas.
 */
export interface VaultLayout {
  size: number;
  margin: number;
  frame: { x: number; y: number; w: number; h: number; radius: number };
  card: { x: number; y: number; w: number; h: number; radius: number };
  topBar: { x: number; y: number; w: number; h: number };
  bottomBar: { x: number; y: number; w: number; h: number };
  sealCenter: { x: number; y: number; r: number };
  gradeBlock: { x: number; y: number; w: number; h: number };
  stateChip: { x: number; y: number; w: number; h: number };
}

export function computeVaultLayout(size = 1024): VaultLayout {
  const margin = Math.round(size * 0.05);
  const frame = {
    x: margin,
    y: margin,
    w: size - margin * 2,
    h: size - margin * 2,
    radius: Math.round(size * 0.035),
  };
  const topBar = { x: frame.x, y: frame.y, w: frame.w, h: Math.round(size * 0.11) };
  const bottomBar = {
    x: frame.x,
    y: frame.y + frame.h - Math.round(size * 0.14),
    w: frame.w,
    h: Math.round(size * 0.14),
  };
  // Card is a 5:7 portrait centered in the window between the bars.
  const windowTop = topBar.y + topBar.h + Math.round(size * 0.02);
  const windowBottom = bottomBar.y - Math.round(size * 0.02);
  const windowH = windowBottom - windowTop;
  const cardH = windowH;
  const cardW = Math.round((cardH * 5) / 7);
  const card = {
    x: Math.round((size - cardW) / 2),
    y: windowTop,
    w: cardW,
    h: cardH,
    radius: Math.round(size * 0.018),
  };
  const sealR = Math.round(size * 0.075);
  const sealCenter = {
    x: bottomBar.x + bottomBar.w - sealR - Math.round(size * 0.025),
    y: bottomBar.y + bottomBar.h / 2,
    r: sealR,
  };
  const gradeBlock = {
    x: bottomBar.x + Math.round(size * 0.025),
    y: bottomBar.y + Math.round(size * 0.015),
    w: Math.round(size * 0.26),
    h: bottomBar.h - Math.round(size * 0.03),
  };
  const stateChip = {
    x: topBar.x + Math.round(size * 0.025),
    y: topBar.y + Math.round(topBar.h * 0.28),
    w: Math.round(size * 0.22),
    h: Math.round(topBar.h * 0.44),
  };
  return { size, margin, frame, card, topBar, bottomBar, sealCenter, gradeBlock, stateChip };
}
