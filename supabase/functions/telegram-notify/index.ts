import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EVENT_LABELS: Record<string, string> = {
  new_member: "🆕 חבר חדש נרשם למועדון",
  member_approved: "✅ חבר אושר למועדון",
  new_announcement: "📢 מודעה חדשה פורסמה",
  new_job: "💼 משרה חדשה פורסמה",
  new_event: "🎉 אירוע חדש נוצר",
};

function formatMessage(eventType: string, data: Record<string, any>): string {
  const title = EVENT_LABELS[eventType] || `📌 ${eventType}`;
  let lines = [`<b>${title}</b>`, ""];

  const fieldLabels: Record<string, string> = {
    name: "שם",
    phone: "טלפון",
    email: "אימייל",
    address: "כתובת",
    profession: "מקצוע",
    title: "כותרת",
    content: "תוכן",
    description: "תיאור",
    category: "קטגוריה",
    company: "חברה",
    location: "מיקום",
    date: "תאריך",
  };

  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const label = fieldLabels[key] || key;
    let displayValue = String(value);
    if (key === "date") {
      try { displayValue = new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch {}
    }
    lines.push(`<b>${label}:</b> ${displayValue}`);
  }

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not configured");

    const body = await req.json();
    const { event_type, data } = body;

    if (!event_type || !data) {
      return new Response(
        JSON.stringify({ error: "Missing event_type or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = formatMessage(event_type, data);

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Telegram API error [${response.status}]:`, JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Telegram API error", details: result }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telegram notify error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
