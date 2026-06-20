// Admin-only: send a free-form email via Resend and log to email_send_log
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const { to, subject, html, text, replyTo } = await req.json();
    if (!to || !subject || (!html && !text)) return json({ error: "missing fields" }, 400);

    const recipients = Array.isArray(to) ? to : [to];
    const messageId = `admin-${user.id}-${crypto.randomUUID()}`;
    const from = Deno.env.get("BIRTHDAY_FROM_EMAIL") || "מועדון K. קריניצי <onboarding@resend.dev>";

    // pending log row
    for (const r of recipients) {
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "admin-manual",
        recipient_email: r,
        status: "pending",
        metadata: { sender_id: user.id, subject },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html: html || undefined,
        text: text || undefined,
        reply_to: replyTo || undefined,
      }),
    });

    const respJson = await res.json().catch(() => ({}));
    const ok = res.ok;
    const errMsg = ok ? null : (respJson?.message || respJson?.error || `HTTP ${res.status}`);

    for (const r of recipients) {
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "admin-manual",
        recipient_email: r,
        status: ok ? "sent" : "failed",
        error_message: errMsg,
        metadata: { sender_id: user.id, subject, esp_status: res.status, esp_response: respJson },
      });
    }

    return json({ ok, messageId, esp: respJson, status: res.status }, ok ? 200 : 502);
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
