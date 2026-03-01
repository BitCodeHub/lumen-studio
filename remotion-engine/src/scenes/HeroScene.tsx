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

interface HeroSceneProps {
  description: string;
  assetUrl?: string;
  assetType?: "image" | "video";
  product: string;
  style: string;
  config: any;
  isFirst: boolean;
  isLast: boolean;
}

export const HeroScene: React.FC<HeroSceneProps> = ({
  description,
  assetUrl,
  assetType,
  product,
  style,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Dramatic zoom in
  const zoomProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 30,
    config: { damping: 12, stiffness: 60 },
  });

  const scale = interpolate(zoomProgress, [0, 1], [1.3, 1]);

  // Light rays animation
  const rayRotation = frame * 0.5;
  const rayOpacity = 0.1 + Math.sin(frame / 10) * 0.05;

  // Product glow
  const glowIntensity = 0.5 + Math.sin(frame / 15) * 0.2;

  // Exit
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const exitScale = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 1.1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: exitOpacity,
      }}
    >
      {/* Dramatic light rays */}
      <div
        style={{
          position: "absolute",
          inset: -200,
          background: `conic-gradient(from ${rayRotation}deg at 50% 50%, transparent, ${config.accentColor}${Math.round(rayOpacity * 255).toString(16).padStart(2, '0')}, transparent, ${config.accentColor}${Math.round(rayOpacity * 255).toString(16).padStart(2, '0')}, transparent)`,
          transform: `scale(${exitScale})`,
        }}
      />

      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.accentColor}${Math.round(glowIntensity * 40).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Hero product */}
      <div
        style={{
          position: "relative",
          width: "50%",
          maxWidth: 700,
          aspectRatio: "1/1",
          transform: `scale(${scale * exitScale})`,
        }}
      >
        {/* Product shadow */}
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: "10%",
            right: "10%",
            height: 60,
            background: "rgba(0,0,0,0.3)",
            borderRadius: "50%",
            filter: "blur(30px)",
            transform: `scale(${0.8 + zoomProgress * 0.2})`,
          }}
        />

        {/* Product container */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 32,
            overflow: "hidden",
            boxShadow: `0 40px 100px ${config.accentColor}40, 0 0 100px ${config.accentColor}20`,
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
                background: `linear-gradient(135deg, ${config.accentColor}60 0%, ${config.accentColor}20 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 150,
              }}
            >
              ⭐
            </div>
          )}
        </div>
      </div>

      {/* Product name */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          fontFamily: config.fontFamily,
          fontSize: 48,
          fontWeight: 700,
          color: config.textColor,
          textAlign: "center",
          opacity: interpolate(frame, [25, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [25, 45], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}
      >
        {product}
      </div>
    </AbsoluteFill>
  );
};
