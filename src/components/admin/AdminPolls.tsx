import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, X, Eye, EyeOff, Pause, Play, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface PollWithOptions {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  show_popup: boolean;
  max_displays: number;
  allow_multiple: boolean;
  created_at: string;
  options: { id: string; option_text: string }[];
  totalVotes: number;
}

const AdminPolls = () => {
  const { toast } = useToast();
  const [polls, setPolls] = useState<PollWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [newMaxDisplays, setNewMaxDisplays] = useState(2);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
      await fetchPolls();
      setLoading(false);
    };
    init();
  }, []);

  const fetchPolls = async () => {
    const { data: pollsData } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (!pollsData) { setPolls([]); return; }

    const pollIds = pollsData.map(p => p.id);
    const [{ data: optionsData }, { data: votesData }] = await Promise.all([
      supabase.from("poll_options").select("*").in("poll_id", pollIds),
      supabase.from("poll_votes").select("*").in("poll_id", pollIds),
    ]);

    setPolls(pollsData.map(poll => ({
      ...poll,
      options: (optionsData || []).filter(o => o.poll_id === poll.id),
      totalVotes: (votesData || []).filter(v => v.poll_id === poll.id).length,
    })));
  };

  const handleCreatePoll = async () => {
    const validOptions = newOptions.filter(o => o.trim());
    if (!newTitle.trim() || validOptions.length < 2) {
      toast({ title: "שגיאה", description: "יש למלא כותרת ולפחות 2 אפשרויות", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: poll, error: pollErr } = await supabase
        .from("polls")
        .insert({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          created_by: userId,
          show_popup: true,
          max_displays: newMaxDisplays,
        })
        .select()
        .single();
      if (pollErr) throw pollErr;

      const { error: optErr } = await supabase
        .from("poll_options")
        .insert(validOptions.map(text => ({ poll_id: poll.id, option_text: text.trim() })));
      if (optErr) throw optErr;

      toast({ title: "הסקר נוצר בהצלחה!" });
      setNewTitle(""); setNewDesc(""); setNewOptions(["", ""]); setNewMaxDisplays(2);
      setShowCreate(false);
      await fetchPolls();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (pollId: string) => {
    try {
      await supabase.from("polls").delete().eq("id", pollId);
      setPolls(prev => prev.filter(p => p.id !== pollId));
      toast({ title: "הסקר נמחק" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (pollId: string, current: boolean) => {
    await supabase.from("polls").update({ is_active: !current }).eq("id", pollId);
    await fetchPolls();
    toast({ title: !current ? "הסקר הופעל" : "הסקר הושהה" });
  };

  const togglePopup = async (pollId: string, current: boolean) => {
    await supabase.from("polls").update({ show_popup: !current }).eq("id", pollId);
    await fetchPolls();
    toast({ title: !current ? "הפופאפ הופעל" : "הפופאפ כובה" });
  };

  const resetViews = async (pollId: string) => {
    await supabase.from("poll_popup_views").delete().eq("poll_id", pollId);
    toast({ title: "סבב חדש הופעל", description: "הפופאפ יופיע שוב לכל המשתמשים" });
  };

  const updateMaxDisplays = async (pollId: string, value: number) => {
    await supabase.from("polls").update({ max_displays: value }).eq("id", pollId);
    await fetchPolls();
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-foreground">ניהול סקרים והצבעות</h3>
        <Button onClick={() => setShowCreate(true)} className="gradient-gold text-primary-foreground font-body gap-1">
          <Plus className="h-4 w-4" /> סקר חדש
        </Button>
      </div>

      {polls.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground text-center py-8">אין סקרים עדיין</p>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => (
            <div key={poll.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-serif text-lg font-bold text-foreground">{poll.title}</h4>
                  {poll.description && <p className="font-body text-sm text-muted-foreground">{poll.description}</p>}
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    {poll.totalVotes} הצבעות · {poll.options.length} אפשרויות · {new Date(poll.created_at).toLocaleDateString("he-IL")}
                  </p>
                </div>
                <button onClick={() => handleDelete(poll.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="font-body text-sm text-foreground flex items-center gap-2">
                    {poll.is_active ? <Play className="h-4 w-4 text-green-500" /> : <Pause className="h-4 w-4 text-muted-foreground" />}
                    {poll.is_active ? "פעיל" : "מושהה"}
                  </span>
                  <Switch checked={poll.is_active} onCheckedChange={() => toggleActive(poll.id, poll.is_active)} />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="font-body text-sm text-foreground flex items-center gap-2">
                    {poll.show_popup ? <Eye className="h-4 w-4 text-gold" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    פופאפ
                  </span>
                  <Switch checked={poll.show_popup} onCheckedChange={() => togglePopup(poll.id, poll.show_popup)} />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="font-body text-sm text-muted-foreground">מקסימום הצגות:</label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={poll.max_displays}
                    onChange={(e) => updateMaxDisplays(poll.id, parseInt(e.target.value) || 2)}
                    className="w-16 h-8 bg-card border-border text-center"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => resetViews(poll.id)} className="font-body text-xs gap-1 border-gold/30 text-gold hover:bg-gold/10">
                  <RefreshCw className="h-3 w-3" /> סבב חדש
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Poll Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">סקר חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">שאלה <span className="text-gold">*</span></label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-card border-border" placeholder="על מה מצביעים?" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">תיאור</label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-card border-border" placeholder="הסבר נוסף (אופציונלי)..." />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">מקסימום הצגות לגולש</label>
              <Input type="number" min={1} max={99} value={newMaxDisplays} onChange={(e) => setNewMaxDisplays(parseInt(e.target.value) || 2)} className="bg-card border-border w-24" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">אפשרויות <span className="text-gold">*</span></label>
              <div className="space-y-2">
                {newOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const updated = [...newOptions];
                        updated[idx] = e.target.value;
                        setNewOptions(updated);
                      }}
                      className="bg-card border-border"
                      placeholder={`אפשרות ${idx + 1}`}
                    />
                    {newOptions.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => setNewOptions(newOptions.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {newOptions.length < 6 && (
                  <Button variant="outline" size="sm" onClick={() => setNewOptions([...newOptions, ""])} className="font-body text-xs">
                    <Plus className="h-3 w-3 ml-1" /> הוסף אפשרות
                  </Button>
                )}
              </div>
            </div>
            <Button onClick={handleCreatePoll} disabled={creating} className="w-full gradient-gold text-primary-foreground font-body py-5">
              {creating ? "יוצר..." : "צור סקר"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPolls;
