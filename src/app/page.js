import { SiteFrame } from "@/components/layout/SiteFrame";
import { primeSlotOverrides } from "@/lib/images/slot-overrides";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { BarbersSection } from "@/features/landing/sections/BarbersSection";
import { HeroSection } from "@/features/landing/sections/HeroSection";
import { ServicesSection } from "@/features/landing/sections/ServicesSection";
import { site } from "@/config/site";

export const metadata = {
  title: `${site.name} — A Cut Above the Ordinary`,
  description:
    "Thoughtful barbering, considered grooming, and a little time well spent at The Cut.",
};

export default async function Home() {
  await primeSlotOverrides();
  return (
    <SiteFrame mainId="home">
        <HeroSection />
        <ServicesSection />
        <BarbersSection />
        <CtaBanner />
        {/* TODO(Phase I): render <ReviewsSection /> again once real, approved reviews exist. */}
    </SiteFrame>
  );
}
