import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Escape HTML special characters to prevent injection in Telegram HTML / email
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EVENT_LABELS: Record<string, string> = {
  new_member: "🆕 בקשת הצטרפות חדשה למועדון",
  member_approved: "✅ חבר אושר למועדון",
  new_announcement: "📢 מודעה חדשה פורסמה",
  new_job: "💼 משרה חדשה פורסמה",
  new_event: "🎉 אירוע חדש נוצר",
  new_deal: "🏷️ הטבה חדשה הוגשה לאישור",
  new_secondhand: "📦 מודעת יד שנייה חדשה פורסמה",
  new_realestate: "🏠 מודעת נדל״ן חדשה פורסמה",
  new_gallery_album: "🖼️ אלבום חדש נוסף לגלריה",
};

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
  business_name: "שם העסק",
  discount_label: "הנחה",
  price: "מחיר",
  condition: "מצב",
  publisher: "מפרסם",
  listing_type: "סוג מודעה",
  property_type: "סוג נכס",
  rooms: "חדרים",
  photos: "תמונות",
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("he-IL", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function buildFields(data: Record<string, any>): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = [];
  for (const [key, value] of Object.entries(data)) {
    if (!value || key === "user_id") continue;
    const label = fieldLabels[key] || key;
    const displayValue = key === "date" ? formatDate(value) : String(value);
    fields.push({ label, value: displayValue });
  }
  return fields;
}

// ── Telegram ──
function formatTelegramHTML(eventType: string, data: Record<string, any>): string {
  const title = EVENT_LABELS[eventType] || `📌 ${escapeHtml(eventType)}`;
  const lines = [`<b>${title}</b>`, ""];
  for (const { label, value } of buildFields(data)) {
    lines.push(`<b>${escapeHtml(label)}:</b> ${escapeHtml(value)}`);
  }
  return lines.join("\n");
}

async function sendTelegram(eventType: string, data: Record<string, any>): Promise<void> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) {
    console.warn("Telegram not configured, skipping");
    return;
  }

  const text = formatTelegramHTML(eventType, data);
  const payload: any = { chat_id: chatId, text, parse_mode: "HTML" };

  if (eventType === "new_member" && data.user_id) {
    payload.reply_markup = {
      inline_keyboard: [[
        { text: "✅ אשר חבר", callback_data: `approve:${data.user_id}` },
        { text: "❌ דחה בקשה", callback_data: `reject:${data.user_id}` },
      ]],
    };
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error("Telegram error:", JSON.stringify(err));
  }
}

// ── Email (Resend) ──
function formatEmailHTML(eventType: string, data: Record<string, any>): string {
  const title = EVENT_LABELS[eventType] || escapeHtml(eventType);
  const rows = buildFields(data)
    .map(({ label, value }) => `<tr><td style="padding:6px 12px;font-weight:bold;color:#D4AF37;">${escapeHtml(label)}</td><td style="padding:6px 12px;color:#d9c9a8;">${escapeHtml(value)}</td></tr>`)
    .join("");

  return `
    <div dir="rtl" style="font-family:'Tel Aviv','Assistant','Heebo',Arial,sans-serif;max-width:520px;margin:0 auto;padding:30px 20px;background:#1a1410;color:#d9c9a8;border-radius:12px;">
      <h2 style="color:#D4AF37;text-align:center;margin-bottom:20px;">${title}</h2>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="text-align:center;margin-top:24px;font-size:12px;color:#8a7a5a;">מועדון הגברים של ק.קרניצי</p>
    </div>
  `;
}

async function sendEmail(eventType: string, data: Record<string, any>): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("Resend not configured, skipping email");
    return;
  }

  const title = EVENT_LABELS[eventType] || eventType;
  const html = formatEmailHTML(eventType, data);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "מועדון ק.קרניצי <onboarding@resend.dev>",
      to: ["tomaviram2187@gmail.com"],
      subject: `🔔 ${title}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend error:", JSON.stringify(err));
  }
}

// ── WhatsApp (Green API) ──
function formatWhatsAppText(eventType: string, data: Record<string, any>): string {
  const title = EVENT_LABELS[eventType] || eventType;
  const lines = [title, ""];
  for (const { label, value } of buildFields(data)) {
    lines.push(`*${label}:* ${value}`);
  }
  return lines.join("\n");
}

async function sendWhatsApp(eventType: string, data: Record<string, any>): Promise<void> {
  const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
  const token = Deno.env.get("GREEN_API_TOKEN");
  const phone = Deno.env.get("GREEN_API_PHONE");

  if (!instanceId || !token || !phone) {
    console.warn("Green API not configured, skipping WhatsApp");
    return;
  }

  const message = formatWhatsAppText(eventType, data);
  const chatId = phone.replace(/\+/g, "") + "@c.us";

  const res = await fetch(
    `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Green API error:", err);
  }
}

// ── Guest publishing ──
// Guests can post on some boards without an account, and the admin wants to hear
// about those too. Rather than trusting whatever an anonymous caller sends, we
// look the ad up with the service role and build the message from the stored row.
// So an anonymous call can only announce something that really is on the board.
const GUEST_EVENT_TABLES: Record<string, string> = {
  new_secondhand: "secondhand_items",
  new_realestate: "realestate_listings",
};

async function loadGuestListing(
  eventType: string,
  title: unknown
): Promise<Record<string, any> | null> {
  const table = GUEST_EVENT_TABLES[eventType];
  if (!table || typeof title !== "string" || !title.trim()) return null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("title", title.trim())
    .is("created_by", null)
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const common = {
    title: data.title,
    description: data.description || undefined,
    price: data.price != null ? `₪${data.price}` : undefined,
    publisher: data.guest_name || "אורח",
    phone: data.contact_phone || undefined,
  };

  if (eventType === "new_realestate") {
    return {
      ...common,
      listing_type: data.listing_type === "sale" ? "למכירה" : "להשכרה",
      property_type: data.property_type || undefined,
      rooms: data.rooms || undefined,
      location: data.address || undefined,
    };
  }

  return { ...common, category: data.category || undefined, condition: data.condition || undefined };
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const event_type = body?.event_type;
    let data = body?.data;

    if (!event_type || !data) {
      return new Response(
        JSON.stringify({ error: "Missing event_type or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No signed in user means a guest ad. Only the guest boards are allowed here,
    // and only with the content that was actually saved.
    if (!user) {
      const listing = await loadGuestListing(event_type, data.title);
      if (!listing) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      data = listing;
    }

    // Send to all channels in parallel – failures are independent
    const results = await Promise.allSettled([
      sendTelegram(event_type, data),
      sendEmail(event_type, data),
      sendWhatsApp(event_type, data),
    ]);

    const summary = {
      telegram: results[0].status,
      email: results[1].status,
      whatsapp: results[2].status,
    };

    return new Response(
      JSON.stringify({ success: true, channels: summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-notify error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
