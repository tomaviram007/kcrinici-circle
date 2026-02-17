import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, BarChart3, ArrowRight, Trash2, X, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import type { Tables } from "@/integrations/supabase/types";

type Poll = Tables<"polls">;
type PollOption = Tables<"poll_options">;
type PollVote = Tables<"poll_votes">;

interface PollWithDetails extends Poll {
  options: (PollOption & { votes: number; votedByMe: boolean })[];
  totalVotes: number;
}

const Polls = () => {
  const { toast } = useToast();
  const [polls, setPolls] = useState<PollWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create poll dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);
      }
      await fetchPolls(session?.user?.id || null);
      setLoading(false);
    };
    init();
  }, []);

  const fetchPolls = async (uid: string | null) => {
    const { data: pollsData } = await supabase
      .from("polls")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!pollsData) { setPolls([]); return; }

    const pollIds = pollsData.map((p) => p.id);
    const [{ data: optionsData }, { data: votesData }] = await Promise.all([
      supabase.from("poll_options").select("*").in("poll_id", pollIds),
      supabase.from("poll_votes").select("*").in("poll_id", pollIds),
    ]);

    const enriched: PollWithDetails[] = pollsData.map((poll) => {
      const opts = (optionsData || []).filter((o) => o.poll_id === poll.id);
      const votes = (votesData || []).filter((v) => v.poll_id === poll.id);
      return {
        ...poll,
        totalVotes: votes.length,
        options: opts.map((o) => ({
          ...o,
          votes: votes.filter((v) => v.option_id === o.id).length,
          votedByMe: uid ? votes.some((v) => v.option_id === o.id && v.user_id === uid) : false,
        })),
      };
    });

    setPolls(enriched);
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!userId) return;
    try {
      // Check if already voted on this poll
      const poll = polls.find((p) => p.id === pollId);
      const hasVoted = poll?.options.some((o) => o.votedByMe);

      if (hasVoted && !poll?.allow_multiple) {
        // Remove existing vote first
        await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", userId);
      }

      const alreadyVotedThisOption = poll?.options.find((o) => o.id === optionId)?.votedByMe;
      if (alreadyVotedThisOption) {
        // Unvote
        await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("option_id", optionId).eq("user_id", userId);
      } else {
        await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, user_id: userId });
      }

      await fetchPolls(userId);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  };

  const handleCreatePoll = async () => {
    const validOptions = newOptions.filter((o) => o.trim());
    if (!newTitle.trim() || validOptions.length < 2) {
      toast({ title: "שגיאה", description: "יש למלא כותרת ולפחות 2 אפשרויות", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: poll, error: pollErr } = await supabase
        .from("polls")
        .insert({ title: newTitle.trim(), description: newDesc.trim() || null, created_by: userId })
        .select()
        .single();
      if (pollErr) throw pollErr;

      const optionsToInsert = validOptions.map((text) => ({ poll_id: poll.id, option_text: text.trim() }));
      const { error: optErr } = await supabase.from("poll_options").insert(optionsToInsert);
      if (optErr) throw optErr;

      toast({ title: "הסקר נוצר בהצלחה!" });
      setNewTitle("");
      setNewDesc("");
      setNewOptions(["", ""]);
      setShowCreate(false);
      await fetchPolls(userId);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    try {
      const { error } = await supabase.from("polls").delete().eq("id", pollId);
      if (error) throw error;
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
      toast({ title: "הסקר נמחק" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-body text-muted-foreground">טוען...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-2">
        <Link to="/dashboard" className="inline-flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-4 w-4" />
          חזרה לדשבורד
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
          הצבעות <span className="text-gold">וסקרים</span>
        </h1>
        <Button onClick={() => setShowCreate(true)} className="gradient-gold text-primary-foreground font-body gap-1">
          <Plus className="h-4 w-4" />
          סקר חדש
        </Button>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-lg text-muted-foreground">עדיין אין סקרים</p>
          <p className="font-body text-sm text-muted-foreground mt-1">צרו סקר חדש ותנו לחברים להצביע</p>
        </div>
      ) : (
        <div className="space-y-6">
          {polls.map((poll) => {
            const myVote = poll.options.find((o) => o.votedByMe);
            const hasVoted = !!myVote;

            return (
              <div key={poll.id} className="rounded-xl border border-border bg-card p-6 transition-all hover:border-gold/20">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-serif text-lg font-bold text-foreground">{poll.title}</h3>
                  {(poll.created_by === userId || isAdmin) && (
                    <button onClick={() => handleDeletePoll(poll.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {poll.description && (
                  <p className="font-body text-sm text-muted-foreground mb-4">{poll.description}</p>
                )}

                <div className="space-y-3">
                  {poll.options.map((option) => {
                    const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleVote(poll.id, option.id)}
                        className={`w-full text-right rounded-lg border p-3 transition-all ${
                          option.votedByMe
                            ? "border-gold/50 bg-gold/10"
                            : "border-border hover:border-gold/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-body text-sm text-foreground flex items-center gap-2">
                            {option.votedByMe && <Check className="h-4 w-4 text-gold" />}
                            {option.option_text}
                          </span>
                          <span className="font-body text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </button>
                    );
                  })}
                </div>

                <p className="font-body text-xs text-muted-foreground mt-3">
                  {poll.totalVotes} הצבעות · {new Date(poll.created_at).toLocaleDateString("he-IL")}
                </p>
              </div>
            );
          })}
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
                    <Plus className="h-3 w-3 ml-1" />
                    הוסף אפשרות
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

export default Polls;
