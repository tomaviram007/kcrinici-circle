// Public unsubscribe endpoint. No JWT required.
// GET  /handle-unsubscribe?token=...&email=... -> resolves email for confirmation UI
// POST /handle-unsubscribe { token?, email?, reason? } -> suppress & notify admin
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let token: string | null = null;
    let email: string | null = null;
    let reason = "user_request";

    if (req.method === "GET") {
      const u = new URL(req.url);
      token = u.searchParams.get("token");
      email = u.searchParams.get("email");
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token ?? null;
      email = body.email ?? null;
      reason = body.reason ?? reason;
    }

    // Resolve email from token if provided
    if (token && !email) {
      const { data } = await supabase
        .from("email_unsubscribe_tokens")
        .select("email")
        .eq("token", token)
        .maybeSingle();
      email = data?.email ?? null;
    }

    if (!email) return json({ error: "missing email or token" }, 400);
    email = email.trim().toLowerCase();

    if (req.method === "GET") {
      return json({ email });
    }

    // POST — perform suppression
    await supabase.rpc("mark_email_suppressed", {
      _email: email,
      _reason: "unsubscribe",
      _metadata: { user_reason: reason, source: "public_form", at: new Date().toISOString() },
    });

    if (token) {
      await supabase
        .from("email_unsubscribe_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);
    }

    // Notify admin via Resend
    try {
      const adminEmail = Deno.env.get("ADMIN_NOTIFY_EMAIL") || "tomaviram2187@gmail.com";
      const from = Deno.env.get("BIRTHDAY_FROM_EMAIL") || "מועדון K. קריניצי <onboarding@resend.dev>";
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        },
        body: JSON.stringify({
          from,
          to: [adminEmail],
          subject: `בקשת הסרה מרשימת תפוצה: ${email}`,
          html: `
            <div dir="rtl" style="font-family:Arial,sans-serif;padding:16px">
              <h2 style="color:#4B2C20">בקשה להסרה מרשימת תפוצה</h2>
              <p><b>אימייל:</b> ${email}</p>
              <p><b>סיבה:</b> ${reason || "לא צוינה"}</p>
              <p><b>זמן:</b> ${new Date().toLocaleString("he-IL")}</p>
              <p style="color:#666;font-size:13px">המשתמש סומן כמושעה ולא יקבל מיילים נוספים. ניתן לנהל זאת מתוך לוח הניהול → תקשורת → ניהול תפוצה.</p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error("admin notify failed", e);
    }

    // Notify via Telegram (best-effort)
    try {
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chat = Deno.env.get("TELEGRAM_CHAT_ID");
      if (token && chat) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chat,
            text: `🚫 בקשת הסרה מרשימת תפוצה\nאימייל: ${email}\nסיבה: ${reason || "—"}`,
          }),
        });
      }
    } catch (_) { /* ignore */ }

    return json({ ok: true, email });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
