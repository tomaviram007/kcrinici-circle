import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Eye, EyeOff, Edit, Trash2, Plus, Star, Search, Award } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const CATEGORIES = [
  "שיפוצים", "חשמל ואינסטלציה", "פיננסיים", "רכב", "אירועים",
  "בריאות", "משפטי", "טכנולוגיה", "חינוך", "עיצוב ואדריכלות",
  "ניקיון ותחזוקה", "הובלות", "אחר",
];

interface Recommendation {
  id: string;
  professional_name: string;
  professional_first_name: string;
  professional_last_name: string | null;
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

type RecommenderMode = "self" | "member" | "system";

const emptyForm = {
  professional_first_name: "",
  professional_last_name: "",
  category: "",
  description: "",
  phone: "",
  rating: 5,
  recommenderMode: "self" as RecommenderMode,
  selectedMemberId: "",
};

const AdminRecommendations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["admin-recommendations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("professional_recommendations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Recommendation[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["all-members-for-recommender"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("is_approved", true).eq("is_removed", false).order("full_name");
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-recommendations"] });
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };

  const toggleApproval = async (rec: Recommendation) => {
    const { error } = await (supabase as any).from("professional_recommendations").update({ is_approved: !rec.is_approved }).eq("id", rec.id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: rec.is_approved ? "ההמלצה הושהתה" : "ההמלצה אושרה!" });
    invalidate();
  };

  const toggleHidden = async (rec: Recommendation) => {
    const { error } = await (supabase as any).from("professional_recommendations").update({ is_hidden: !rec.is_hidden }).eq("id", rec.id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: rec.is_hidden ? "ההמלצה הוצגה מחדש" : "ההמלצה הוסתרה" });
    invalidate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את ההמלצה?")) return;
    const { error } = await (supabase as any).from("professional_recommendations").delete().eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ההמלצה נמחקה" });
    invalidate();
  };

  const openEdit = (rec: Recommendation) => {
    setEditingId(rec.id);
    // Detect current recommender mode
    let mode: RecommenderMode = "system";
    let memberId = "";
    if (rec.recommender_name === "המלצת מערכת") {
      mode = "system";
    } else if (rec.recommender_user_id === user?.id) {
      mode = "self";
    } else if (rec.recommender_user_id) {
      mode = "member";
      memberId = rec.recommender_user_id;
    } else {
      mode = "self";
    }
    setFormData({
      professional_first_name: rec.professional_first_name || rec.professional_name.split(" ")[0],
      professional_last_name: rec.professional_last_name || rec.professional_name.split(" ").slice(1).join(" "),
      category: rec.category,
      description: rec.description,
      phone: rec.phone,
      rating: rec.rating,
      recommenderMode: mode,
      selectedMemberId: memberId,
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.professional_first_name || !formData.category || !formData.description || !formData.phone) {
      toast({ title: "שגיאה", description: "נא למלא את כל השדות החובה", variant: "destructive" });
      return;
    }

    const fullName = [formData.professional_first_name, formData.professional_last_name].filter(Boolean).join(" ");

    // Resolve recommender info for both create and edit
    let recommenderName = "המלצת מערכת";
    let recommenderUserId: string | null = null;
    let isAdminPost = true;

    if (formData.recommenderMode === "self") {
      recommenderName = profile?.full_name || "מנהל מערכת";
      recommenderUserId = user?.id || null;
    } else if (formData.recommenderMode === "member") {
      const selected = members.find((m) => m.user_id === formData.selectedMemberId);
      recommenderName = selected?.full_name || "חבר מועדון";
      recommenderUserId = formData.selectedMemberId || null;
      isAdminPost = false;
    }

    if (editingId) {
      const { error } = await (supabase as any).from("professional_recommendations").update({
        professional_name: fullName,
        professional_first_name: formData.professional_first_name,
        professional_last_name: formData.professional_last_name || null,
        category: formData.category,
        description: formData.description,
        phone: formData.phone,
        rating: formData.rating,
        recommender_name: recommenderName,
        recommender_user_id: recommenderUserId,
        is_admin_post: isAdminPost,
      }).eq("id", editingId);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "ההמלצה עודכנה בהצלחה!" });
    } else {
      const { error } = await (supabase as any).from("professional_recommendations").insert({
        professional_name: fullName,
        professional_first_name: formData.professional_first_name,
        professional_last_name: formData.professional_last_name || null,
        category: formData.category,
        description: formData.description,
        phone: formData.phone,
        rating: formData.rating,
        recommender_user_id: recommenderUserId,
        recommender_name: recommenderName,
        is_approved: true,
        is_admin_post: isAdminPost,
      });
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "ההמלצה פורסמה בהצלחה!" });
    }
    setShowForm(false);
    setFormData(emptyForm);
    setEditingId(null);
    invalidate();
  };

  const filtered = recommendations.filter((r) => {
    const matchesSearch = (r.professional_first_name + " " + (r.professional_last_name || "")).includes(searchQuery) || r.professional_name.includes(searchQuery) || r.recommender_name.includes(searchQuery);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && r.is_approved && !r.is_hidden) ||
      (statusFilter === "pending" && !r.is_approved) ||
      (statusFilter === "hidden" && r.is_hidden);
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Award className="h-5 w-5 text-gold" /> ניהול המלצות ({recommendations.length})
        </h3>
        <Button onClick={openNew} className="gradient-gold text-primary-foreground font-body gap-2">
          <Plus className="h-4 w-4" /> פרסם המלצה כמנהל
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם בעל מקצוע או ממליץ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-background font-body"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-background font-body">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="approved">מאושר</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="hidden">מוסתר</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="text-right font-body">שם פרטי</TableHead>
              <TableHead className="text-right font-body">שם משפחה</TableHead>
              <TableHead className="text-right font-body">קטגוריה</TableHead>
              <TableHead className="text-right font-body">ממליץ</TableHead>
              <TableHead className="text-right font-body">דירוג</TableHead>
              <TableHead className="text-right font-body">סטטוס</TableHead>
              <TableHead className="text-right font-body">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-body">
                  אין המלצות להצגה
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((rec) => (
                <TableRow key={rec.id} className={rec.is_hidden ? "opacity-50" : ""}>
                  <TableCell className="font-serif font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      {rec.professional_first_name}
                      {rec.is_admin_post && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">מנהל</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-body text-sm text-muted-foreground">{rec.professional_last_name || "—"}</TableCell>
                  <TableCell className="font-body text-sm text-muted-foreground">{rec.category}</TableCell>
                  <TableCell className="font-body text-sm text-muted-foreground">{rec.recommender_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5" dir="ltr">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= rec.rating ? "fill-primary text-primary" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rec.is_hidden ? (
                      <Badge variant="secondary" className="font-body text-xs">מוסתר</Badge>
                    ) : rec.is_approved ? (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30 font-body text-xs">מאושר</Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 font-body text-xs">ממתין</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleApproval(rec)} title={rec.is_approved ? "השהה" : "אשר"}>
                        {rec.is_approved ? <X className="h-4 w-4 text-yellow-500" /> : <Check className="h-4 w-4 text-green-500" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleHidden(rec)} title={rec.is_hidden ? "הצג" : "הסתר"}>
                        {rec.is_hidden ? <Eye className="h-4 w-4 text-blue-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(rec)} title="ערוך">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(rec.id)} title="מחק">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-foreground">
              {editingId ? "עריכת המלצה" : "פרסום המלצה כמנהל"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-sm">שם פרטי *</Label>
                <Input value={formData.professional_first_name} onChange={(e) => setFormData({ ...formData, professional_first_name: e.target.value })} className="mt-1 bg-card border-border font-body" />
              </div>
              <div>
                <Label className="font-body text-sm">שם משפחה</Label>
                <Input value={formData.professional_last_name} onChange={(e) => setFormData({ ...formData, professional_last_name: e.target.value })} className="mt-1 bg-card border-border font-body" placeholder="אופציונלי" />
              </div>
            </div>
            <div>
              <Label className="font-body text-sm">תחום עיסוק</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="mt-1 bg-card border-border font-body"><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-body text-sm">תיאור השירות</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 bg-card border-border font-body min-h-[80px]" />
            </div>
            <div>
              <Label className="font-body text-sm">מספר טלפון</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-1 bg-card border-border font-body" dir="ltr" />
            </div>
            <div>
              <Label className="font-body text-sm mb-2 block">דירוג</Label>
              <div className="flex gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-6 w-6 cursor-pointer transition-colors ${s <= formData.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} onClick={() => setFormData({ ...formData, rating: s })} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
                <Label className="font-body text-sm font-semibold">שיוך הממליץ</Label>
                <RadioGroup value={formData.recommenderMode} onValueChange={(v) => setFormData({ ...formData, recommenderMode: v as RecommenderMode, selectedMemberId: "" })} className="gap-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="self" id="rec-self" />
                    <Label htmlFor="rec-self" className="font-body text-sm cursor-pointer">בשמי ({profile?.full_name || "מנהל"})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="member" id="rec-member" />
                    <Label htmlFor="rec-member" className="font-body text-sm cursor-pointer">שייך לגולש אחר</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="system" id="rec-system" />
                    <Label htmlFor="rec-system" className="font-body text-sm cursor-pointer">המלצת מערכת</Label>
                  </div>
                </RadioGroup>
                {formData.recommenderMode === "member" && (
                  <Select value={formData.selectedMemberId} onValueChange={(v) => setFormData({ ...formData, selectedMemberId: v })}>
                    <SelectTrigger className="bg-card border-border font-body"><SelectValue placeholder="בחר גולש..." /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (<SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            <Button type="submit" className="w-full gradient-gold text-primary-foreground font-body">
              {editingId ? "עדכן" : "פרסם המלצה"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecommendations;
