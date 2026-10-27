import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BarbersSection } from "@/features/landing/sections/BarbersSection";
import { HeroSection } from "@/features/landing/sections/HeroSection";
import { ReviewsSection } from "@/features/landing/sections/ReviewsSection";
import { ServicesSection } from "@/features/landing/sections/ServicesSection";

export const metadata = {
  title: "The Cut Barbershop — A Cut Above the Ordinary",
  description:
    "Thoughtful barbering, considered grooming, and a little time well spent at The Cut.",
};

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="home">
        <HeroSection />
        <ServicesSection />
        <BarbersSection />
        <ReviewsSection />
      </main>
      <SiteFooter />
    </>
  );
}
