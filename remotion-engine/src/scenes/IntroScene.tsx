import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Video,
} from "remotion";

interface IntroSceneProps {
  description: string;
  assetUrl?: string;
  assetType?: "image" | "video";
  product: string;
  style: string;
  config: any;
  isFirst: boolean;
  isLast: boolean;
  tagline?: string;
  logoUrl?: string;
  headline?: string;
}

export const IntroScene: React.FC<IntroSceneProps> = ({
  description,
  assetUrl,
  assetType,
  product,
  style,
  config,
  isFirst,
  tagline,
  logoUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrance animation
  const enterProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 20,
    config: { damping: 15, stiffness: 100 },
  });

  // Exit animation
  const exitProgress = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scale and opacity
  const scale = interpolate(enterProgress, [0, 1], [0.9, 1]) * interpolate(exitProgress, [0, 1], [1, 1.1]);
  const opacity = enterProgress * (1 - exitProgress);

  // Text reveal
  const textY = interpolate(enterProgress, [0, 1], [80, 0]);
  const textOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      {/* Logo */}
      {logoUrl && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 80,
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <Img src={logoUrl} style={{ height: 50 }} />
        </div>
      )}

      {/* Asset (image/video) */}
      {assetUrl && (
        <div
          style={{
            position: "relative",
            width: "60%",
            aspectRatio: "16/9",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 40px 80px rgba(0,0,0,0.3)",
            transform: `translateY(${interpolate(enterProgress, [0, 1], [100, 0])}px)`,
          }}
        >
          {assetType === "video" ? (
            <Video src={assetUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Img src={assetUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
      )}

      {/* Title */}
      <h1
        style={{
          fontFamily: config.fontFamily,
          fontSize: 96,
          fontWeight: 700,
          color: config.textColor,
          margin: 0,
          marginTop: assetUrl ? 60 : 0,
          textAlign: "center",
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
          letterSpacing: style === "luxury" ? 8 : -2,
        }}
      >
        {product}
      </h1>

      {/* Tagline */}
      {tagline && (
        <p
          style={{
            fontFamily: config.fontFamily,
            fontSize: 36,
            color: config.accentColor,
            marginTop: 20,
            textAlign: "center",
            opacity: interpolate(frame, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [25, 45], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}
        >
          {tagline}
        </p>
      )}

      {/* Decorative accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          width: interpolate(frame, [30, 60], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          height: 4,
          background: config.accentColor,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};
