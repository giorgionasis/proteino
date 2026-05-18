import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch icon — full-bleed coral with white "Proteino" wordmark
 * + signature coral dot. Used when users add the site to their iOS home
 * screen, and as the 192/512 PWA icon via manifest.ts.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FE6F5E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 92,
          fontWeight: 900,
          letterSpacing: -4,
        }}
      >
        <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          P
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "white",
              marginBottom: 14,
            }}
          />
        </span>
      </div>
    ),
    { ...size },
  );
}
