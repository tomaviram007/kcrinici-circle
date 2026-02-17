import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/landing/HeroSection";
import SalesPreviewSection from "@/components/landing/SalesPreviewSection";
import EventsPreviewSection from "@/components/landing/EventsPreviewSection";
import JobsPreviewSection from "@/components/landing/JobsPreviewSection";
import BirthdaysPreviewSection from "@/components/landing/BirthdaysPreviewSection";
import QuoteSection from "@/components/landing/QuoteSection";
import CTASection from "@/components/landing/CTASection";
import PollPopup from "@/components/PollPopup";

const Index = () => {
  const [isApproved, setIsApproved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  return (
    <main className="min-h-screen bg-background">
      <HeroSection isLoggedIn={isLoggedIn} isApproved={isApproved} />
      <SalesPreviewSection isApproved={isApproved} />
      <EventsPreviewSection isApproved={isApproved} />
      <JobsPreviewSection isApproved={isApproved} />
      <BirthdaysPreviewSection isApproved={isApproved} />
      <QuoteSection />
      {!isLoggedIn && <CTASection />}
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
