import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find events happening tomorrow
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { data: events, error: eventsErr } = await supabase
      .from("events")
      .select("id, title, event_date, location, description")
      .gte("event_date", tomorrowStart.toISOString())
      .lte("event_date", tomorrowEnd.toISOString());

    if (eventsErr) throw eventsErr;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No events tomorrow", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;

    for (const event of events) {
      // Get RSVPs for this event
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "attending");

      if (!rsvps || rsvps.length === 0) continue;

      const userIds = rsvps.map(r => r.user_id);

      // Get profiles (phone numbers)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      // Get emails from auth.users
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      const emailMap = new Map(
        (authUsers || [])
          .filter(u => userIds.includes(u.id))
          .map(u => [u.id, u.email])
      );

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Check which reminders were already sent
      const { data: sentReminders } = await supabase
        .from("event_reminders_log")
        .select("user_id, channel")
        .eq("event_id", event.id);

      const sentSet = new Set((sentReminders || []).map(r => `${r.user_id}:${r.channel}`));

      const eventDate = new Date(event.event_date).toLocaleDateString("he-IL", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      });

      for (const userId of userIds) {
        const profile = profileMap.get(userId);
        const email = emailMap.get(userId);
        const name = profile?.full_name || "חבר/ה";

        const reminderText = `🔔 תזכורת: ${event.title}\n📅 מחר, ${eventDate}\n📍 ${event.location || "לא צוין מיקום"}\n\nנתראה שם! 🎉`;
        const reminderHTML = `
          <div dir="rtl" style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:30px 20px;background:#1a1410;color:#d9c9a8;border-radius:12px;">
            <h2 style="color:#D4AF37;text-align:center;">🔔 תזכורת לאירוע</h2>
            <h3 style="color:#ffffff;text-align:center;">${event.title}</h3>
            <p style="text-align:center;color:#d9c9a8;">📅 מחר, ${eventDate}</p>
            <p style="text-align:center;color:#d9c9a8;">📍 ${event.location || "לא צוין מיקום"}</p>
            <p style="text-align:center;color:#D4AF37;margin-top:20px;">נתראה שם! 🎉</p>
            <p style="text-align:center;margin-top:24px;font-size:12px;color:#8a7a5a;">מועדון הגברים של ק. קריניצי</p>
          </div>`;

        // WhatsApp
        if (profile?.phone && !sentSet.has(`${userId}:whatsapp`)) {
          try {
            await sendWhatsApp(profile.phone, reminderText);
            await supabase.from("event_reminders_log").insert({
              event_id: event.id, user_id: userId, channel: "whatsapp",
            });
            totalSent++;
          } catch (e) { console.error("WhatsApp error:", e); }
        }

        // Telegram (summary to admin channel)
        if (!sentSet.has(`${userId}:telegram`)) {
          // We mark as sent per user even though it goes to admin channel
          await supabase.from("event_reminders_log").insert({
            event_id: event.id, user_id: userId, channel: "telegram",
          }).then(() => {}).catch(() => {});
        }

        // Email
        if (email && !sentSet.has(`${userId}:email`)) {
          try {
            await sendEmail(email, `תזכורת: ${event.title} - מחר!`, reminderHTML);
            await supabase.from("event_reminders_log").insert({
              event_id: event.id, user_id: userId, channel: "email",
            });
            totalSent++;
          } catch (e) { console.error("Email error:", e); }
        }
      }

      // Send one Telegram summary to admin
      const attendeeNames = userIds
        .map(id => profileMap.get(id)?.full_name || "לא ידוע")
        .join(", ");
      await sendTelegramSummary(event.title, eventDate, event.location, rsvps.length, attendeeNames);
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("event-reminders error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── WhatsApp via Green API ──
async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
  const token = Deno.env.get("GREEN_API_TOKEN");
  if (!instanceId || !token) return;

  // Clean phone number
  const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, "");
  const chatId = (cleanPhone.startsWith("0") ? "972" + cleanPhone.slice(1) : cleanPhone) + "@c.us";

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
    throw new Error(`Green API error: ${err}`);
  }
}

// ── Email via Resend ──
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "מועדון ק. קריניצי <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

// ── Telegram summary to admin ──
async function sendTelegramSummary(
  title: string, date: string, location: string | null, count: number, names: string
): Promise<void> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) return;

  const text = [
    `🔔 <b>תזכורת אירוע - מחר!</b>`,
    ``,
    `<b>אירוע:</b> ${title}`,
    `<b>תאריך:</b> ${date}`,
    `<b>מיקום:</b> ${location || "לא צוין"}`,
    `<b>מספר מאשרים:</b> ${count}`,
    `<b>שמות:</b> ${names}`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}
