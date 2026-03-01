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

interface RevealSceneProps {
  description: string;
  assetUrl?: string;
  assetType?: "image" | "video";
  product: string;
  style: string;
  config: any;
  isFirst: boolean;
  isLast: boolean;
}

export const RevealScene: React.FC<RevealSceneProps> = ({
  description,
  assetUrl,
  assetType,
  product,
  style,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Reveal animation - circle wipe
  const revealProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 25,
    config: { damping: 20, stiffness: 80 },
  });

  // Rotation for 3D effect
  const rotation = interpolate(frame, [0, durationInFrames], [0, 360 * 0.5]);
  
  // Scale pulse
  const scalePulse = 1 + Math.sin(frame / fps * 2) * 0.02;

  // Exit
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
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
      {/* Circular reveal mask */}
      <div
        style={{
          position: "relative",
          width: "70%",
          aspectRatio: "1/1",
          maxWidth: 800,
          maxHeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Rotating ring */}
        <div
          style={{
            position: "absolute",
            inset: -20,
            border: `3px solid ${config.accentColor}`,
            borderRadius: "50%",
            transform: `rotate(${rotation}deg)`,
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -40,
            border: `2px solid ${config.accentColor}`,
            borderRadius: "50%",
            transform: `rotate(${-rotation * 0.5}deg)`,
            opacity: 0.15,
          }}
        />

        {/* Product image container */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 24,
            overflow: "hidden",
            transform: `scale(${revealProgress * scalePulse})`,
            boxShadow: `0 30px 60px ${config.accentColor}30`,
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
                background: `linear-gradient(135deg, ${config.accentColor}40 0%, ${config.accentColor}10 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
              }}
            >
              ✨
            </div>
          )}
        </div>
      </div>

      {/* Description text */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 80,
          right: 80,
          textAlign: "center",
          fontFamily: config.fontFamily,
          fontSize: 28,
          color: config.textColor,
          opacity: interpolate(frame, [20, 40], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {description}
      </div>
    </AbsoluteFill>
  );
};
