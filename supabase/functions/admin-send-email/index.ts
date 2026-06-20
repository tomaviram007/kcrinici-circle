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

    const recipientsInput = Array.isArray(to) ? to : [to];

    // Filter out suppressed recipients
    const { data: suppRows } = await supabase
      .from("suppressed_emails")
      .select("email")
      .in("email", recipientsInput.map((r: string) => r.toLowerCase()));
    const suppressedSet = new Set((suppRows || []).map((r: any) => r.email.toLowerCase()));
    const recipients = recipientsInput.filter((r: string) => !suppressedSet.has(r.toLowerCase()));
    const skipped = recipientsInput.filter((r: string) => suppressedSet.has(r.toLowerCase()));

    if (recipients.length === 0) {
      return json({ ok: false, skipped, error: "all recipients are unsubscribed" }, 200);
    }

    const messageId = `admin-${user.id}-${crypto.randomUUID()}`;
    const from = Deno.env.get("BIRTHDAY_FROM_EMAIL") || "מועדון K. קריניצי <onboarding@resend.dev>";

    // Build per-recipient HTML with unsubscribe footer + token
    const siteUrl = "https://kcrinici.com";
    async function withFooter(recipient: string, baseHtml: string | undefined, baseText: string | undefined) {
      const lower = recipient.toLowerCase();
      const { data: existing } = await supabase
        .from("email_unsubscribe_tokens").select("token").eq("email", lower).maybeSingle();
      let tok = existing?.token;
      if (!tok) {
        tok = crypto.randomUUID().replace(/-/g, "");
        await supabase.from("email_unsubscribe_tokens").insert({ email: lower, token: tok });
      }
      const unsubUrl = `${siteUrl}/unsubscribe?token=${tok}`;
      const footerHtml = `<div dir="rtl" style="margin-top:24px;padding-top:16px;border-top:1px solid #e8e1d4;font-family:Arial,sans-serif;font-size:12px;color:#968c7e;text-align:center"><a href="${unsubUrl}" style="color:#4B2C20">הסרה מרשימת התפוצה</a></div>`;
      const footerText = `\n\n---\nהסרה מרשימת התפוצה: ${unsubUrl}`;
      return {
        html: baseHtml ? baseHtml + footerHtml : undefined,
        text: baseText ? baseText + footerText : undefined,
      };
    }

    // Send one email per recipient so each gets a unique unsubscribe footer
    const results: Array<{ to: string; ok: boolean; status: number; resp: any }> = [];
    for (const r of recipients) {
      // Pending log
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "admin-manual",
        recipient_email: r,
        status: "pending",
        metadata: { sender_id: user.id, subject },
      });

      const { html: rHtml, text: rText } = await withFooter(r, html, text);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        },
        body: JSON.stringify({
          from,
          to: [r],
          subject,
          html: rHtml,
          text: rText,
          reply_to: replyTo || undefined,
        }),
      });
      const respJson = await res.json().catch(() => ({}));
      const ok = res.ok;
      const errMsg = ok ? null : (respJson?.message || respJson?.error || `HTTP ${res.status}`);
      results.push({ to: r, ok, status: res.status, resp: respJson });

      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "admin-manual",
        recipient_email: r,
        status: ok ? "sent" : "failed",
        error_message: errMsg,
        metadata: { sender_id: user.id, subject, esp_status: res.status, esp_response: respJson },
      });
    }

    const allOk = results.every((r) => r.ok);
    return json({ ok: allOk, messageId, results, skipped }, allOk ? 200 : 502);
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
