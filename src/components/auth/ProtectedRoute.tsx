import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Lock, UserPlus, LogIn, X } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
  /** If true, the page renders for anyone — even non-members — and the page itself filters content. */
  publicPartial?: boolean;
}

const TeaserOverlay = ({ type }: { type: "no-session" | "not-approved" }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="relative mx-4 max-w-md rounded-2xl border border-gold/20 bg-card p-8 text-center shadow-2xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="סגור"
          className="absolute left-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 text-gold transition-colors hover:bg-gold/10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-background">
          <Lock className="h-7 w-7 text-gold" />
        </div>

        {type === "no-session" ? (
          <>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              תוכן <span className="text-gold">בלעדי</span> לחברי המועדון
            </h2>
            <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
              הצטרף למועדון הגברים של ק.קרניצי כדי לצפות בתוכן המלא
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="gradient-gold text-primary-foreground font-body hover:opacity-90">
                <Link to="/register"><UserPlus className="mr-2 h-4 w-4" />הצטרף למועדון</Link>
              </Button>
              <Button asChild variant="outline" className="font-body border-gold/30 text-gold hover:bg-gold/10">
                <Link to="/login"><LogIn className="mr-2 h-4 w-4" />כניסה לחברים</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              ממתין <span className="text-gold">לאישור</span>
            </h2>
            <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
              בקשתך נשלחה להנהלת המועדון. תקבל הודעה ברגע שהגישה תאושר.
            </p>
            <div className="mt-6">
              <Button asChild variant="outline" className="font-body border-gold/30 text-gold hover:bg-gold/10">
                <Link to="/">חזרה לעמוד הראשי</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requireApproval = true, requireAdmin = false, publicPartial = false }: ProtectedRouteProps) => {
  const { user, isApproved, isAdmin, isTeamMember, loading } = useAuth();

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-gold" />
        <p className="font-body text-sm text-muted-foreground">טוען...</p>
      </div>
    </div>
  );

  // Admin & approval gates always apply regardless of publicPartial
  if (requireAdmin) {
    if (!user) {
      return (
        <div className="relative min-h-[60vh]">
          <div className="pointer-events-none select-none" style={{ filter: "blur(8px)" }}>{children}</div>
          <TeaserOverlay type="no-session" />
        </div>
      );
    }
    if (!isAdmin && !isTeamMember) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  }

  // Public-partial routes render for everyone; the page decides what to hide.
  if (publicPartial) return <>{children}</>;

  if (!user) {
    return (
      <div className="relative min-h-[60vh]">
        <div className="pointer-events-none select-none" style={{ filter: "blur(8px)" }}>{children}</div>
        <TeaserOverlay type="no-session" />
      </div>
    );
  }

  if (requireApproval && !isApproved) {
    return (
      <div className="relative min-h-screen">
        <div className="pointer-events-none select-none" style={{ filter: "blur(8px)" }}>{children}</div>
        <TeaserOverlay type="not-approved" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
