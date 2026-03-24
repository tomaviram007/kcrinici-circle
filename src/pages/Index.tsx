import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);
import HeroSection from "@/components/landing/HeroSection";
import SalesPreviewSection from "@/components/landing/SalesPreviewSection";
import EventsPreviewSection from "@/components/landing/EventsPreviewSection";
import JobsPreviewSection from "@/components/landing/JobsPreviewSection";
import BirthdaysPreviewSection from "@/components/landing/BirthdaysPreviewSection";
import QuoteSection from "@/components/landing/QuoteSection";
import CTASection from "@/components/landing/CTASection";
import PollPopup from "@/components/PollPopup";
import ScrollReveal from "@/components/ScrollReveal";
import ClubAboutSection from "@/components/ClubAboutSection";

const Index = () => {
  const [isApproved, setIsApproved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setIsLoggedIn(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile?.is_approved) setIsApproved(true);
    };
    check();
  }, []);

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
      // Clear state
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  return (
    <main className="min-h-screen bg-background">
      <HeroSection isLoggedIn={isLoggedIn} isApproved={isApproved} />

      <ScrollReveal>
        <ClubAboutSection />
      </ScrollReveal>

      <ScrollReveal>
        <BirthdaysPreviewSection isApproved={isApproved} />
      </ScrollReveal>
      
      <ScrollReveal>
        <SalesPreviewSection isApproved={isApproved} />
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <EventsPreviewSection isApproved={isApproved} />
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <JobsPreviewSection isApproved={isApproved} />
      </ScrollReveal>

      {!isApproved && (
        <ScrollReveal>
          <CTASection isLoggedIn={isLoggedIn} />
        </ScrollReveal>
      )}

      <PollPopup />

      <footer className="border-t border-border py-8 sm:py-12 text-center px-4">
        <p className="font-body text-xs sm:text-sm text-muted-foreground">
          © {new Date().getFullYear()} הגברים של ק. קריניצי — מועדון חברים אקסקלוסיבי
        </p>
      </footer>
    </main>
  );
};

export default Index;
