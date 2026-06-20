import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Search, Ban } from "lucide-react";

export type PickMode = "email" | "phone";

interface Member {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_approved: boolean;
  email_opt_in: boolean;
  is_suppressed: boolean;
}

interface Props {
  mode: PickMode;
  trigger?: React.ReactNode;
  onConfirm: (values: string[]) => void;
}

const MemberPicker = ({ mode, trigger, onConfirm }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [onlyApproved, setOnlyApproved] = useState(true);

  useEffect(() => {
    if (!open || members.length) return;
    (async () => {
      setLoading(true);
      // Get email + opt-in + suppression via RPC
      const [{ data: mailing }, { data: profiles }] = await Promise.all([
        supabase.rpc("admin_list_mailing_list"),
        supabase.from("profiles").select("user_id, full_name, phone, is_approved").eq("is_removed", false),
      ]);
      const byId = new Map<string, Member>();
      (profiles || []).forEach((p: any) => {
        byId.set(p.user_id, {
          user_id: p.user_id,
          full_name: p.full_name || "",
          email: null,
          phone: p.phone || null,
          is_approved: !!p.is_approved,
          email_opt_in: true,
          is_suppressed: false,
        });
      });
      (mailing || []).forEach((m: any) => {
        const cur = byId.get(m.user_id) || {
          user_id: m.user_id, full_name: m.full_name || "", email: null, phone: null,
          is_approved: !!m.is_approved, email_opt_in: true, is_suppressed: false,
        };
        cur.email = m.email || null;
        cur.email_opt_in = m.email_opt_in !== false;
        cur.is_suppressed = !!m.is_suppressed;
        byId.set(m.user_id, cur);
      });
      const list = Array.from(byId.values()).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "he"));
      setMembers(list);
      setLoading(false);
    })();
  }, [open, members.length]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (onlyApproved && !m.is_approved) return false;
      const v = mode === "email" ? m.email : m.phone;
      if (!v) return false;
      if (mode === "email" && m.is_suppressed) return false;
      if (!needle) return true;
      return (
        (m.full_name || "").toLowerCase().includes(needle) ||
        (v || "").toLowerCase().includes(needle)
      );
    });
  }, [members, q, onlyApproved, mode]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.user_id));

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAllVisible = () => {
    setSelected((s) => {
      const n = new Set(s);
      if (allVisibleSelected) filtered.forEach((m) => n.delete(m.user_id));
      else filtered.forEach((m) => n.add(m.user_id));
      return n;
    });
  };

  const handleConfirm = () => {
    const values = members
      .filter((m) => selected.has(m.user_id))
      .map((m) => (mode === "email" ? m.email : m.phone))
      .filter((v): v is string => !!v);
    onConfirm(values);
    setOpen(false);
    setSelected(new Set());
    setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <Users className="h-4 w-4" />
            בחר מהמועדון
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>בחירת חברי מועדון</DialogTitle>
          <DialogDescription>
            {mode === "email"
              ? "בחר נמענים מתוך רשימת חברי המועדון. כתובות חסומות או שביטלו הסכמה מוסתרות."
              : "בחר חברי מועדון לפי מספר הטלפון השמור בפרופיל."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או כתובת..." className="pr-8" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
            <Checkbox checked={onlyApproved} onCheckedChange={(v) => setOnlyApproved(!!v)} />
            רק חברים מאושרים
          </label>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{selected.size} נבחרו · {filtered.length} מוצגים</span>
          <Button variant="ghost" size="sm" onClick={toggleAllVisible} disabled={!filtered.length}>
            {allVisibleSelected ? "בטל בחירת הכל" : "בחר את כל הנראים"}
          </Button>
        </div>

        <div className="border border-border rounded-lg max-h-80 overflow-y-auto divide-y divide-border">
          {loading && <div className="p-6 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">לא נמצאו חברים מתאימים</div>
          )}
          {!loading && filtered.map((m) => {
            const value = mode === "email" ? m.email : m.phone;
            return (
              <label
                key={m.user_id}
                className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer"
              >
                <Checkbox checked={selected.has(m.user_id)} onCheckedChange={() => toggle(m.user_id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{m.full_name || "ללא שם"}</span>
                    {!m.is_approved && <Badge variant="outline" className="text-[10px]">ממתין</Badge>}
                    {mode === "email" && !m.email_opt_in && (
                      <Badge variant="outline" className="text-[10px] text-yellow-700 border-yellow-500/40">
                        <Ban className="h-3 w-3 ml-0.5" /> לא בתפוצה
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" dir="ltr">{value}</div>
                </div>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>בטל</Button>
          <Button onClick={handleConfirm} disabled={!selected.size} className="bg-gold text-charcoal hover:bg-gold/90">
            הוסף {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MemberPicker;
