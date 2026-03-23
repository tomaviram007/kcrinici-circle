import { useEffect, useState, useRef } from "react";
import { Gift, Send, X, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBirthdaysToday, BirthdayMember } from "@/hooks/useBirthdaysToday";
import { useAuth } from "@/contexts/AuthContext";
import { fireConfetti } from "@/lib/confetti";
import gsap from "gsap";

const BirthdayPopup = () => {
  const { user, isApproved } = useAuth();
  const { birthdays, loading } = useBirthdaysToday();
  const [dismissed, setDismissed] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || birthdays.length === 0 || !user || !isApproved) return;

    // Check if already dismissed today
    const today = new Date().toDateString();
    const lastDismissed = sessionStorage.getItem("birthday_popup_dismissed");
    if (lastDismissed === today) {
      setDismissed(true);
      return;
    }

    // Animate in
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.8, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)", delay: 0.8 }
      );
    }
    if (overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.7 });
    }

    // Fire confetti after modal appears
    setTimeout(() => fireConfetti(), 1200);
  }, [loading, birthdays, user, isApproved]);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    sessionStorage.setItem("birthday_popup_dismissed", today);

    if (modalRef.current && overlayRef.current) {
      gsap.to(modalRef.current, { scale: 0.9, opacity: 0, y: 20, duration: 0.3, ease: "power2.in" });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        delay: 0.1,
        onComplete: () => setDismissed(true),
      });
    } else {
      setDismissed(true);
    }
  };

  const handleWhatsApp = (person: BirthdayMember) => {
    const cleanPhone = person.phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const msg = encodeURIComponent(
      `מזל טוב ${person.full_name}! ראיתי בקהילת הגברים של קרניצי שיש לך יום הולדת היום. המון בריאות ואושר!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  if (loading || dismissed || birthdays.length === 0 || !user || !isApproved) return null;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm opacity-0"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        dir="rtl"
        className="fixed left-1/2 top-1/2 z-[101] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gold/30 bg-card/95 backdrop-blur-xl p-6 sm:p-8 shadow-[0_0_60px_hsl(43_72%_52%/0.15)] opacity-0"
      >
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute left-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 border border-gold/30">
            <PartyPopper className="h-8 w-8 text-gold" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            🎉 יום הולדת <span className="text-gold">במועדון</span>!
          </h2>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            {birthdays.length === 1 ? "חבר מועדון חוגג היום!" : `${birthdays.length} חברי מועדון חוגגים היום!`}
          </p>
        </div>

        {/* Birthday list */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          {birthdays.map((person) => (
            <div
              key={person.user_id}
              className="flex items-center gap-3 rounded-xl border border-gold/20 bg-secondary/50 p-3 transition-colors hover:border-gold/40"
            >
              <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gold/10 border border-gold/20 overflow-hidden flex items-center justify-center">
                {person.avatar_url ? (
                  <img src={person.avatar_url} alt={person.full_name} className="h-full w-full object-cover" />
                ) : (
                  <Gift className="h-5 w-5 text-gold" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm font-bold text-foreground truncate">{person.full_name}</p>
                <p className="font-body text-xs text-muted-foreground">{person.profession}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWhatsApp(person)}
                className="border-gold/30 text-gold hover:bg-gold/10 font-body gap-1 flex-shrink-0 text-xs"
              >
                <Send className="h-3 w-3" />
                ברכה
              </Button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 text-center">
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="font-body text-sm text-muted-foreground"
          >
            סגור
          </Button>
        </div>
      </div>
    </>
  );
};

export default BirthdayPopup;
