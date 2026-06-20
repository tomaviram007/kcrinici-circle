// Admin-only: send a free-form email to one or more recipients via Lovable's
// built-in email infrastructure (queue + verified sender domain).
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

    const { to, subject, html, text } = await req.json();
    if (!to || !subject || (!html && !text)) return json({ error: "missing fields" }, 400);

    const recipientsInput = Array.isArray(to) ? to : [to];
    const recipients = Array.from(
      new Set(
        recipientsInput
          .filter((r: unknown): r is string => typeof r === "string" && r.includes("@"))
          .map((r) => r.trim()),
      ),
    );

    if (recipients.length === 0) return json({ error: "no valid recipients" }, 400);

    const bodyHtml = html || `<p>${(text || "").replace(/\n/g, "<br/>")}</p>`;
    const batchId = crypto.randomUUID();
    const results: Array<{ to: string; ok: boolean; error?: string }> = [];

    for (const r of recipients) {
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "admin-broadcast",
          recipientEmail: r,
          idempotencyKey: `admin-${batchId}-${r.toLowerCase()}`,
          templateData: { subject, bodyHtml },
        },
      });
      if (error) {
        results.push({ to: r, ok: false, error: error.message || String(error) });
      } else {
        results.push({ to: r, ok: !!(data as any)?.success || !!(data as any)?.queued });
      }
    }

    const allOk = results.every((r) => r.ok);
    return json({ ok: allOk, batchId, results }, allOk ? 200 : 502);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
