import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Check, Clock } from "lucide-react";

const AdminAnnouncements = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);

  const fetchItems = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleApprove = async (id: string) => {
    await supabase.from("announcements").update({ is_approved: true }).eq("id", id);
    toast({ title: "המודעה אושרה!" });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "נמחק" });
    fetchItems();
  };

  const pending = items.filter((i) => !i.is_approved);
  const approved = items.filter((i) => i.is_approved);

  return (
    <div className="space-y-8">
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
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              </div>
              <div className="flex gap-1 shrink-0 mr-3">
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
