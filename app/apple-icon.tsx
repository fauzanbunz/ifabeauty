import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #be185d 0%, #831843 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          IFA
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "3px",
            marginTop: 8,
            color: "#fbcfe8",
          }}
        >
          MEDICAL
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
