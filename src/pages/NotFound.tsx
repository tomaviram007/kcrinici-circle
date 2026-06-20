import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const search = location.search;
    const params = new URLSearchParams(search);
    const looksLikeUnsubscribe =
      path.includes("unsub") ||
      path.includes("opt-out") ||
      path.startsWith("/u/") ||
      path === "/u" ||
      path.includes("/email/") ||
      params.has("token") && (params.has("unsubscribe") || path.includes("mail"));

    // Also catch any URL that carries an unsubscribe token, regardless of path.
    const hasToken = params.has("token");

    if (looksLikeUnsubscribe || hasToken) {
      // Try to extract a token from path segments like /u/<token> or /unsub/<token>
      if (!params.has("token")) {
        const segs = location.pathname.split("/").filter(Boolean);
        const maybeToken = segs[segs.length - 1];
        if (maybeToken && maybeToken.length >= 12) {
          params.set("token", maybeToken);
        }
      }
      navigate(`/unsubscribe?${params.toString()}`, { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
