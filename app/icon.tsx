import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * App favicon — coral square with white "P" + coral dot.
 * Replaces the static favicon.ico via Next.js's icon convention.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FE6F5E",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: -1,
        }}
      >
        P
      </div>
    ),
    { ...size },
  );
}
