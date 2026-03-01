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

interface FeatureSceneProps {
  description: string;
  assetUrl?: string;
  assetType?: "image" | "video";
  product: string;
  style: string;
  config: any;
  isFirst: boolean;
  isLast: boolean;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  description,
  assetUrl,
  assetType,
  product,
  style,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slide in from right
  const slideProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 20,
    config: { damping: 18, stiffness: 90 },
  });

  const slideX = interpolate(slideProgress, [0, 1], [200, 0]);
  const opacity = slideProgress;

  // Exit slide
  const exitX = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [0, -200],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Feature card animations
  const cardY = interpolate(slideProgress, [0, 1], [50, 0]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 100,
        opacity: exitOpacity,
        transform: `translateX(${exitX}px)`,
      }}
    >
      {/* Left side - Text content */}
      <div
        style={{
          flex: 1,
          paddingRight: 80,
          transform: `translateX(${slideX}px)`,
          opacity,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "8px 20px",
            background: config.accentColor,
            borderRadius: 20,
            color: style === "apple" ? "#fff" : "#000",
            fontFamily: config.fontFamily,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1,
            marginBottom: 30,
            opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          FEATURE
        </div>

        <h2
          style={{
            fontFamily: config.fontFamily,
            fontSize: 64,
            fontWeight: 700,
            color: config.textColor,
            margin: 0,
            lineHeight: 1.1,
            transform: `translateY(${cardY}px)`,
          }}
        >
          {description.split(" ").slice(0, 4).join(" ")}
        </h2>

        <p
          style={{
            fontFamily: config.fontFamily,
            fontSize: 24,
            color: config.textColor,
            opacity: 0.7,
            marginTop: 30,
            lineHeight: 1.6,
            opacity: interpolate(frame, [20, 40], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {description}
        </p>
      </div>

      {/* Right side - Asset */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateX(${slideX * 1.5}px)`,
          opacity,
        }}
      >
        <div
          style={{
            width: "90%",
            aspectRatio: "4/3",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 40px 80px rgba(0,0,0,0.25)",
            transform: `perspective(1000px) rotateY(${interpolate(slideProgress, [0, 1], [-15, 0])}deg)`,
          }}
        >
          {assetUrl ? (
            assetType === "video" ? (
              <Video src={assetUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Img src={assetUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: `linear-gradient(135deg, ${config.accentColor}30 0%, ${config.accentColor}10 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
              }}
            >
              🚀
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
