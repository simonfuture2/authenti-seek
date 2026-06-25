/**
 * Smoke test for the Vault Holder renderer.
 *
 * No test runner is installed in this project yet, so this file exposes a
 * single async function that can be invoked from the browser DevTools to
 * verify the renderer end-to-end against sample inputs.
 *
 * From the running app:
 *
 *   import("@/lib/nft/vaultHolder.smoke").then((m) => m.runVaultHolderSmokeTest());
 *
 * It will:
 *   1. Run layout/format unit checks on the pure helpers (throws on failure).
 *   2. Render four sample holders (one per SealState) with a tiny inline
 *      PNG as the card image, and open each in a new tab.
 */

import {
  computeVaultLayout,
  formatCertLabel,
  formatGrade,
  stateLabel,
  stateTint,
  VAULT_PALETTE,
  type VaultHolderInput,
} from "./vaultHolderLayout";
import { renderVaultHolder } from "./vaultHolder";

// 1×1 transparent PNG — used so the renderer has SOMETHING to draw without
// a network round-trip when smoke-testing offline.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`vaultHolder smoke test failed: ${msg}`);
}

function runPureChecks() {
  // formatGrade
  assert(formatGrade("PSA", 10).value === "10", "grade 10 numeric");
  assert(formatGrade("PSA", 10).scale === "PSA", "grade scale = PSA");
  assert(formatGrade("PSA", "Gem Mint 10").value === "10", "grade strips text prefix");
  assert(formatGrade("PSA", null).value === "—", "null grade -> em dash");
  assert(formatGrade("NONE", null).scale === "UNGRADED", "no grade -> UNGRADED");
  assert(formatGrade("BGS", 9.5).value === "9.5", "decimal grade preserved");

  // formatCertLabel
  assert(formatCertLabel("PSA", "12345678") === "PSA · 12345678", "cert label");
  assert(formatCertLabel("NONE", null) === "ISSUER ATTESTED", "raw card label");
  assert(formatCertLabel("TAG", "") === "ISSUER ATTESTED", "empty cert -> attested");

  // stateLabel + stateTint
  assert(stateLabel("verified") === "VERIFIED", "state label verified");
  assert(stateLabel("mismatch") === "MISMATCH", "state label mismatch");
  assert(stateTint("verified") === VAULT_PALETTE.state.verified, "tint matches palette");

  // Layout — relative positions and containment
  const L = computeVaultLayout(1024);
  assert(L.size === 1024, "layout size echoed");
  assert(L.card.x + L.card.w <= L.frame.x + L.frame.w, "card horizontally inside frame");
  assert(L.card.y + L.card.h <= L.bottomBar.y, "card sits above bottom bar");
  assert(L.card.y >= L.topBar.y + L.topBar.h, "card sits below top bar");
  assert(L.sealCenter.x + L.sealCenter.r <= L.frame.x + L.frame.w, "medallion fits horizontally");
  assert(
    L.sealCenter.y + L.sealCenter.r <= L.bottomBar.y + L.bottomBar.h,
    "medallion fits vertically inside bottom bar",
  );
  // 5:7 portrait card aspect (within 1px of rounding)
  const ratio = L.card.w / L.card.h;
  assert(Math.abs(ratio - 5 / 7) < 0.01, `card aspect ~5:7 (got ${ratio.toFixed(3)})`);

  // Scaling sanity — halving size halves the card box
  const L2 = computeVaultLayout(512);
  assert(L2.card.w < L.card.w, "layout scales with size");

  // eslint-disable-next-line no-console
  console.info("[vaultHolder] ✓ pure helper checks passed");
}

export const SAMPLE_INPUTS: VaultHolderInput[] = [
  {
    cardImageUrl: TINY_PNG,
    grader: "PSA",
    certNumber: "12345678",
    grade: 10,
    serialNumber: "AS-2026-000001",
    state: "verified",
  },
  {
    cardImageUrl: TINY_PNG,
    grader: "TAG",
    certNumber: "A1234567",
    grade: "9.0",
    serialNumber: "AS-2026-000002",
    state: "linked",
  },
  {
    cardImageUrl: TINY_PNG,
    grader: "NONE",
    certNumber: null,
    grade: null,
    serialNumber: "AS-2026-000003",
    state: "attested",
  },
  {
    cardImageUrl: TINY_PNG,
    grader: "BGS",
    certNumber: "0099887766",
    grade: 9.5,
    serialNumber: "AS-2026-000004",
    state: "mismatch",
  },
];

export async function runVaultHolderSmokeTest({ openTabs = true } = {}) {
  runPureChecks();

  const results = await Promise.all(
    SAMPLE_INPUTS.map(async (input) => {
      const dataUrl = await renderVaultHolder(input);
      // eslint-disable-next-line no-console
      console.info(
        `[vaultHolder] ✓ rendered ${input.state.padEnd(8)} (${input.grader} ${input.certNumber ?? "—"})`,
        dataUrl.slice(0, 32) + "…",
      );
      if (openTabs && typeof window !== "undefined") {
        const w = window.open();
        if (w) {
          w.document.title = `Vault Holder · ${input.state}`;
          w.document.body.style.cssText = "margin:0;background:#0a0a0a;display:grid;place-items:center;min-height:100vh";
          const img = w.document.createElement("img");
          img.src = dataUrl;
          img.style.cssText = "max-width:90vw;max-height:90vh;box-shadow:0 20px 60px rgba(0,0,0,.6)";
          w.document.body.appendChild(img);
        }
      }
      return { state: input.state, dataUrl };
    }),
  );

  // eslint-disable-next-line no-console
  console.info("[vaultHolder] ✓ all 4 sample renders complete");
  return results;
}
