import { useState, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu, X, Cake, User } from "lucide-react";
import { useBirthdaysThisWeek } from "@/hooks/useBirthdaysThisWeek";
import { usePendingCount } from "@/hooks/usePendingCount";
import { useUnreadAnnouncements } from "@/hooks/useUnreadAnnouncements";
import { useSiteLogo } from "@/hooks/useSiteLogo";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

gsap.registerPlugin(ScrollToPlugin);

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isApproved, isAdmin, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const { birthdays } = useBirthdaysThisWeek();
  const { logoUrl, logoSize, logoText, logoPosition } = useSiteLogo();
  const pendingCount = usePendingCount();
  const { count: unreadCount } = useUnreadAnnouncements(user?.id ?? null);

  const handleLogout = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    navigate("/");
  };

  const scrollToBirthdays = useCallback(() => {
    const el = document.getElementById("birthdays-section");
    if (el) {
      gsap.to(window, {
        scrollTo: { y: el, offsetY: 80 },
        duration: 1.5,
        ease: "power2.inOut",
        onComplete: () => {
          // Pulse highlight on arrival
          const cubes = el.querySelectorAll(".bday-cube");
          if (cubes.length) {
            gsap.fromTo(
              cubes,
              { boxShadow: "0 0 0px hsl(43 72% 52% / 0)" },
              {
                boxShadow: "0 0 25px hsl(43 72% 52% / 0.4)",
                duration: 0.6,
                stagger: 0.05,
                yoyo: true,
                repeat: 1,
                ease: "sine.inOut",
              }
            );
          }
        },
      });
    }
  }, []);

  const handleBirthdayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      scrollToBirthdays();
    } else {
      navigate("/", { state: { scrollToBirthdays: true } });
    }
  };

  const canAccess = user && isApproved;
  const hasBirthdays = birthdays.length > 0;

  const navLinks = [
    { to: "/", label: "דף הבית", protected: false },
    { to: "/announcements", label: "לוח מודעות", protected: false },
    { to: "/jobs", label: "דרושים", protected: false },
    { to: "/members", label: "חברי המועדון", protected: false },
    { to: "/events", label: "לוח אירועים", protected: false },
    { to: "/gallery", label: "גלריה", protected: false },
    { to: "/recommendations", label: "אנשי מקצוע", protected: false },
    { to: "/deals", label: "הטבות", protected: false },
    ...(isAdmin ? [{ to: "/admin", label: "שולחן המנהל", protected: true }] : []),
  ];

  const handleNavClick = (e: React.MouseEvent, link: { to: string; protected: boolean }) => {
    if (link.protected && !user) {
      e.preventDefault();
      setShowMemberDialog(true);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md w-full">
        <div className="w-full px-4 md:px-6 relative flex items-center py-[8vw] md:py-3">
          <button
            className="md:hidden text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 z-10"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {hasBirthdays && (
            <div className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <a href="/#birthdays-section" onClick={handleBirthdayClick} className="relative flex items-center justify-center">
                <Cake className="h-5 w-5 text-gold" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-background">
                  {birthdays.length}
                </span>
              </a>
            </div>
          )}

          <Link to={user ? "/dashboard" : "/"} className="md:hidden absolute left-1/2 -translate-x-1/2">
            <img src={logoUrl} alt="לוגו" className="rounded-full object-contain" style={{ height: `${logoSize}px`, width: `${logoSize}px` }} />
          </Link>

          <div className="hidden md:flex items-center justify-center" style={{ width: "10%" }}>
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
              <img src={logoUrl} alt="לוגו" className="rounded-full object-contain" style={{ height: `${logoSize}px`, width: `${logoSize}px` }} />
              {logoText && <span className="font-serif text-lg font-bold text-foreground">{logoText}</span>}
            </Link>
          </div>

          <nav className="hidden md:flex items-center justify-center gap-1" style={{ width: "80%" }}>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={(e) => handleNavClick(e, link)}
                className={`relative rounded-md px-3 py-1.5 font-body text-sm transition-colors ${
                  isActive(link.to) ? "bg-secondary text-gold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.to === "/admin" && (
                  <span className="relative inline-flex">
                    <Shield className="inline h-3.5 w-3.5 ml-1" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                )}
                {link.label}
                {link.to === "/announcements" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Link>
            ))}

            {hasBirthdays && (
              <a
                href="/#birthdays-section"
                onClick={handleBirthdayClick}
                className="relative rounded-md px-3 py-1.5 font-body text-sm text-gold hover:bg-secondary transition-colors flex items-center gap-1.5"
              >
                <Cake className="h-4 w-4" />
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-background">
                  {birthdays.length}
                </span>
              </a>
            )}
          </nav>

          <div className="hidden md:flex items-center justify-center gap-2" style={{ width: "10%" }}>
            {canAccess ? (
              <div className="flex items-center gap-1">
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground font-body text-sm gap-1">
                  <LogOut className="h-4 w-4" />
                  התנתקות
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground font-body text-sm">כניסה</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="gradient-gold text-primary-foreground font-body text-sm">הצטרפות</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] z-[60] flex flex-col" style={{ background: "hsl(var(--background))" }}>
          <nav className="flex-1 flex flex-col items-center justify-center gap-1 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={(e) => {
                  handleNavClick(e, link);
                  if (!link.protected || canAccess) setMenuOpen(false);
                }}
                className={`relative w-full max-w-xs text-center py-3 font-body text-lg transition-colors ${
                  isActive(link.to) ? "text-gold font-semibold" : "text-foreground/80 hover:text-gold"
                }`}
              >
                {link.to === "/admin" && (
                  <span className="relative inline-flex">
                    <Shield className="inline h-4 w-4 ml-1" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                )}
                {link.label}
                {link.to === "/announcements" && unreadCount > 0 && (
                  <span className="inline-block mr-1.5 h-2 w-2 rounded-full bg-red-500 align-middle" />
                )}
              </Link>
            ))}
          </nav>

          <div className="px-6 pb-10 flex flex-col items-center gap-3">
            {canAccess ? (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="w-full max-w-xs">
                  <Button variant="outline" className="w-full font-body gap-2">
                    <User className="h-4 w-4" />
                    הפרופיל שלי
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full max-w-xs text-muted-foreground font-body gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  התנתקות
                </Button>
              </>
            ) : (
              <>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="w-full max-w-xs">
                  <Button className="w-full gradient-gold text-primary-foreground font-body text-base py-6">הצטרפות</Button>
                </Link>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full max-w-xs text-center">
                  <span className="font-body text-sm text-muted-foreground hover:text-gold transition-colors">כניסה</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="text-center sm:text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">תוכן לחברי מועדון</DialogTitle>
            <DialogDescription className="text-base mt-2">
              התוכן הזה זמין לחברי המועדון בלבד. הצטרף אלינו כדי לגשת לכל התכנים הבלעדיים.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              className="gradient-gold text-primary-foreground font-body"
              onClick={() => { setShowMemberDialog(false); navigate("/register"); }}
            >
              הצטרפות למועדון
            </Button>
            <Button
              variant="ghost"
              className="font-body text-muted-foreground"
              onClick={() => { setShowMemberDialog(false); navigate("/login"); }}
            >
              כבר רשום? כניסה
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
