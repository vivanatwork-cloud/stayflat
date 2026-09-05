import { ImageResponse } from "next/og";

export const alt = "StayFlat — Master the trader, not the trade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ece6d9", color: "#23201a", padding: "72px 84px", fontFamily: "Georgia, serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#1c4a44", fontFamily: "Arial, sans-serif", fontSize: 30, fontWeight: 700 }}>
        <svg width="76" height="32" viewBox="0 0 76 32"><path d="M0 21 L10 21 L16 7 L22 27 L29 12 L36 19 L43 16 L76 16" fill="none" stroke="#1c4a44" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /></svg>
        StayFlat
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ maxWidth: 950, fontSize: 84, lineHeight: 0.98, letterSpacing: -3 }}>Master the trader, not the trade.</div>
        <div style={{ color: "#6b6459", fontFamily: "Arial, sans-serif", fontSize: 28 }}>Find the pattern. Build the rule that stops it.</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#1c4a44", fontFamily: "monospace", fontSize: 18 }}>
        LOSS · 01:08 <span style={{ width: 150, height: 2, background: "#1c4a44" }} /> NEXT FILL · 01:12 <span style={{ width: 150, height: 2, background: "#1c4a44" }} /> SIZE ↑ 2.8×
      </div>
    </div>,
    size,
  );
}
