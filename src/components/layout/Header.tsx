import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu, X } from "lucide-react";
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

  const navLinks = [
    { to: "/", label: "דף הבית", protected: false },
    { to: "/dashboard", label: "ראשי", protected: true },
    { to: "/announcements", label: "מודעות", protected: true },
    { to: "/jobs", label: "דרושים", protected: true },
    { to: "/members", label: "חברים", protected: true },
    { to: "/events", label: "אירועים", protected: true },
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link to={user ? "/dashboard" : "/"} className="font-serif text-lg font-bold text-foreground">
            הגברים של <span className="text-gold">ק. קריניצי</span>
          </Link>

          {/* Desktop Nav */}
          {!loading && (
            <nav className="hidden md:flex items-center gap-1">
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
            </nav>
          )}

          <div className="flex items-center gap-3">
            {loading ? null : user ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground font-body text-sm gap-1">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">יציאה</span>
                </Button>
                <button className="md:hidden text-muted-foreground" onClick={() => setMenuOpen(!menuOpen)}>
                  {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </>
            ) : (
              <div className="flex gap-2 items-center">
                <button className="md:hidden text-muted-foreground" onClick={() => setMenuOpen(!menuOpen)}>
                  {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground font-body text-sm">כניסה</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="gradient-gold text-primary-foreground font-body text-sm">הצטרפות</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <nav className="border-t border-border px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => {
                    handleNavClick(e, link);
                    if (!link.protected || canAccess) setMenuOpen(false);
                  }}
                  className={`rounded-md px-3 py-2 font-body text-sm ${
                    isActive(link.to) ? "bg-secondary text-gold" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

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
