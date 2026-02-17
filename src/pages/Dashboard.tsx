import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Briefcase, Users, Calendar, Megaphone } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserName(session.user.user_metadata?.full_name || "חבר");
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="font-serif text-xl font-bold text-foreground">
            הגברים של <span className="text-gold">ק. קריניצי</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="font-body text-sm text-muted-foreground">
              שלום, {userName}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-12">
          <h2 className="font-serif text-4xl font-bold text-foreground">
            ברוך הבא <span className="text-gold">למועדון</span>
          </h2>
          <p className="mt-2 font-body text-muted-foreground">
            הלוחות והעדכונים של השכונה
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Megaphone, title: "לוח מודעות", desc: "עדכונים ומודעות" },
            { icon: Briefcase, title: "דרושים", desc: "הזדמנויות בשכונה" },
            { icon: Users, title: "אינדקס חברים", desc: "חברי המועדון" },
            { icon: Calendar, title: "אירועים", desc: "מפגשים קרובים" },
          ].map((item, i) => (
            <div
              key={i}
              className="group cursor-pointer rounded-lg border border-border bg-card p-8 transition-all duration-300 hover:border-gold/30 hover:-translate-y-1 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)]"
            >
              <item.icon className="mb-4 h-8 w-8 text-gold" />
              <h3 className="font-serif text-xl font-bold text-foreground">
                {item.title}
              </h3>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
