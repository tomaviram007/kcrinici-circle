import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu, X } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setIsApproved(false);
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navLinks = [
    ...(isApproved ? [
      { to: "/dashboard", label: "ראשי" },
      { to: "/announcements", label: "מודעות" },
      { to: "/jobs", label: "דרושים" },
      { to: "/members", label: "חברים" },
      { to: "/events", label: "אירועים" },
    ] : []),
    ...(isAdmin ? [{ to: "/admin", label: "שולחן המנהל" }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link to={user ? "/dashboard" : "/"} className="font-serif text-lg font-bold text-foreground">
          הגברים של <span className="text-gold">ק. קריניצי</span>
        </Link>

        {/* Desktop Nav */}
        {user && !loading && navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
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
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
              {navLinks.length > 0 && (
                <button className="md:hidden text-muted-foreground" onClick={() => setMenuOpen(!menuOpen)}>
                  {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              )}
            </>
          ) : (
            <div className="flex gap-2">
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
      {menuOpen && user && (
        <nav className="border-t border-border px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
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
  );
};

export default Header;
