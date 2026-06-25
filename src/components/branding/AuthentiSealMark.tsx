import React from "react";
import { cn } from "@/lib/utils";

export type SealState = "verified" | "linked" | "attested" | "mismatch";

interface AuthentiSealMarkProps {
  /** Pixel size of the medallion (square). */
  size?: number;
  /** Tints the central shield. */
  state?: SealState;
  /** Optional className for layout/animation overrides. */
  className?: string;
  /** Top-arc text. Defaults to "AuthentiSeal". */
  topText?: string;
  /** Bottom-arc text. Defaults to "Verified provenance · on-chain". */
  bottomText?: string;
  /** Accessible label. */
  ariaLabel?: string;
}

/**
 * Circular AuthentiSeal medallion. All colors are sourced from CSS variables,
 * so the seal auto-themes across light/dark/seeker themes.
 *
 *  - Gold engraved rim + milled coin edge        -> hsl(var(--primary)) + --gradient-gold
 *  - Inner shield                                -> tinted by `state`
 *  - Wordmark                                    -> Fredoka (matches global heading font)
 */
export function AuthentiSealMark({
  size = 160,
  state = "verified",
  className,
  topText = "AuthentiSeal",
  bottomText = "Verified provenance · on-chain",
  ariaLabel,
}: AuthentiSealMarkProps) {
  // Stable per-instance ids so multiple seals on the same page don't collide.
  const uid = React.useId().replace(/:/g, "");
  const ids = {
    goldRim: `asm-gold-${uid}`,
    goldEngrave: `asm-engrave-${uid}`,
    shield: `asm-shield-${uid}`,
    topArc: `asm-arc-top-${uid}`,
    bottomArc: `asm-arc-bot-${uid}`,
    innerShadow: `asm-shadow-${uid}`,
  };

  // Shield tint per state, all token-driven.
  const shieldVar: Record<SealState, string> = {
    verified: "var(--success, var(--secondary))",
    linked: "var(--secondary)",
    attested: "var(--muted-foreground)",
    mismatch: "var(--destructive)",
  };
  const shieldFill = `hsl(${shieldVar[state]})`;

  // ViewBox is a 200x200 square; everything is geometry inside it.
  const VB = 200;
  const cx = VB / 2;
  const cy = VB / 2;

  // Radii (concentric rings).
  const rOuter = 96;        // outer edge
  const rMill = 92;         // milled coin edge
  const rRimOuter = 86;     // gold rim outer
  const rRimInner = 70;     // gold rim inner
  const rRivet = 64;        // rivet ring radius
  const rField = 60;        // central field

  // Arc paths for the curved text. Top arc travels left->right across the top;
  // bottom arc is drawn flipped so text reads upright along the bottom.
  const rTextTop = 78;
  const rTextBot = 78;
  const topArcPath =
    `M ${cx - rTextTop},${cy} ` +
    `A ${rTextTop},${rTextTop} 0 0 1 ${cx + rTextTop},${cy}`;
  const bottomArcPath =
    `M ${cx - rTextBot},${cy} ` +
    `A ${rTextBot},${rTextBot} 0 0 0 ${cx + rTextBot},${cy}`;

  // Build the milled "coin edge" as a ring of short ticks.
  const tickCount = 96;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const a = (i / tickCount) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * rMill;
    const y1 = cy + Math.sin(a) * rMill;
    const x2 = cx + Math.cos(a) * (rMill + 4);
    const y2 = cy + Math.sin(a) * (rMill + 4);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
  });

  // Rivet ring — small dots between rim and field.
  const rivetCount = 24;
  const rivets = Array.from({ length: rivetCount }, (_, i) => {
    const a = (i / rivetCount) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rRivet;
    const y = cy + Math.sin(a) * rRivet;
    return <circle key={i} cx={x} cy={y} r={1.1} />;
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      role="img"
      aria-label={ariaLabel ?? `${topText} — ${state}`}
      className={cn("block", className)}
    >
      <defs>
        {/* Gold radial for the rim face */}
        <radialGradient id={ids.goldRim} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
          <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
        </radialGradient>

        {/* Linear gold for engraved text — mirrors --gradient-gold */}
        <linearGradient id={ids.goldEngrave} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.55)" />
        </linearGradient>

        {/* Shield gradient — tinted by state */}
        <linearGradient id={ids.shield} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={shieldFill} stopOpacity="1" />
          <stop offset="100%" stopColor={shieldFill} stopOpacity="0.75" />
        </linearGradient>

        {/* Soft inner shadow for depth on the central field */}
        <radialGradient id={ids.innerShadow} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="hsl(var(--background))" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.18" />
        </radialGradient>

        {/* Invisible arc paths used as textPath anchors */}
        <path id={ids.topArc} d={topArcPath} fill="none" />
        <path id={ids.bottomArc} d={bottomArcPath} fill="none" />
      </defs>

      {/* Outer ring shadow */}
      <circle
        cx={cx}
        cy={cy}
        r={rOuter}
        fill="hsl(var(--background))"
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />

      {/* Milled coin edge */}
      <g stroke="hsl(var(--primary))" strokeWidth={1} opacity={0.55}>
        {ticks}
      </g>

      {/* Gold engraved rim */}
      <circle cx={cx} cy={cy} r={rRimOuter} fill={`url(#${ids.goldRim})`} />
      <circle
        cx={cx}
        cy={cy}
        r={rRimOuter}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeOpacity={0.9}
        strokeWidth={1}
      />
      <circle
        cx={cx}
        cy={cy}
        r={rRimInner}
        fill="hsl(var(--card))"
        stroke="hsl(var(--primary))"
        strokeOpacity={0.85}
        strokeWidth={1.25}
      />

      {/* Engraved top arc text */}
      <text
        fill={`url(#${ids.goldEngrave})`}
        style={{
          fontFamily: "Fredoka, sans-serif",
          fontWeight: 600,
          letterSpacing: "0.18em",
        }}
        fontSize={11}
      >
        <textPath href={`#${ids.topArc}`} startOffset="50%" textAnchor="middle">
          {topText.toUpperCase()}
        </textPath>
      </text>

      {/* Engraved bottom arc text */}
      <text
        fill="hsl(var(--primary))"
        fillOpacity={0.85}
        style={{
          fontFamily: "Fredoka, sans-serif",
          fontWeight: 500,
          letterSpacing: "0.14em",
        }}
        fontSize={7.5}
      >
        <textPath
          href={`#${ids.bottomArc}`}
          startOffset="50%"
          textAnchor="middle"
        >
          {bottomText.toUpperCase()}
        </textPath>
      </text>

      {/* Rivet ring */}
      <g fill="hsl(var(--primary))" opacity={0.75}>
        {rivets}
      </g>

      {/* Central field */}
      <circle cx={cx} cy={cy} r={rField} fill="hsl(var(--card))" />
      <circle cx={cx} cy={cy} r={rField} fill={`url(#${ids.innerShadow})`} />

      {/* Shield with checkmark — state-tinted */}
      <g transform={`translate(${cx}, ${cy})`}>
        <path
          d="M 0,-30 L 26,-20 L 26,6 C 26,22 14,32 0,38 C -14,32 -26,22 -26,6 L -26,-20 Z"
          fill={`url(#${ids.shield})`}
          stroke="hsl(var(--primary))"
          strokeOpacity={0.6}
          strokeWidth={1.25}
        />
        <path
          d="M -11,2 L -2,11 L 13,-7"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export default AuthentiSealMark;
