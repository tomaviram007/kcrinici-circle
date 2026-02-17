import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Megaphone, Briefcase, Image } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface MyPublicationsProps {
  userId: string;
}

type Announcement = {
  id: string;
  title: string;
  category: string;
  is_approved: boolean;
  is_sold: boolean;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
};

type Album = {
  id: string;
  title: string;
  is_approved: boolean;
  created_at: string;
};

const StatusBadge = ({ isApproved, isSold }: { isApproved: boolean; isSold?: boolean }) => {
  if (isSold) return <Badge className="bg-red-500/90 text-white border-0">נמכר</Badge>;
  if (isApproved) return <Badge className="bg-emerald-600/90 text-white border-0">מאושר</Badge>;
  return <Badge variant="secondary" className="bg-amber-500/90 text-white border-0">ממתין לאישור</Badge>;
};

const EmptyState = ({ text }: { text: string }) => (
  <p className="text-center text-muted-foreground font-body py-8">{text}</p>
);

const MyPublications = ({ userId }: MyPublicationsProps) => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [annRes, jobsRes, albumsRes] = await Promise.all([
        supabase
          .from("announcements")
          .select("id, title, category, is_approved, is_sold, created_at")
          .eq("created_by", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select("id, title, is_approved, is_active, created_at")
          .eq("created_by", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("gallery_albums")
          .select("id, title, is_approved, created_at")
          .eq("created_by", userId)
          .order("created_at", { ascending: false }),
      ]);
      setAnnouncements(annRes.data ?? []);
      setJobs(jobsRes.data ?? []);
      setAlbums(albumsRes.data ?? []);
      setLoading(false);
    };
    if (userId) fetchAll();
  }, [userId]);

  const markAsSold = async (id: string) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_sold: true })
      .eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_sold: true } : a))
    );
    toast({ title: "סומן כנמכר!" });
  };

  const formatDate = (d: string) => format(new Date(d), "dd/MM/yyyy", { locale: he });

  if (loading) return <p className="text-center text-muted-foreground font-body py-4">טוען פרסומים...</p>;

  return (
    <Tabs defaultValue="announcements" dir="rtl">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="announcements" className="gap-1.5 text-xs sm:text-sm">
          <Megaphone className="h-3.5 w-3.5" />
          מודעות ({announcements.length})
        </TabsTrigger>
        <TabsTrigger value="jobs" className="gap-1.5 text-xs sm:text-sm">
          <Briefcase className="h-3.5 w-3.5" />
          משרות ({jobs.length})
        </TabsTrigger>
        <TabsTrigger value="albums" className="gap-1.5 text-xs sm:text-sm">
          <Image className="h-3.5 w-3.5" />
          אלבומים ({albums.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="announcements">
        {announcements.length === 0 ? (
          <EmptyState text="עדיין לא פרסמת מודעות" />
        ) : (
          <div className="space-y-2 mt-2">
            {announcements.map((a) => (
              <Card key={a.id} className="bg-card/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground font-body">{formatDate(a.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 mr-2 shrink-0">
                    <StatusBadge isApproved={a.is_approved} isSold={a.is_sold} />
                    {a.category === "sale" && !a.is_sold && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => markAsSold(a.id)}>
                        <CheckCircle2 className="h-3 w-3" /> נמכר
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="jobs">
        {jobs.length === 0 ? (
          <EmptyState text="עדיין לא פרסמת משרות" />
        ) : (
          <div className="space-y-2 mt-2">
            {jobs.map((j) => (
              <Card key={j.id} className="bg-card/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-foreground truncate">{j.title}</p>
                    <p className="text-xs text-muted-foreground font-body">{formatDate(j.created_at)}</p>
                  </div>
                  <StatusBadge isApproved={j.is_approved} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="albums">
        {albums.length === 0 ? (
          <EmptyState text="עדיין לא יצרת אלבומים" />
        ) : (
          <div className="space-y-2 mt-2">
            {albums.map((al) => (
              <Card key={al.id} className="bg-card/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-foreground truncate">{al.title}</p>
                    <p className="text-xs text-muted-foreground font-body">{formatDate(al.created_at)}</p>
                  </div>
                  <StatusBadge isApproved={al.is_approved} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default MyPublications;
