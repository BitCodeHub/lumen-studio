import { Composition } from "remotion";
import { MarketingAd } from "./MarketingAd";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MarketingAd"
        component={MarketingAd}
        durationInFrames={720} // 30 seconds at 24fps
        fps={24}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: [],
          style: "apple",
          product: "Product",
          tagline: "Your tagline here",
          primaryColor: "#22c55e",
          secondaryColor: "#0d0d0d",
        }}
      />
      <Composition
        id="MarketingAd15s"
        component={MarketingAd}
        durationInFrames={360}
        fps={24}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [],
          style: "social",
          product: "Product",
          tagline: "Your tagline here",
          primaryColor: "#22c55e",
          secondaryColor: "#0d0d0d",
        }}
      />
      <Composition
        id="MarketingAd60s"
        component={MarketingAd}
        durationInFrames={1440}
        fps={24}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: [],
          style: "tech",
          product: "Product",
          tagline: "Your tagline here",
          primaryColor: "#22c55e",
          secondaryColor: "#0d0d0d",
        }}
      />
    </>
  );
};
