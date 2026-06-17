import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useAuth } from "@/contexts/AuthContext";

gsap.registerPlugin(ScrollToPlugin);
import HeroSection from "@/components/landing/HeroSection";
import SalesPreviewSection from "@/components/landing/SalesPreviewSection";
import EventsPreviewSection from "@/components/landing/EventsPreviewSection";
import GalleryPreviewSection from "@/components/landing/GalleryPreviewSection";
import JobsPreviewSection from "@/components/landing/JobsPreviewSection";
import BirthdaysPreviewSection from "@/components/landing/BirthdaysPreviewSection";
import QuoteSection from "@/components/landing/QuoteSection";
import CTASection from "@/components/landing/CTASection";
import PollPopup from "@/components/PollPopup";
import ScrollReveal from "@/components/ScrollReveal";
import ClubAboutSection from "@/components/ClubAboutSection";
import SmartAdBanner from "@/components/ads/SmartAdBanner";
import ContentWithSidebarAds from "@/components/ads/ContentWithSidebarAds";

const Index = () => {
  const { user, isApproved } = useAuth();
  const location = useLocation();
  const isLoggedIn = Boolean(user);

  // Handle scroll-to-birthdays from navigation state
  useEffect(() => {
    if ((location.state as any)?.scrollToBirthdays) {
      const timer = setTimeout(() => {
        const el = document.getElementById("birthdays-section");
        if (el) {
          gsap.to(window, {
            scrollTo: { y: el, offsetY: 80 },
            duration: 1.5,
            ease: "power2.inOut",
            onComplete: () => {
              const cubes = el.querySelectorAll(".bday-cube");
              if (cubes.length) {
                gsap.fromTo(cubes,
                  { boxShadow: "0 0 0px hsl(43 72% 52% / 0)" },
                  { boxShadow: "0 0 25px hsl(43 72% 52% / 0.4)", duration: 0.6, stagger: 0.05, yoyo: true, repeat: 1, ease: "sine.inOut" }
                );
              }
            },
          });
        }
      }, 600);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  return (
    <main className="min-h-screen bg-background">
      <HeroSection isLoggedIn={isLoggedIn} isApproved={isApproved} />

      {/* Hero Ad Banner */}
      <div className="w-full px-5 sm:px-6 py-4">
        <SmartAdBanner placement="hero" targetPage="home" />
      </div>

      <ScrollReveal>
        <ClubAboutSection />
      </ScrollReveal>

      {/* Premium ad placement - below About section */}
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 py-4">
        <SmartAdBanner placement="premium" targetPage="home" slotIndex={0} />
      </div>

      {!isApproved && (
        <ScrollReveal>
          <CTASection isLoggedIn={isLoggedIn} />
        </ScrollReveal>
      )}

      <ScrollReveal>
        <BirthdaysPreviewSection isApproved={isApproved} />
      </ScrollReveal>

      <ContentWithSidebarAds targetPage="home">
        <div className="px-5 sm:px-6">
          <ScrollReveal>
            <SalesPreviewSection isApproved={isApproved} />
          </ScrollReveal>

          {/* Inline Ad Banner */}
          <div className="py-4">
            <SmartAdBanner placement="inline" targetPage="home" />
          </div>

          <ScrollReveal delay={0.05}>
            <EventsPreviewSection isApproved={isApproved} />
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <JobsPreviewSection isApproved={isApproved} />
          </ScrollReveal>
        </div>
      </ContentWithSidebarAds>

      <PollPopup />
    </main>
  );
};

export default Index;
