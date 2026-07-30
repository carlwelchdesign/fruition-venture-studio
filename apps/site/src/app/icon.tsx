import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0f12",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 38,
            height: 44,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 4,
              width: 30,
              height: 3,
              background: "#f5f6f7",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 12,
              width: 3,
              height: 44,
              background: "#f5f6f7",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 12,
              width: 23,
              height: 3,
              background: "#f5f6f7",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 31,
              left: 12,
              width: 18,
              height: 3,
              background: "#d4af37",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
