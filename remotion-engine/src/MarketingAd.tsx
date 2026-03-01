import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Video,
  Audio,
  staticFile,
} from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { RevealScene } from "./scenes/RevealScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { LifestyleScene } from "./scenes/LifestyleScene";
import { HeroScene } from "./scenes/HeroScene";
import { CTAScene } from "./scenes/CTAScene";

interface Scene {
  id: number;
  type: string;
  duration: number;
  description: string;
  assetUrl?: string;
  assetType?: "image" | "video";
}

interface MarketingAdProps {
  scenes: Scene[];
  style: "apple" | "nike" | "tech" | "luxury" | "social" | "corporate";
  product: string;
  tagline: string;
  headline?: string;
  ctaText?: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  musicUrl?: string;
}

// Style configurations
const STYLE_CONFIG = {
  apple: {
    background: "linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%)",
    textColor: "#1d1d1f",
    accentColor: "#0071e3",
    fontFamily: "SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif",
    animation: "smooth",
  },
  nike: {
    background: "linear-gradient(135deg, #111111 0%, #1a1a1a 100%)",
    textColor: "#ffffff",
    accentColor: "#ff5a00",
    fontFamily: "Futura, Helvetica Neue, sans-serif",
    animation: "dynamic",
  },
  tech: {
    background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)",
    textColor: "#ffffff",
    accentColor: "#00d4ff",
    fontFamily: "Inter, system-ui, sans-serif",
    animation: "modern",
  },
  luxury: {
    background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
    textColor: "#d4af37",
    accentColor: "#d4af37",
    fontFamily: "Playfair Display, Georgia, serif",
    animation: "elegant",
  },
  social: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textColor: "#ffffff",
    accentColor: "#ffd700",
    fontFamily: "Poppins, sans-serif",
    animation: "energetic",
  },
  corporate: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)",
    textColor: "#ffffff",
    accentColor: "#48bb78",
    fontFamily: "Roboto, Arial, sans-serif",
    animation: "professional",
  },
};

// Scene component map
const SCENE_COMPONENTS: Record<string, React.FC<any>> = {
  intro: IntroScene,
  reveal: RevealScene,
  features: FeatureScene,
  feature: FeatureScene,
  lifestyle: LifestyleScene,
  hero: HeroScene,
  cta: CTAScene,
  hook: IntroScene,
  problem: FeatureScene,
  solution: RevealScene,
  demo: FeatureScene,
  benefits: FeatureScene,
  social: LifestyleScene,
  contact: CTAScene,
  athlete: LifestyleScene,
  struggle: FeatureScene,
  triumph: HeroScene,
  product: RevealScene,
  ambiance: IntroScene,
  craftsmanship: FeatureScene,
  brand: CTAScene,
  values: FeatureScene,
  team: LifestyleScene,
  services: FeatureScene,
  results: HeroScene,
  content1: FeatureScene,
  content2: FeatureScene,
  content3: FeatureScene,
};

// Animated background
const AnimatedBackground: React.FC<{
  style: string;
  frame: number;
  fps: number;
}> = ({ style, frame, fps }) => {
  const config = STYLE_CONFIG[style as keyof typeof STYLE_CONFIG];
  
  // Subtle movement
  const moveX = Math.sin(frame / fps * 0.5) * 20;
  const moveY = Math.cos(frame / fps * 0.3) * 15;
  
  return (
    <AbsoluteFill style={{ background: config.background }}>
      {/* Animated gradient orbs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.accentColor}20 0%, transparent 70%)`,
          top: -100 + moveY,
          left: -100 + moveX,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${config.accentColor}15 0%, transparent 70%)`,
          bottom: -150 - moveY,
          right: -100 - moveX,
          filter: "blur(80px)",
        }}
      />
    </AbsoluteFill>
  );
};

export const MarketingAd: React.FC<MarketingAdProps> = ({
  scenes,
  style,
  product,
  tagline,
  headline,
  ctaText,
  primaryColor,
  secondaryColor,
  logoUrl,
  musicUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const config = STYLE_CONFIG[style];

  // Calculate scene frames
  let currentFrame = 0;
  const sceneFrames = scenes.map((scene) => {
    const start = currentFrame;
    const duration = scene.duration * fps;
    currentFrame += duration;
    return { ...scene, startFrame: start, durationFrames: duration };
  });

  // If no scenes provided, render demo content
  if (scenes.length === 0) {
    return (
      <AbsoluteFill style={{ background: config.background }}>
        <AnimatedBackground style={style} frame={frame} fps={fps} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: config.fontFamily,
            color: config.textColor,
          }}
        >
          <h1
            style={{
              fontSize: 72,
              fontWeight: 700,
              margin: 0,
              opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(frame, [0, 30], [50, 0], { extrapolateRight: "clamp" })}px)`,
            }}
          >
            {product}
          </h1>
          <p
            style={{
              fontSize: 32,
              marginTop: 20,
              color: config.accentColor,
              opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            {tagline}
          </p>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      {/* Background music */}
      {musicUrl && <Audio src={musicUrl} volume={0.3} />}

      {/* Animated background layer */}
      <AnimatedBackground style={style} frame={frame} fps={fps} />

      {/* Scene sequences */}
      {sceneFrames.map((scene, index) => {
        const SceneComponent = SCENE_COMPONENTS[scene.type] || FeatureScene;
        const overlap = index > 0 ? Math.min(12, scene.durationFrames * 0.1) : 0;
        
        return (
          <Sequence
            key={scene.id}
            from={Math.max(0, scene.startFrame - overlap)}
            durationInFrames={scene.durationFrames + overlap}
          >
            <SceneComponent
              description={scene.description}
              assetUrl={scene.assetUrl}
              assetType={scene.assetType}
              product={product}
              style={style}
              config={config}
              isFirst={index === 0}
              isLast={index === sceneFrames.length - 1}
              tagline={tagline}
              headline={headline}
              ctaText={ctaText}
              logoUrl={logoUrl}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
