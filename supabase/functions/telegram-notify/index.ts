import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EVENT_LABELS: Record<string, string> = {
  new_member: "🆕 בקשת הצטרפות חדשה למועדון",
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
    if (!value || key === "user_id") continue;
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
    // --- Authentication: verify caller identity ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User is authenticated - proceed
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

    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };

    if (event_type === "new_member" && data.user_id) {
      payload.reply_markup = {
        inline_keyboard: [
          [
            { text: "✅ אשר חבר", callback_data: `approve:${data.user_id}` },
            { text: "❌ דחה בקשה", callback_data: `reject:${data.user_id}` },
          ],
        ],
      };
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Telegram API error [${response.status}]:`, JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Telegram API error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telegram notify error:", msg);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
