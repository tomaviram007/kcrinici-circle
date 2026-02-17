import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Check, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PollOption {
  id: string;
  option_text: string;
  votes: number;
  votedByMe: boolean;
}

interface PopupPoll {
  id: string;
  title: string;
  description: string | null;
  allow_multiple: boolean;
  options: PollOption[];
  totalVotes: number;
}

const PollPopup = () => {
  const { toast } = useToast();
  const [poll, setPoll] = useState<PopupPoll | null>(null);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkForPopupPoll = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const uid = session.user.id;
      setUserId(uid);

      // Fetch active polls that should show as popup
      const { data: polls } = await supabase
        .from("polls")
        .select("*")
        .eq("is_active", true)
        .eq("show_popup", true)
        .order("created_at", { ascending: false });

      if (!polls || polls.length === 0) return;

      // Check which polls the user hasn't seen enough times
      const pollIds = polls.map(p => p.id);
      const { data: views } = await supabase
        .from("poll_popup_views")
        .select("*")
        .eq("user_id", uid)
        .in("poll_id", pollIds);

      // Find a poll the user hasn't exceeded max_displays
      const viewMap = new Map((views || []).map(v => [v.poll_id, v.view_count]));
      const eligiblePoll = polls.find(p => {
        const viewCount = viewMap.get(p.id) || 0;
        return viewCount < (p.max_displays || 2);
      });

      if (!eligiblePoll) return;

      // Fetch options and votes
      const [{ data: optionsData }, { data: votesData }] = await Promise.all([
        supabase.from("poll_options").select("*").eq("poll_id", eligiblePoll.id),
        supabase.from("poll_votes").select("*").eq("poll_id", eligiblePoll.id),
      ]);

      const votes = votesData || [];
      const enrichedPoll: PopupPoll = {
        id: eligiblePoll.id,
        title: eligiblePoll.title,
        description: eligiblePoll.description,
        allow_multiple: eligiblePoll.allow_multiple,
        totalVotes: votes.length,
        options: (optionsData || []).map(o => ({
          id: o.id,
          option_text: o.option_text,
          votes: votes.filter(v => v.option_id === o.id).length,
          votedByMe: votes.some(v => v.option_id === o.id && v.user_id === uid),
        })),
      };

      setPoll(enrichedPoll);
      setOpen(true);

      // Record/increment view count
      const existingView = viewMap.get(eligiblePoll.id);
      if (existingView) {
        await supabase
          .from("poll_popup_views")
          .update({ view_count: existingView + 1, updated_at: new Date().toISOString() })
          .eq("poll_id", eligiblePoll.id)
          .eq("user_id", uid);
      } else {
        await supabase
          .from("poll_popup_views")
          .insert({ poll_id: eligiblePoll.id, user_id: uid, view_count: 1 });
      }
    };

    // Delay popup slightly so it doesn't interrupt page load
    const timer = setTimeout(checkForPopupPoll, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleVote = async (optionId: string) => {
    if (!userId || !poll) return;
    try {
      const hasVoted = poll.options.some(o => o.votedByMe);
      if (hasVoted && !poll.allow_multiple) {
        await supabase.from("poll_votes").delete().eq("poll_id", poll.id).eq("user_id", userId);
      }

      const alreadyVotedThis = poll.options.find(o => o.id === optionId)?.votedByMe;
      if (alreadyVotedThis) {
        await supabase.from("poll_votes").delete().eq("poll_id", poll.id).eq("option_id", optionId).eq("user_id", userId);
      } else {
        await supabase.from("poll_votes").insert({ poll_id: poll.id, option_id: optionId, user_id: userId });
      }

      // Refresh votes
      const { data: votesData } = await supabase.from("poll_votes").select("*").eq("poll_id", poll.id);
      const votes = votesData || [];
      setPoll(prev => prev ? {
        ...prev,
        totalVotes: votes.length,
        options: prev.options.map(o => ({
          ...o,
          votes: votes.filter(v => v.option_id === o.id).length,
          votedByMe: votes.some(v => v.option_id === o.id && v.user_id === userId),
        })),
      } : null);

      toast({ title: alreadyVotedThis ? "ההצבעה הוסרה" : "ההצבעה נרשמה!" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  };

  if (!poll) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gold" />
            {poll.title}
          </DialogTitle>
        </DialogHeader>
        {poll.description && (
          <p className="font-body text-sm text-muted-foreground">{poll.description}</p>
        )}
        <div className="space-y-3 mt-2">
          {poll.options.map(option => {
            const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                className={`w-full text-right rounded-lg border p-3 transition-all ${
                  option.votedByMe ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30"
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
        <p className="font-body text-xs text-muted-foreground mt-2">
          {poll.totalVotes} הצבעות
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PollPopup;
