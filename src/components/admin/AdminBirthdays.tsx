import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthCelebrants from "./birthdays/MonthCelebrants";
import BirthdayEmailEditor from "./birthdays/BirthdayEmailEditor";
import BirthdayScheduleSettings from "./birthdays/BirthdayScheduleSettings";
import BirthdayHistory from "./birthdays/BirthdayHistory";
import { Cake } from "lucide-react";

const AdminBirthdays = () => {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Cake className="h-6 w-6 text-gold" />
        <h2 className="font-serif text-2xl font-bold">ניהול ימי הולדת</h2>
      </div>

      <Tabs defaultValue="month" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto" dir="rtl">
          <TabsTrigger value="month">חוגגי החודש</TabsTrigger>
          <TabsTrigger value="email">תבנית מייל</TabsTrigger>
          <TabsTrigger value="schedule">תזמון ו-WhatsApp</TabsTrigger>
          <TabsTrigger value="history">היסטוריה</TabsTrigger>
        </TabsList>
        <TabsContent value="month" className="mt-4"><MonthCelebrants /></TabsContent>
        <TabsContent value="email" className="mt-4"><BirthdayEmailEditor /></TabsContent>
        <TabsContent value="schedule" className="mt-4"><BirthdayScheduleSettings /></TabsContent>
        <TabsContent value="history" className="mt-4"><BirthdayHistory /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBirthdays;
