import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  placement: string;
  start_date: string;
  end_date: string;
  impression_count: number;
  click_count: number;
  price: number;
  is_active: boolean;
}

interface Advertiser {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
}

interface AdReportExportProps {
  advertiser: Advertiser;
  campaigns: Campaign[];
}

const PLACEMENT_LABELS: Record<string, string> = {
  hero: "Hero – ראש העמוד",
  sidebar: "סרגל צד",
  inline: "בין תכנים",
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("he-IL");

const exportCSV = (advertiser: Advertiser, campaigns: Campaign[]) => {
  const BOM = "\uFEFF";
  const headers = ["כותרת קמפיין", "מיקום", "תאריך התחלה", "תאריך סיום", "צפיות", "קליקים", "CTR %", "מחיר (₪)", "סטטוס"];
  const rows = campaigns.map(c => {
    const ctr = c.impression_count > 0 ? ((c.click_count / c.impression_count) * 100).toFixed(2) : "0";
    const now = new Date();
    const status = !c.is_active ? "מושבת" : new Date(c.end_date) < now ? "הסתיים" : new Date(c.start_date) > now ? "מתוזמן" : "פעיל";
    return [c.title, PLACEMENT_LABELS[c.placement] || c.placement, formatDate(c.start_date), formatDate(c.end_date), c.impression_count, c.click_count, ctr, c.price, status];
  });

  const totalImpressions = campaigns.reduce((s, c) => s + c.impression_count, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.click_count, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.price, 0);
  const totalCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
  rows.push(["סה״כ", "", "", "", totalImpressions, totalClicks, totalCTR, totalRevenue, ""]);

  const csv = BOM + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `דוח_${advertiser.business_name}_${formatDate(new Date().toISOString())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportPDF = (advertiser: Advertiser, campaigns: Campaign[]) => {
  const totalImpressions = campaigns.reduce((s, c) => s + c.impression_count, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.click_count, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.price, 0);
  const totalCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<title>דוח פרסום – ${advertiser.business_name}</title>
<style>
body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; direction: rtl; }
h1 { color: #b8860b; border-bottom: 2px solid #b8860b; padding-bottom: 8px; }
h2 { color: #333; margin-top: 24px; }
.meta { color: #666; margin-bottom: 24px; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th { background: #f5f5f0; padding: 10px 8px; text-align: right; border-bottom: 2px solid #ddd; font-size: 13px; }
td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
.totals td { font-weight: bold; background: #f9f9f5; border-top: 2px solid #b8860b; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
.kpi { background: #f5f5f0; border-radius: 8px; padding: 16px; text-align: center; }
.kpi-value { font-size: 24px; font-weight: bold; color: #b8860b; }
.kpi-label { font-size: 12px; color: #666; margin-top: 4px; }
.footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
</style>
</head>
<body>
<h1>דוח ביצועי פרסום</h1>
<div class="meta">
<strong>מפרסם:</strong> ${advertiser.business_name}<br>
<strong>איש קשר:</strong> ${advertiser.contact_name || "—"} | <strong>טלפון:</strong> ${advertiser.phone || "—"}<br>
<strong>תאריך הפקה:</strong> ${formatDate(new Date().toISOString())}
</div>

<div class="kpi-grid">
<div class="kpi"><div class="kpi-value">${campaigns.length}</div><div class="kpi-label">קמפיינים</div></div>
<div class="kpi"><div class="kpi-value">${totalImpressions.toLocaleString()}</div><div class="kpi-label">צפיות</div></div>
<div class="kpi"><div class="kpi-value">${totalClicks.toLocaleString()}</div><div class="kpi-label">קליקים</div></div>
<div class="kpi"><div class="kpi-value">${totalCTR}%</div><div class="kpi-label">CTR</div></div>
</div>

<h2>פירוט קמפיינים</h2>
<table>
<thead><tr><th>קמפיין</th><th>מיקום</th><th>תקופה</th><th>צפיות</th><th>קליקים</th><th>CTR</th><th>מחיר</th></tr></thead>
<tbody>
${campaigns.map(c => {
  const ctr = c.impression_count > 0 ? ((c.click_count / c.impression_count) * 100).toFixed(2) : "0";
  return `<tr><td>${c.title}</td><td>${PLACEMENT_LABELS[c.placement] || c.placement}</td><td>${formatDate(c.start_date)} – ${formatDate(c.end_date)}</td><td>${c.impression_count.toLocaleString()}</td><td>${c.click_count.toLocaleString()}</td><td>${ctr}%</td><td>₪${c.price.toLocaleString()}</td></tr>`;
}).join("")}
<tr class="totals"><td>סה״כ</td><td></td><td></td><td>${totalImpressions.toLocaleString()}</td><td>${totalClicks.toLocaleString()}</td><td>${totalCTR}%</td><td>₪${totalRevenue.toLocaleString()}</td></tr>
</tbody>
</table>

<div class="footer">דוח זה הופק אוטומטית ממערכת ניהול הפרסום – מועדון קריית קרניצי</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => { win.print(); };
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

const AdReportExport = ({ advertiser, campaigns }: AdReportExportProps) => {
  if (!campaigns.length) return null;

  return (
    <div className="flex gap-2 mt-3">
      <Button size="sm" variant="outline" onClick={() => exportPDF(advertiser, campaigns)} className="gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        הפק דוח PDF
      </Button>
      <Button size="sm" variant="outline" onClick={() => exportCSV(advertiser, campaigns)} className="gap-1.5">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        ייצא Excel
      </Button>
    </div>
  );
};

export default AdReportExport;
