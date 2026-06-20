import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "tomaviram2187@gmail.com";

function escapeHtml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("he-IL", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem",
    });
  } catch { return value; }
}

function shell(title: string, rows: Array<[string, string]>, intro?: string): string {
  const r = rows.map(([l, v]) => `<tr><td style="padding:6px 12px;font-weight:bold;color:#D4AF37;">${escapeHtml(l)}</td><td style="padding:6px 12px;color:#d9c9a8;">${escapeHtml(v)}</td></tr>`).join("");
  return `<div dir="rtl" style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:30px 20px;background:#1a1410;color:#d9c9a8;border-radius:12px;">
    <h2 style="color:#D4AF37;text-align:center;margin-bottom:20px;">${escapeHtml(title)}</h2>
    ${intro ? `<p style="text-align:center;margin-bottom:20px;">${escapeHtml(intro)}</p>` : ""}
    <table style="width:100%;border-collapse:collapse;">${r}</table>
    <p style="text-align:center;margin-top:24px;font-size:12px;color:#8a7a5a;">מועדון הגברים של ק.קרניצי</p>
  </div>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { console.warn("Resend not configured"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "מועדון ק.קרניצי <onboarding@resend.dev>", to: [to], subject, html }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
}

async function sendWhatsApp(text: string) {
  const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
  const token = Deno.env.get("GREEN_API_TOKEN");
  const phone = Deno.env.get("GREEN_API_PHONE");
  if (!instanceId || !token || !phone) return;
  const chatId = phone.replace(/\+/g, "") + "@c.us";
  await fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message: text }),
  }).catch((e) => console.error("Green API:", e));
}

async function sendTelegram(text: string) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch((e) => console.error("Telegram:", e));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { event_id, action = "confirmed" } = await req.json();
    if (!event_id) {
      return new Response(JSON.stringify({ error: "Missing event_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: event }, { data: profile }] = await Promise.all([
      admin.from("events").select("title, description, event_date, end_date, location, waze_url").eq("id", event_id).maybeSingle(),
      admin.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const memberName = profile?.full_name || user.email || "חבר";
    const memberEmail = user.email || "";
    const memberPhone = profile?.phone || "";

    const isCancel = action === "cancelled";
    const adminTitle = isCancel ? "❌ ביטול אישור הגעה" : "🎟️ אישור הגעה חדש";
    const adminRows: Array<[string, string]> = [
      ["שם החבר", memberName],
      ["אימייל", memberEmail],
      ["טלפון", memberPhone || ","],
      ["אירוע", event.title],
      ["תאריך", formatDate(event.event_date)],
    ];
    if (event.location) adminRows.push(["מיקום", event.location]);

    const memberTitle = isCancel ? "ביטול אישור הגעה" : "✅ אישור הגעה לאירוע";
    const memberRows: Array<[string, string]> = [
      ["אירוע", event.title],
      ["תאריך ושעה", formatDate(event.event_date) + (event.end_date ? ` – ${new Date(event.end_date).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" })}` : "")],
    ];
    if (event.location) memberRows.push(["מיקום", event.location]);
    if (event.waze_url) memberRows.push(["ניווט ב-Waze", event.waze_url]);
    if (event.description) memberRows.push(["פרטים", event.description]);

    const memberIntro = isCancel
      ? `שלום ${memberName}, ביטלת את אישור ההגעה לאירוע. נשמח לראותך באירועים הבאים!`
      : `שלום ${memberName}, אישור ההגעה שלך נקלט. נתראה באירוע 🎉`;

    const tgText = `<b>${adminTitle}</b>\n` + adminRows.map(([l, v]) => `<b>${escapeHtml(l)}:</b> ${escapeHtml(v)}`).join("\n");
    const waText = `${adminTitle}\n` + adminRows.map(([l, v]) => `*${l}:* ${v}`).join("\n");

    await Promise.allSettled([
      sendEmail(ADMIN_EMAIL, `${adminTitle} – ${event.title}`, shell(adminTitle, adminRows)),
      memberEmail ? sendEmail(memberEmail, `${memberTitle} – ${event.title}`, shell(memberTitle, memberRows, memberIntro)) : Promise.resolve(),
      sendTelegram(tgText),
      sendWhatsApp(waText),
    ]);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("notify-rsvp error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
