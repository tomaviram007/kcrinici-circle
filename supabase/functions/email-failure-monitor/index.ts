// Cron: scan email_send_log for new failures and alert admins (Telegram + Email)
// Specifically flags SPF/DKIM/DMARC/bounce/complaint errors.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FAILURE_STATUSES = ["failed", "dlq", "bounced", "complained"];
const AUTH_KEYWORDS = /(spf|dkim|dmarc|domainkeys|authentication|reject|bounce|complain|blocked)/i;

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: stateRow } = await supabase
      .from("email_alert_state").select("last_alerted_at").eq("id", true).maybeSingle();
    const since = stateRow?.last_alerted_at || new Date(Date.now() - 3600_000).toISOString();

    const { data: rows, error } = await supabase
      .from("email_send_log")
      .select("message_id,template_name,recipient_email,status,error_message,created_at,metadata")
      .in("status", FAILURE_STATUSES)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    if (!rows || rows.length === 0) {
      return json({ ok: true, new_failures: 0 });
    }

    const authIssues = rows.filter(r => AUTH_KEYWORDS.test(r.error_message || ""));
    const lines = rows.map(r => {
      const tag = AUTH_KEYWORDS.test(r.error_message || "") ? "🔐 AUTH" : "❌";
      return `${tag} [${r.status}] ${r.template_name || "-"} → ${r.recipient_email}\n   ${(r.error_message || "no message").slice(0, 180)}`;
    }).join("\n\n");
    const header = `🚨 ${rows.length} כשלי שליחת מייל ב-K.Krinici${authIssues.length ? ` (כולל ${authIssues.length} כשלי SPF/DKIM/DMARC/Bounce)` : ""}`;
    const body = `${header}\n\n${lines}`;

    // Telegram alert
    const tgToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const tgChat = Deno.env.get("TELEGRAM_CHAT_ID");
    if (tgToken && tgChat) {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChat, text: body.slice(0, 3800), disable_web_page_preview: true }),
      }).catch(e => console.error("telegram", e));
    }

    // Email alert to all admins
    try {
      const { data: admins } = await supabase
        .from("user_roles").select("user_id").eq("role", "admin");
      const ids = (admins || []).map(a => a.user_id);
      if (ids.length) {
        const emails: string[] = [];
        for (const uid of ids) {
          const { data: u } = await supabase.auth.admin.getUserById(uid);
          if (u?.user?.email) emails.push(u.user.email);
        }
        if (emails.length) {
          const html = `<div dir="rtl" style="font-family:'Tel Aviv','Assistant','Heebo',Arial,sans-serif;line-height:1.6">
            <h2 style="color:#b91c1c">🚨 כשלי שליחת מייל</h2>
            <p>${rows.length} כשלים מאז ${new Date(since).toLocaleString("he-IL")}.</p>
            ${authIssues.length ? `<p style="color:#b91c1c"><strong>⚠️ ${authIssues.length} כשלי SPF/DKIM/DMARC/Bounce, בדוק את הגדרות הדומיין notify.kcrinici.com ב-Cloud → Emails.</strong></p>` : ""}
            <pre style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:12px">${escapeHtml(lines)}</pre>
            <p style="color:#888;font-size:12px">לוגים מלאים: שולחן המנהל → תקשורת.</p>
          </div>`;
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
            },
            body: JSON.stringify({
              from: Deno.env.get("BIRTHDAY_FROM_EMAIL") || "K.Krinici Alerts <onboarding@resend.dev>",
              to: emails,
              subject: `🚨 ${rows.length} כשלי שליחת מייל${authIssues.length ? ", כולל בעיות אימות דומיין" : ""}`,
              html,
            }),
          }).catch(e => console.error("email alert", e));
        }
      }
    } catch (e) {
      console.error("admin email lookup", e);
    }

    // Advance watermark
    const latest = rows[0].created_at;
    await supabase.from("email_alert_state")
      .upsert({ id: true, last_alerted_at: latest }, { onConflict: "id" });

    return json({ ok: true, new_failures: rows.length, auth_issues: authIssues.length });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
