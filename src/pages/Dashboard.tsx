import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Users, Calendar, Megaphone } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      setUserId(session.user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_approved, full_name, avatar_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error || !profile) {
        navigate("/pending");
        return;
      }

      setUserName(profile.full_name || session.user.user_metadata?.full_name || "חבר");
      setAvatarUrl(profile.avatar_url);

      if (!profile.is_approved) {
        navigate("/pending");
        return;
      }

      setIsApproved(true);
    };

    checkAuth();
    return () => { mounted = false; };
  }, [navigate]);

  if (isApproved !== true) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-body text-muted-foreground">טוען...</p>
      </div>
    );
  }

  const cards = [
    { icon: Megaphone, title: "לוח מודעות", desc: "עדכונים ומודעות", to: "/announcements" },
    { icon: Briefcase, title: "דרושים", desc: "הזדמנויות בשכונה", to: "/jobs" },
    { icon: Users, title: "אינדקס חברים", desc: "חברי המועדון", to: "/members" },
    { icon: Calendar, title: "אירועים", desc: "מפגשים קרובים", to: "/events" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 md:mb-12 flex items-center gap-5">
        <AvatarUpload userId={userId} currentUrl={avatarUrl} onUpload={setAvatarUrl} size="lg" />
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-4xl">
            ברוך הבא <span className="text-gold">למועדון</span>
          </h2>
          <p className="mt-1 font-body text-muted-foreground">{userName}</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 md:gap-6">
        {cards.map((item, i) => (
          <Link key={i} to={item.to} className="group rounded-lg border border-border bg-card p-5 md:p-8 transition-all duration-300 hover:border-gold/30 hover:-translate-y-1 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)]">
            <item.icon className="mb-3 h-6 w-6 md:mb-4 md:h-8 md:w-8 text-gold" />
            <h3 className="font-serif text-base md:text-xl font-bold text-foreground">{item.title}</h3>
            <p className="mt-1 font-body text-xs md:text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
