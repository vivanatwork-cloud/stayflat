type FlatlineMarkProps = { variant?: "brand" | "wide" | "portrait" };

export function FlatlineMark({ variant = "brand" }: FlatlineMarkProps) {
  const wide = variant === "wide";
  const portrait = variant === "portrait";
  const path = wide
    ? "M0 40 L34 22 L58 52 L86 12 L112 56 L142 16 L176 54 L210 26 L248 44 L292 20 L332 46 L372 30 L410 40 L452 34 L500 32 L580 32 L680 32 L800 32 L1000 32"
    : portrait
      ? "M12 176 L48 176 L67 109 L88 214 L110 140 L130 170 L151 155 L228 155"
      : "M0 16 L7 16 L11 5 L15 19 L19 9 L23 13 L27 11 L52 11";
  return <svg className={`flatline-mark flatline-mark-${variant}`} viewBox={wide ? "0 0 1000 64" : portrait ? "0 0 240 300" : "0 0 52 22"} preserveAspectRatio={wide ? "none" : "xMidYMid meet"} focusable="false" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth={wide ? 1.6 : portrait ? 2 : 1.8} strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
