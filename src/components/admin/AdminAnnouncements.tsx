import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramNotification } from "@/lib/telegram-notify";
import { Trash2, Check, Clock, Plus, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fireConfetti } from "@/lib/confetti";
import { logAuditAction } from "@/lib/audit-log";
import CreatorBadge from "@/components/admin/CreatorBadge";

type AuthorMode = "self" | "member" | "system";

const AdminAnnouncements = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [members, setMembers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "announcement",
    authorMode: "self" as AuthorMode,
    selectedMemberId: "",
  });

  const fetchItems = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name").eq("is_approved", true).eq("is_removed", false).order("full_name");
    setMembers(data || []);
  };

  useEffect(() => { fetchItems(); fetchMembers(); }, []);

  const resetForm = () => {
    setForm({ title: "", content: "", category: "announcement", authorMode: "self", selectedMemberId: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ title: "", content: "", category: "announcement", authorMode: "self", selectedMemberId: "" });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    let mode: AuthorMode = "system";
    let memberId = "";
    if (!item.created_by) mode = "system";
    else if (item.created_by === user?.id) mode = "self";
    else { mode = "member"; memberId = item.created_by; }
    setForm({
      title: item.title,
      content: item.content,
      category: item.category || "announcement",
      authorMode: mode,
      selectedMemberId: memberId,
    });
    setShowForm(true);
  };

  const resolveCreatedBy = (): string | null => {
    if (form.authorMode === "self") return user?.id || null;
    if (form.authorMode === "member") return form.selectedMemberId || null;
    return null; // system
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "שגיאה", description: "יש למלא כותרת ותוכן", variant: "destructive" });
      return;
    }
    if (form.authorMode === "member" && !form.selectedMemberId) {
      toast({ title: "שגיאה", description: "יש לבחור גולש", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const created_by = resolveCreatedBy();

    if (editingId) {
      const { error } = await supabase.from("announcements").update({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        created_by,
      }).eq("id", editingId);
      setSubmitting(false);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "המודעה עודכנה!" });
      logAuditAction("update", "announcement", editingId, form.title);
    } else {
      const { error } = await supabase.from("announcements").insert({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        is_approved: true,
        created_by,
      });
      setSubmitting(false);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "פורסם!", description: "המודעה פורסמה בהצלחה." });
      fireConfetti();
      sendTelegramNotification("new_announcement", { title: form.title, content: form.content, category: form.category });
      logAuditAction("create", "announcement", undefined, form.title);
    }
    resetForm();
    fetchItems();
  };

  const handleApprove = async (id: string) => {
    const item = items.find(i => i.id === id);
    await supabase.from("announcements").update({ is_approved: true }).eq("id", id);
    toast({ title: "המודעה אושרה!" });
    logAuditAction("approve", "announcement", id, item?.title);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const item = items.find(i => i.id === id);
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "נמחק" });
    logAuditAction("delete", "announcement", id, item?.title);
    fetchItems();
  };

  const pending = items.filter((i) => !i.is_approved);
  const approved = items.filter((i) => i.is_approved);

  return (
    <div className="space-y-8">
      <div>
        <Button onClick={openNew} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> פרסם מודעה חדשה
        </Button>
      </div>

      {/* Pending */}
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold" /> ממתינות לאישור ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין מודעות ממתינות.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => (
              <div key={item.id} className="flex items-start justify-between rounded-lg border border-gold/20 bg-card p-4">
                <div>
                  <h4 className="font-serif text-base font-bold text-foreground">{item.title}</h4>
                  <p className="font-body text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                  <p className="mt-1 font-body text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("he-IL")}</p>
                </div>
                <div className="flex gap-1 shrink-0 mr-3">
                  <Button size="sm" onClick={() => handleApprove(item.id)} className="gradient-gold text-primary-foreground font-body">
                    <Check className="h-3.5 w-3.5 ml-1" /> אשר
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="ערוך"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved */}
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" /> מודעות מאושרות ({approved.length})
        </h3>
        <div className="space-y-3">
          {approved.map((item) => (
            <div key={item.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <h4 className="font-serif text-base font-bold text-foreground">{item.title}</h4>
                <p className="font-body text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("he-IL")}</p>
                <CreatorBadge entityType="announcement" entityId={item.id} createdBy={item.created_by} />
              </div>
              <div className="flex gap-1 shrink-0 mr-3">
                <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="ערוך"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-foreground">
              {editingId ? "עריכת מודעה" : "מודעה חדשה"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder="כותרת המודעה"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="font-body"
              dir="rtl"
            />
            <Textarea
              placeholder="תוכן המודעה"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="font-body min-h-[120px]"
              dir="rtl"
            />
            <div>
              <Label className="font-body text-sm">סוג מודעה</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="font-body w-48 mt-1">
                  <SelectValue placeholder="סוג מודעה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">הודעה</SelectItem>
                  <SelectItem value="sale">מכירה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Author / שיוך מפרסם */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <Label className="font-body text-sm font-bold">מי מפרסם?</Label>
              <RadioGroup
                value={form.authorMode}
                onValueChange={(v: AuthorMode) => setForm({ ...form, authorMode: v, selectedMemberId: v === "member" ? form.selectedMemberId : "" })}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="self" id="ann-self" />
                  <Label htmlFor="ann-self" className="font-body text-sm cursor-pointer">אני (מנהל)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="member" id="ann-member" />
                  <Label htmlFor="ann-member" className="font-body text-sm cursor-pointer">גולש אחר</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="system" id="ann-system" />
                  <Label htmlFor="ann-system" className="font-body text-sm cursor-pointer">מודעת מערכת</Label>
                </div>
              </RadioGroup>

              {form.authorMode === "member" && (
                <Select value={form.selectedMemberId} onValueChange={(v) => setForm({ ...form, selectedMemberId: v })}>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="בחר גולש..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={resetForm} className="font-body">ביטול</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gradient-gold text-primary-foreground font-body">
                {submitting ? "שומר..." : editingId ? "עדכן מודעה" : "פרסם מודעה"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnnouncements;
