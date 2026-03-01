import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";

interface CTASceneProps {
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
  ctaText?: string;
  headline?: string;
}

export const CTAScene: React.FC<CTASceneProps> = ({
  product,
  style,
  config,
  tagline,
  logoUrl,
  ctaText,
  headline,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrance animations
  const logoProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 25,
    config: { damping: 15, stiffness: 100 },
  });

  const taglineProgress = spring({
    frame: Math.max(0, frame - 15),
    fps,
    from: 0,
    to: 1,
    durationInFrames: 25,
    config: { damping: 18, stiffness: 90 },
  });

  const ctaProgress = spring({
    frame: Math.max(0, frame - 30),
    fps,
    from: 0,
    to: 1,
    durationInFrames: 20,
    config: { damping: 12, stiffness: 120 },
  });

  // Pulsing CTA button
  const ctaPulse = 1 + Math.sin(frame / 8) * 0.03;

  // Final fade (gentle)
  const finalOpacity = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0.9],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: finalOpacity,
      }}
    >
      {/* Logo */}
      <div
        style={{
          marginBottom: 40,
          opacity: logoProgress,
          transform: `scale(${interpolate(logoProgress, [0, 1], [0.8, 1])})`,
        }}
      >
        {logoUrl ? (
          <Img src={logoUrl} style={{ height: 80 }} />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: config.accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
              color: style === "apple" ? "#fff" : "#000",
              fontFamily: config.fontFamily,
            }}
          >
            {product.charAt(0)}
          </div>
        )}
      </div>

      {/* Product name */}
      <h1
        style={{
          fontFamily: config.fontFamily,
          fontSize: 72,
          fontWeight: 700,
          color: config.textColor,
          margin: 0,
          textAlign: "center",
          opacity: logoProgress,
          transform: `translateY(${interpolate(logoProgress, [0, 1], [30, 0])}px)`,
          letterSpacing: style === "luxury" ? 6 : -1,
        }}
      >
        {product}
      </h1>

      {/* Tagline */}
      {tagline && (
        <p
          style={{
            fontFamily: config.fontFamily,
            fontSize: 32,
            color: config.textColor,
            opacity: taglineProgress * 0.7,
            marginTop: 20,
            textAlign: "center",
            transform: `translateY(${interpolate(taglineProgress, [0, 1], [20, 0])}px)`,
            fontStyle: style === "luxury" ? "italic" : "normal",
          }}
        >
          {tagline}
        </p>
      )}

      {/* CTA Button */}
      <div
        style={{
          marginTop: 50,
          padding: "20px 60px",
          background: config.accentColor,
          borderRadius: style === "apple" ? 30 : style === "corporate" ? 8 : 25,
          opacity: ctaProgress,
          transform: `scale(${ctaProgress * ctaPulse}) translateY(${interpolate(ctaProgress, [0, 1], [30, 0])}px)`,
          boxShadow: `0 10px 40px ${config.accentColor}50`,
        }}
      >
        <span
          style={{
            fontFamily: config.fontFamily,
            fontSize: 24,
            fontWeight: 600,
            color: style === "apple" || style === "social" ? "#ffffff" : "#000000",
            letterSpacing: 1,
          }}
        >
          {ctaText || (style === "social" ? "SHOP NOW" : style === "tech" ? "GET STARTED" : style === "nike" ? "JUST DO IT" : "LEARN MORE")}
        </span>
      </div>

      {/* Website/contact */}
      <p
        style={{
          position: "absolute",
          bottom: 60,
          fontFamily: config.fontFamily,
          fontSize: 18,
          color: config.textColor,
          opacity: interpolate(frame, [40, 55], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          letterSpacing: 2,
        }}
      >
        www.{product.toLowerCase().replace(/\s+/g, "")}.com
      </p>

      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: config.accentColor,
          transform: `scaleX(${interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
        }}
      />
    </AbsoluteFill>
  );
};
