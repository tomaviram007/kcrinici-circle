import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Users, Calendar, Megaphone } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("is_approved, full_name").eq("user_id", session.user.id).single();
      if (profile) {
        setIsApproved(profile.is_approved);
        setUserName(profile.full_name || "חבר");
        if (!profile.is_approved) navigate("/pending");
      }
    };
    checkAuth();
  }, [navigate]);

  if (isApproved === null) return <div className="flex min-h-[60vh] items-center justify-center"><p className="font-body text-muted-foreground">טוען...</p></div>;

  const cards = [
    { icon: Megaphone, title: "לוח מודעות", desc: "עדכונים ומודעות", to: "/announcements" },
    { icon: Briefcase, title: "דרושים", desc: "הזדמנויות בשכונה", to: "/jobs" },
    { icon: Users, title: "אינדקס חברים", desc: "חברי המועדון", to: "/members" },
    { icon: Calendar, title: "אירועים", desc: "מפגשים קרובים", to: "/events" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-12">
        <h2 className="font-serif text-4xl font-bold text-foreground">
          ברוך הבא <span className="text-gold">למועדון</span>, {userName}
        </h2>
        <p className="mt-2 font-body text-muted-foreground">הלוחות והעדכונים של השכונה</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((item, i) => (
          <Link key={i} to={item.to} className="group rounded-lg border border-border bg-card p-8 transition-all duration-300 hover:border-gold/30 hover:-translate-y-1 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)]">
            <item.icon className="mb-4 h-8 w-8 text-gold" />
            <h3 className="font-serif text-xl font-bold text-foreground">{item.title}</h3>
            <p className="mt-1 font-body text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
