import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, FileEdit, Eye, MailX } from "lucide-react";
import AdminCommunication from "@/components/admin/AdminCommunication";
import AdminEmailContent from "@/components/admin/AdminEmailContent";
import AdminEmailPreview from "@/components/admin/AdminEmailPreview";
import AdminMailingList from "@/components/admin/AdminMailingList";

const AdminCommunicationHub = () => {
  const [tab, setTab] = useState("send");

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="p-3 sm:p-4 bg-card/60 backdrop-blur-xl border-border/50">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1 bg-background/60">
            <TabsTrigger value="send" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Send className="h-4 w-4" /> שליחת הודעות
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <FileEdit className="h-4 w-4" /> מלל מיילים
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Eye className="h-4 w-4" /> תצוגת מיילים
            </TabsTrigger>
            <TabsTrigger value="mailing" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <MailX className="h-4 w-4" /> ניהול תפוצה
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="mt-4">
            <AdminCommunication />
          </TabsContent>
          <TabsContent value="content" className="mt-4">
            <AdminEmailContent />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <AdminEmailPreview />
          </TabsContent>
          <TabsContent value="mailing" className="mt-4">
            <AdminMailingList />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminCommunicationHub;
