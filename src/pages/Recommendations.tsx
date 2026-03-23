import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Search, Plus, Star, Phone, User, Briefcase, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import PageHero from "@/components/PageHero";
import recommendationsHero from "@/assets/recommendations-hero.jpg";
import { usePageCover } from "@/hooks/usePageCover";
import ClubAboutSection from "@/components/ClubAboutSection";

const CATEGORIES = [
  "שיפוצים",
  "חשמל ואינסטלציה",
  "פיננסיים",
  "רכב",
  "אירועים",
  "בריאות",
  "משפטי",
  "טכנולוגיה",
  "חינוך",
  "עיצוב ואדריכלות",
  "ניקיון ותחזוקה",
  "הובלות",
  "אחר",
];

interface Recommendation {
  id: string;
  professional_name: string;
  category: string;
  description: string;
  phone: string;
  rating: number;
  recommender_name: string;
  recommender_user_id: string | null;
  is_approved: boolean;
  is_hidden: boolean;
  is_admin_post: boolean;
  created_at: string;
}

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => (
  <div className="flex gap-0.5" dir="ltr">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-5 w-5 transition-colors ${
          star <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"
        } ${interactive ? "cursor-pointer hover:text-primary" : ""}`}
        onClick={() => interactive && onRate?.(star)}
      />
    ))}
  </div>
);

const formatPhoneForWhatsApp = (phone: string): string => {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "972" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("+") && !cleaned.startsWith("972")) {
    cleaned = "972" + cleaned;
  }
  return cleaned.replace("+", "");
};

const buildWhatsAppUrl = (rec: Recommendation): string => {
  const phone = formatPhoneForWhatsApp(rec.phone);
  const recommenderText = rec.is_admin_post ? "מנהל המערכת" : rec.recommender_name;
  const message = `היי ${rec.professional_name}, קיבלתי המלצה עליך דרך ${recommenderText} מקהילת הגברים של קרניצי. מה שלומך?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const Recommendations = () => {
  const { user, isApproved } = useAuth();
  const queryClient = useQueryClient();
  const coverImage = usePageCover("recommendations", recommendationsHero);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const cardsRef = useRef<HTMLDivElement>(null);
  const prevFilteredRef = useRef<string[]>([]);

  const [formData, setFormData] = useState({
    professional_name: "",
    category: "",
    description: "",
    phone: "",
    rating: 5,
  });

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("professional_recommendations")
        .select("*")
        .eq("is_approved", true)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Recommendation[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("professional_recommendations").insert({
        professional_name: formData.professional_name,
        category: formData.category,
        description: formData.description,
        phone: formData.phone,
        rating: formData.rating,
        recommender_user_id: user?.id || null,
        recommender_name: profile?.full_name || "חבר מועדון",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "ההמלצה נשלחה בהצלחה!", description: "ההמלצה תפורסם לאחר אישור מנהל." });
      setShowForm(false);
      setFormData({ professional_name: "", category: "", description: "", phone: "", rating: 5 });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "לא הצלחנו לשלוח את ההמלצה", variant: "destructive" });
    },
  });

  const filtered = recommendations.filter((r) => {
    const matchesSearch =
      r.professional_name.includes(searchQuery) ||
      r.description.includes(searchQuery) ||
      r.recommender_name.includes(searchQuery);
    const matchesCategory = selectedCategory === "all" || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // GSAP stagger animation with filter transitions
  const animateCards = useCallback(() => {
    if (!cardsRef.current || isLoading) return;
    const cards = cardsRef.current.querySelectorAll(".rec-card");
    if (cards.length === 0) return;

    const currentIds = filtered.map((r) => r.id);
    const prevIds = prevFilteredRef.current;
    const isFilterChange = JSON.stringify(currentIds) !== JSON.stringify(prevIds);

    if (isFilterChange && prevIds.length > 0) {
      // Animate in with stagger for filter changes
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: "power2.out" }
      );
    } else if (prevIds.length === 0) {
      // Initial load animation
      gsap.fromTo(
        cards,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }
      );
    }

    prevFilteredRef.current = currentIds;

    // Admin badge glow
    const badges = cardsRef.current.querySelectorAll(".admin-badge");
    if (badges.length > 0) {
      gsap.fromTo(badges, { boxShadow: "0 0 0px hsl(43 72% 52% / 0)" }, {
        boxShadow: "0 0 12px hsl(43 72% 52% / 0.4)",
        duration: 1.2, repeat: -1, yoyo: true, ease: "sine.inOut",
      });
    }
  }, [filtered, isLoading]);

  useEffect(() => {
    animateCards();
  }, [animateCards]);

  // Get unique categories that exist in the data
  const activeCategories = [...new Set(recommendations.map((r) => r.category))];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.professional_name || !formData.category || !formData.description || !formData.phone) {
      toast({ title: "שגיאה", description: "נא למלא את כל השדות", variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <>
      <PageHero image={coverImage} title="נבחרת אנשי המקצוע" highlight="של קרניצי" subtitle="המלצות אמיתיות מחברי המועדון על נותני שירות מומלצים" />
      <ClubAboutSection />

      <div className="max-w-7xl mx-auto px-4 py-8" dir="rtl">
        {/* Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
          {user && isApproved && (
            <Button onClick={() => setShowForm(true)} className="gradient-gold text-primary-foreground font-body gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              הוסף המלצה על בעל מקצוע
            </Button>
          )}
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם, תיאור או ממליץ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-card/70 backdrop-blur-sm border-border/50 font-body"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-body transition-all border backdrop-blur-md ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_hsl(43_72%_52%/0.3)]"
                : "bg-card/50 text-muted-foreground border-border/50 hover:bg-card hover:text-foreground hover:border-border"
            }`}
          >
            הכל ({recommendations.length})
          </button>
          {CATEGORIES.filter((cat) => activeCategories.includes(cat)).map((cat) => {
            const count = recommendations.filter((r) => r.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-body transition-all border backdrop-blur-md ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_hsl(43_72%_52%/0.3)]"
                    : "bg-card/50 text-muted-foreground border-border/50 hover:bg-card hover:text-foreground hover:border-border"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground font-body">טוען המלצות...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-body text-lg">אין עדיין המלצות{selectedCategory !== "all" ? " בקטגוריה זו" : ""}</p>
            {user && isApproved && (
              <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4 font-body">
                היה הראשון להמליץ!
              </Button>
            )}
          </div>
        ) : (
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-foreground">המלצה על בעל מקצוע</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="font-body text-sm">שם בעל המקצוע / העסק</Label>
              <Input
                value={formData.professional_name}
                onChange={(e) => setFormData({ ...formData, professional_name: e.target.value })}
                className="mt-1 bg-card border-border font-body"
                placeholder="לדוגמה: יוסי שיפוצים"
              />
            </div>
            <div>
              <Label className="font-body text-sm">תחום עיסוק</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="mt-1 bg-card border-border font-body">
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-body text-sm">כמה מילים על השירות</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 bg-card border-border font-body min-h-[80px]"
                placeholder="ספר/י בקצרה על החוויה..."
              />
            </div>
            <div>
              <Label className="font-body text-sm">מספר טלפון של בעל המקצוע</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 bg-card border-border font-body"
                placeholder="050-0000000"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="font-body text-sm mb-2 block">דירוג</Label>
              <StarRating rating={formData.rating} onRate={(r) => setFormData({ ...formData, rating: r })} interactive />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-body text-sm text-muted-foreground">ממליץ: <strong className="text-foreground">{profile?.full_name || "חבר מועדון"}</strong></span>
            </div>
            <Button type="submit" className="w-full gradient-gold text-primary-foreground font-body" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "שולח..." : "שלח המלצה"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

const RecommendationCard = ({ rec }: { rec: Recommendation }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { scale: 1.03, boxShadow: "0 0 25px hsl(43 72% 52% / 0.15)", duration: 0.3, ease: "power2.out" });
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { scale: 1, boxShadow: "0 0 0px transparent", duration: 0.3, ease: "power2.out" });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="rec-card opacity-0 rounded-2xl border border-border/50 p-6 flex flex-col gap-3 backdrop-blur-md bg-card/70 transition-colors"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-body px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          {rec.category}
        </span>
        <StarRating rating={rec.rating} />
      </div>

      <h3 className="text-lg font-serif font-bold text-foreground">{rec.professional_name}</h3>
      <p className="text-sm font-body text-muted-foreground leading-relaxed flex-1">{rec.description}</p>

      {/* Phone + WhatsApp */}
      <div className="flex items-center gap-3">
        <a
          href={`tel:${rec.phone}`}
          className="flex items-center gap-2 text-sm font-body text-primary hover:underline"
          dir="ltr"
        >
          <Phone className="h-4 w-4" />
          {rec.phone}
        </a>
        <a
          href={buildWhatsAppUrl(rec)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-body transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          וואטסאפ
        </a>
      </div>

      <div className="mt-2 pt-3 border-t border-border/50 flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-body text-muted-foreground">
          הומלץ על ידי:{" "}
          {rec.is_admin_post ? (
            <strong className="admin-badge inline-flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">
              ⭐ מומלץ קרניצי
            </strong>
          ) : (
            <strong className="text-foreground">{rec.recommender_name}</strong>
          )}
        </span>
      </div>
    </div>
  );
};

export default Recommendations;
