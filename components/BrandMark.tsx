import { memo } from "react";

interface BrandMarkProps {
  /** Rendered width/height in px. The mark is a square, viewBox 0-64. */
  size?: number;
  className?: string;
  /**
   * Renders just the two-facet glyph with no rounded-square badge behind
   * it, filled with `currentColor` so it inherits whatever text color the
   * parent sets - used inline next to text (navbar, footer) where a solid
   * badge would be too heavy. Default (false) renders the full badge, used
   * for anything that needs to stand alone (empty-state hero, avatars,
   * favicon).
   */
  glyphOnly?: boolean;
}

/**
 * The ReasonVest brand mark: an asymmetric faceted gem, leaning up and to
 * the right rather than a static symmetric diamond, so it reads as "cut
 * value" (the gem) *and* "ascent" (the lean) at once - a deliberate
 * alternative to the two clichés this space defaults to (a bar-chart glyph
 * for finance, a four-point sparkle for AI). The badge fill and the
 * composer's send button intentionally share the same --brand-500 value,
 * so the mark and the primary action always read as one color.
 */
function BrandMark({ size = 40, className = "", glyphOnly = false }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {!glyphOnly && <rect width="64" height="64" rx="18" fill="var(--brand-500)" />}
      <polygon
        points="38,14 24,18 16,30 28,50"
        fill={glyphOnly ? "currentColor" : "var(--brand-ink)"}
        opacity={glyphOnly ? 1 : undefined}
      />
      <polygon
        points="38,14 48,26 42,50 28,50"
        fill={glyphOnly ? "currentColor" : "#DCCFFF"}
        opacity={glyphOnly ? 0.75 : undefined}
      />
    </svg>
  );
}

export default memo(BrandMark);
