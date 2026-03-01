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

interface LifestyleSceneProps {
  description: string;
  assetUrl?: string;
  assetType?: "image" | "video";
  product: string;
  style: string;
  config: any;
  isFirst: boolean;
  isLast: boolean;
}

export const LifestyleScene: React.FC<LifestyleSceneProps> = ({
  description,
  assetUrl,
  assetType,
  style,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Ken Burns effect - slow zoom
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.15]);
  const panX = interpolate(frame, [0, durationInFrames], [0, -30]);
  const panY = interpolate(frame, [0, durationInFrames], [0, -20]);

  // Vignette opacity
  const vignetteOpacity = interpolate(frame, [0, 30], [0.8, 0.4], { extrapolateRight: "clamp" });

  // Text overlay
  const textOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(frame, [20, 40], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Exit
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      {/* Full-bleed background image/video with Ken Burns */}
      <div
        style={{
          position: "absolute",
          inset: -50, // Extra space for pan
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
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
              background: `linear-gradient(45deg, ${config.accentColor}40 0%, transparent 100%)`,
            }}
          />
        )}
      </div>

      {/* Cinematic vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        }}
      />

      {/* Bottom gradient for text */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "40%",
          background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
        }}
      />

      {/* Description text overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 80,
          right: 80,
          fontFamily: config.fontFamily,
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        <p
          style={{
            fontSize: 36,
            color: "#ffffff",
            margin: 0,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            fontWeight: style === "nike" ? 700 : 400,
            fontStyle: style === "luxury" ? "italic" : "normal",
          }}
        >
          {description}
        </p>
      </div>

      {/* Subtle animated particles (luxury/apple styles) */}
      {(style === "luxury" || style === "apple") && (
        <>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: config.accentColor,
                opacity: 0.3,
                top: `${20 + i * 15}%`,
                left: `${10 + i * 20}%`,
                transform: `translateY(${Math.sin((frame + i * 20) / 15) * 30}px)`,
              }}
            />
          ))}
        </>
      )}
    </AbsoluteFill>
  );
};
