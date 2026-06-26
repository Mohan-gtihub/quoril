import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Quoril — The productivity OS for deep work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Branded Open Graph card, rendered at the edge. System fonts only. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FBFBFA",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* top: wordmark + early-access pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 40,
              fontWeight: 700,
              color: "#16160F",
              letterSpacing: "-0.02em",
            }}
          >
            Quoril<span style={{ color: "#2B6BF5" }}>.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 600,
              color: "#FBFBFA",
              background: "#2B6BF5",
              padding: "8px 20px",
              borderRadius: 999,
              letterSpacing: "0.04em",
            }}
          >
            Early access
          </div>
        </div>

        {/* middle: headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#16160F",
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              maxWidth: 920,
            }}
          >
            The productivity OS for deep work.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 32,
              color: "#6B6A63",
              lineHeight: 1.35,
              maxWidth: 880,
            }}
          >
            Tasks, focus tracking, analytics & digital wellbeing — in one
            offline-first native app.
          </div>
        </div>

        {/* bottom: accent ramp + url */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {["#2B6BF5", "#10C49A", "#F5A623", "#3D3D3D"].map((c) => (
              <div
                key={c}
                style={{
                  width: 56,
                  height: 8,
                  borderRadius: 999,
                  background: c,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 26, color: "#9C9B92", fontWeight: 500 }}>
            quoril.in
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
