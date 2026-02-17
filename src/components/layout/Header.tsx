import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu, X, Cake } from "lucide-react";
import { useBirthdaysThisWeek } from "@/hooks/useBirthdaysThisWeek";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PROTECTED_PATHS = ["/dashboard", "/announcements", "/jobs", "/members", "/events"];

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const { birthdays } = useBirthdaysThisWeek();

  const fetchUserData = async (userId: string) => {
    try {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("is_approved").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      setIsApproved(profile?.is_approved ?? false);
      setIsAdmin(roles?.some((r: any) => r.role === "admin") ?? false);
    } catch {
      setIsApproved(false);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const loadingTimeout = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setIsApproved(false);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const canAccess = user && isApproved;
  const hasBirthdays = birthdays.length > 0;

  const navLinks = [
    { to: "/", label: "דף הבית", protected: false },
    { to: "/dashboard", label: "ראשי", protected: true },
    { to: "/announcements", label: "לוח מודעות", protected: true },
    { to: "/jobs", label: "דרושים", protected: true },
    { to: "/members", label: "חברי המועדון", protected: true },
    { to: "/events", label: "לוח אירועים", protected: true },
    ...(isAdmin ? [{ to: "/admin", label: "שולחן המנהל", protected: true }] : []),
  ];

  const handleNavClick = (e: React.MouseEvent, link: { to: string; protected: boolean }) => {
    if (link.protected && !canAccess) {
      e.preventDefault();
      setShowMemberDialog(true);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 md:px-6 relative">
          {/* Mobile: hamburger on the right */}
          <button
            className="md:hidden text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 z-10"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Birthday badge - mobile left side */}
          {hasBirthdays && (
            <div className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <Link to="/#birthdays" className="relative flex items-center justify-center">
                <Cake className="h-5 w-5 text-gold" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-background">
                  {birthdays.length}
                </span>
              </Link>
            </div>
          )}

          {/* Logo: centered on mobile, right-aligned on desktop */}
          <Link
            to={user ? "/dashboard" : "/"}
            className="font-serif text-lg font-bold text-foreground md:static absolute left-1/2 -translate-x-1/2 md:translate-x-0"
          >
            הגברים של <span className="text-gold">ק. קריניצי</span>
          </Link>

          {/* Desktop Nav */}
          {!loading && (
            <nav className="hidden md:flex items-center gap-1 mr-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`rounded-md px-3 py-1.5 font-body text-sm transition-colors ${
                    isActive(link.to) ? "bg-secondary text-gold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.to === "/admin" && <Shield className="inline h-3.5 w-3.5 ml-1" />}
                  {link.label}
                </Link>
              ))}

              {/* Desktop birthday badge */}
              {hasBirthdays && (
                <Link
                  to="/#birthdays"
                  className="relative rounded-md px-3 py-1.5 font-body text-sm text-gold hover:bg-secondary transition-colors flex items-center gap-1.5"
                >
                  <Cake className="h-4 w-4" />
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-background">
                    {birthdays.length}
                  </span>
                </Link>
              )}
            </nav>
          )}

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3 mr-3">
            {loading ? null : user ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground font-body text-sm gap-1">
                <LogOut className="h-4 w-4" />
                יציאה
              </Button>
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

      {/* Mobile Nav Overlay - rendered outside header for proper z-index */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] z-[60] flex flex-col" style={{ background: 'hsl(var(--background))' }}>
          <nav className="flex-1 flex flex-col items-center justify-center gap-1 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={(e) => {
                  handleNavClick(e, link);
                  if (!link.protected || canAccess) setMenuOpen(false);
                }}
                className={`w-full max-w-xs text-center py-3 font-body text-lg transition-colors ${
                  isActive(link.to)
                    ? "text-gold font-semibold"
                    : "text-foreground/80 hover:text-gold"
                }`}
              >
                {link.to === "/admin" && <Shield className="inline h-4 w-4 ml-1" />}
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="px-6 pb-10 flex flex-col items-center gap-3">
            {user ? (
              <Button
                variant="ghost"
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full max-w-xs text-muted-foreground font-body gap-2"
              >
                <LogOut className="h-4 w-4" />
                יציאה
              </Button>
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
