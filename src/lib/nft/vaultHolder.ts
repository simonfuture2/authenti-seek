/**
 * Vault Holder — NFT artwork renderer.
 *
 * Composites the card image (graded-card photo, ideally the grader's hi-res
 * scan) into a branded slab-style "vault holder" frame, with:
 *   - Grade chip   (top-left, big numeric on a gold plate)
 *   - State chip   (top, tinted by SealState)
 *   - Card window  (centered, soft drop-shadow)
 *   - AuthentiSeal medallion (bottom-right, gold rim + state-tinted shield)
 *   - Grader + cert number caption (bottom)
 *   - Serial number micro-text (footer)
 *
 * Pure render function — given the inputs it returns a 1024×1024 PNG data URL.
 * Phase 3 will pin this output (or its bytes) as the NFT `image`.
 *
 * Palette is intentionally HARD-CODED inside this module rather than read
 * from CSS variables, because the artwork must look identical regardless
 * of the user's theme (light/dark/seeker) at mint time. The values mirror
 * the AuthentiSeal + MyCollectAi token palette.
 */

import {
  VAULT_PALETTE,
  computeVaultLayout,
  formatCertLabel,
  formatGrade,
  stateLabel,
  stateTint,
  type VaultHolderInput,
} from "./vaultHolderLayout";

const TARGET_SIZE = 1024;

export type { VaultHolderInput } from "./vaultHolderLayout";

/**
 * Load an image from a URL into an HTMLImageElement. Uses anonymous CORS so
 * the resulting canvas remains exportable to a data URL.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Vault renderer: failed to load ${url}: ${String(e)}`));
    img.src = url;
  });
}

/** Cover-fit a source image into a destination box (object-fit: cover). */
function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const sr = img.width / img.height;
  const dr = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (sr > dr) {
    // Source wider — crop horizontally.
    sw = img.height * dr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function drawSealMedallion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
) {
  // Outer gold ring
  const ringGrad = ctx.createRadialGradient(cx, cy - r * 0.4, r * 0.1, cx, cy, r);
  ringGrad.addColorStop(0, VAULT_PALETTE.goldTo);
  ringGrad.addColorStop(1, VAULT_PALETTE.goldFrom);
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner field
  ctx.fillStyle = VAULT_PALETTE.chrome;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.fill();

  // Milled rivet ring
  ctx.fillStyle = VAULT_PALETTE.goldMid;
  const rivets = 24;
  for (let i = 0; i < rivets; i++) {
    const a = (i / rivets) * Math.PI * 2 - Math.PI / 2;
    const rx = cx + Math.cos(a) * r * 0.86;
    const ry = cy + Math.sin(a) * r * 0.86;
    ctx.beginPath();
    ctx.arc(rx, ry, r * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shield silhouette (state-tinted)
  ctx.save();
  ctx.translate(cx, cy);
  const s = r * 0.55;
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.85, -s * 0.6);
  ctx.lineTo(s * 0.85, s * 0.25);
  ctx.quadraticCurveTo(s * 0.85, s * 0.85, 0, s * 1.05);
  ctx.quadraticCurveTo(-s * 0.85, s * 0.85, -s * 0.85, s * 0.25);
  ctx.lineTo(-s * 0.85, -s * 0.6);
  ctx.closePath();
  ctx.fill();

  // Checkmark
  ctx.strokeStyle = VAULT_PALETTE.ink;
  ctx.lineWidth = s * 0.18;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.35, s * 0.05);
  ctx.lineTo(-s * 0.05, s * 0.35);
  ctx.lineTo(s * 0.45, -s * 0.25);
  ctx.stroke();
  ctx.restore();

  // Wordmark above the shield
  ctx.fillStyle = VAULT_PALETTE.goldTo;
  ctx.font = `600 ${Math.round(r * 0.18)}px "Fredoka", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AUTHENTISEAL", cx, cy - r * 0.55);
}

export interface RenderVaultHolderOptions {
  /** Defaults to 1024. NFT specs almost always want 1024×1024. */
  size?: number;
  /** Image-loader override (used by tests). */
  loadImageFn?: (url: string) => Promise<HTMLImageElement>;
}

/**
 * Render the vault-holder composite and return a PNG data URL.
 * Safe to call repeatedly — uses an offscreen canvas each invocation.
 */
export async function renderVaultHolder(
  input: VaultHolderInput,
  opts: RenderVaultHolderOptions = {},
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("renderVaultHolder requires a browser environment (document is undefined).");
  }
  const size = opts.size ?? TARGET_SIZE;
  const layout = computeVaultLayout(size);
  const loader = opts.loadImageFn ?? loadImage;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("renderVaultHolder: 2D canvas context unavailable.");

  // ── Background gradient ──
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, VAULT_PALETTE.bgTop);
  bg.addColorStop(1, VAULT_PALETTE.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle purple under-glow (CollectAi family signal)
  const glow = ctx.createRadialGradient(size / 2, size * 0.45, size * 0.05, size / 2, size * 0.45, size * 0.6);
  glow.addColorStop(0, "rgba(168,85,214,0.18)");
  glow.addColorStop(1, "rgba(168,85,214,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // ── Outer frame / chrome ──
  ctx.fillStyle = VAULT_PALETTE.chrome;
  roundedRect(ctx, layout.frame.x, layout.frame.y, layout.frame.w, layout.frame.h, layout.frame.radius);
  ctx.fill();
  ctx.strokeStyle = VAULT_PALETTE.chromeBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Gold hairline inside the frame
  ctx.strokeStyle = VAULT_PALETTE.goldFrom;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  roundedRect(
    ctx,
    layout.frame.x + 8,
    layout.frame.y + 8,
    layout.frame.w - 16,
    layout.frame.h - 16,
    layout.frame.radius - 6,
  );
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── Card window ──
  // Drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#000";
  roundedRect(ctx, layout.card.x, layout.card.y, layout.card.w, layout.card.h, layout.card.radius);
  ctx.fill();
  ctx.restore();

  // Card image (cover-fit, clipped to rounded rect)
  try {
    const img = await loader(input.cardImageUrl);
    ctx.save();
    roundedRect(ctx, layout.card.x, layout.card.y, layout.card.w, layout.card.h, layout.card.radius);
    ctx.clip();
    coverDraw(ctx, img, layout.card.x, layout.card.y, layout.card.w, layout.card.h);
    ctx.restore();
  } catch (err) {
    // Fall back to a placeholder card so the holder is still a valid NFT.
    ctx.save();
    roundedRect(ctx, layout.card.x, layout.card.y, layout.card.w, layout.card.h, layout.card.radius);
    ctx.clip();
    ctx.fillStyle = "#2a2a2e";
    ctx.fillRect(layout.card.x, layout.card.y, layout.card.w, layout.card.h);
    ctx.fillStyle = VAULT_PALETTE.inkMuted;
    ctx.font = `500 ${Math.round(size * 0.025)}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Image unavailable", layout.card.x + layout.card.w / 2, layout.card.y + layout.card.h / 2);
    ctx.restore();
    console.warn("[vaultHolder] card image load failed:", err);
  }

  // ── Card window inner border ──
  ctx.strokeStyle = VAULT_PALETTE.goldMid;
  ctx.lineWidth = 2;
  roundedRect(ctx, layout.card.x, layout.card.y, layout.card.w, layout.card.h, layout.card.radius);
  ctx.stroke();

  // ── Top bar: state chip ──
  const tint = stateTint(input.state);
  const chip = layout.stateChip;
  ctx.fillStyle = `${tint}22`;
  roundedRect(ctx, chip.x, chip.y, chip.w, chip.h, chip.h / 2);
  ctx.fill();
  ctx.strokeStyle = tint;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = tint;
  ctx.font = `700 ${Math.round(chip.h * 0.42)}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(stateLabel(input.state), chip.x + chip.w / 2, chip.y + chip.h / 2);

  // Top-bar title (right side)
  ctx.fillStyle = VAULT_PALETTE.ink;
  ctx.font = `600 ${Math.round(size * 0.028)}px "Fredoka", system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "AUTHENTISEAL · VAULT HOLDER",
    layout.topBar.x + layout.topBar.w - Math.round(size * 0.025),
    layout.topBar.y + layout.topBar.h / 2,
  );

  // ── Bottom bar: grade plate + cert caption + medallion ──
  // Grade plate
  const gb = layout.gradeBlock;
  const goldGrad = ctx.createLinearGradient(gb.x, gb.y, gb.x + gb.w, gb.y + gb.h);
  goldGrad.addColorStop(0, VAULT_PALETTE.goldFrom);
  goldGrad.addColorStop(1, VAULT_PALETTE.goldTo);
  ctx.fillStyle = goldGrad;
  roundedRect(ctx, gb.x, gb.y, gb.w, gb.h, Math.round(size * 0.012));
  ctx.fill();

  const { value, scale } = formatGrade(String(input.grader), input.grade);
  ctx.fillStyle = "#1a1410";
  ctx.font = `700 ${Math.round(gb.h * 0.6)}px "Fredoka", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(value, gb.x + Math.round(size * 0.02), gb.y + gb.h * 0.55);

  ctx.font = `600 ${Math.round(gb.h * 0.16)}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillText(scale, gb.x + Math.round(size * 0.02), gb.y + gb.h * 0.18);

  // Cert caption (between grade plate and medallion)
  ctx.fillStyle = VAULT_PALETTE.ink;
  ctx.font = `500 ${Math.round(size * 0.022)}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    formatCertLabel(String(input.grader), input.certNumber),
    gb.x + gb.w + Math.round(size * 0.025),
    layout.bottomBar.y + layout.bottomBar.h * 0.4,
  );
  ctx.fillStyle = VAULT_PALETTE.inkMuted;
  ctx.font = `400 ${Math.round(size * 0.016)}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillText(
    `SERIAL · ${input.serialNumber}`,
    gb.x + gb.w + Math.round(size * 0.025),
    layout.bottomBar.y + layout.bottomBar.h * 0.66,
  );

  // Medallion
  drawSealMedallion(ctx, layout.sealCenter.x, layout.sealCenter.y, layout.sealCenter.r, tint);

  return canvas.toDataURL("image/png");
}
