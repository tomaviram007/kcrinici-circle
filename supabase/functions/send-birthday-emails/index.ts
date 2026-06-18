import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Returns the current hour (0-23) in Asia/Jerusalem
function jerusalemHour(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10);
}

// Returns {month, day, year} in Asia/Jerusalem; for Feb 29 in non-leap years sends on Feb 28.
function jerusalemDateParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const obj: Record<string, string> = {};
  for (const p of parts) obj[p.type] = p.value;
  return {
    year: parseInt(obj.year, 10),
    month: parseInt(obj.month, 10),
    day: parseInt(obj.day, 10),
  };
}

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: shared cron secret OR manual admin trigger via service role bearer is OK
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  if (cronSecret && provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(
      JSON.stringify({
        error: "email_service_not_configured",
        message: "RESEND_API_KEY חסר. נדרש להגדיר את שירות המיילים לפני הפעלת השליחה.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Only send at 08:00 Israel time (window: hour === 8). Allow force=1 for manual runs.
  const hour = jerusalemHour();
  if (!force && hour !== 8) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: `not 08:00 Asia/Jerusalem (hour=${hour})` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { year, month, day } = jerusalemDateParts();

  // Collect target month/day pairs: today, plus if today is Feb 28 in a non-leap year also include Feb 29
  const targets: Array<{ m: number; d: number }> = [{ m: month, d: day }];
  if (month === 2 && day === 28 && !isLeapYear(year)) {
    targets.push({ m: 2, d: 29 });
  }

  // Load template
  const { data: tplRow } = await supabase
    .from("birthday_email_template")
    .select("subject, body_html, is_active")
    .limit(1)
    .maybeSingle();

  if (!tplRow || !tplRow.is_active) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: "template_inactive" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const fromAddress = Deno.env.get("BIRTHDAY_FROM_EMAIL") || "מועדון הגברים <onboarding@resend.dev>";

  // Collect recipients
  const recipients: Array<{
    user_id: string;
    first_name: string;
    full_name: string;
    email: string;
  }> = [];

  for (const t of targets) {
    const { data, error } = await supabase.rpc("get_birthdays_for_date", {
      _month: t.m,
      _day: t.d,
    });
    if (error) {
      console.error("get_birthdays_for_date error", error);
      continue;
    }
    for (const r of data ?? []) {
      if (!r.is_approved) continue;
      if (!r.send_birthday_email) continue;
      if (!r.email_opt_in) continue;
      if (!r.email) continue;
      recipients.push({
        user_id: r.user_id,
        first_name: r.first_name || "",
        full_name: r.full_name || "",
        email: r.email,
      });
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const r of recipients) {
    // Insert "pending" row first — UNIQUE(user_id, sent_year) prevents duplicates.
    const { error: insertErr } = await supabase.from("birthday_email_log").insert({
      user_id: r.user_id,
      recipient_email: r.email,
      sent_year: year,
      status: "pending",
    });

    if (insertErr) {
      // 23505 unique_violation = already sent (or attempted) this year
      if ((insertErr as any).code === "23505") {
        skipped++;
        continue;
      }
      failed++;
      errors.push({ email: r.email, error: insertErr.message });
      continue;
    }

    const subject = renderTemplate(tplRow.subject, {
      first_name: r.first_name,
      full_name: r.full_name,
    });
    const html = renderTemplate(tplRow.body_html, {
      first_name: r.first_name,
      full_name: r.full_name,
    });

    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [r.email],
          subject,
          html,
        }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        await supabase
          .from("birthday_email_log")
          .update({
            status: "failed",
            error_message: (body?.message || `HTTP ${resp.status}`).toString().slice(0, 500),
          })
          .eq("user_id", r.user_id)
          .eq("sent_year", year);
        failed++;
        errors.push({ email: r.email, error: body?.message || `HTTP ${resp.status}` });
      } else {
        await supabase
          .from("birthday_email_log")
          .update({ status: "sent", resend_id: body?.id ?? null })
          .eq("user_id", r.user_id)
          .eq("sent_year", year);
        sent++;
      }
    } catch (e: any) {
      await supabase
        .from("birthday_email_log")
        .update({ status: "failed", error_message: (e?.message || String(e)).slice(0, 500) })
        .eq("user_id", r.user_id)
        .eq("sent_year", year);
      failed++;
      errors.push({ email: r.email, error: e?.message || String(e) });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      ran_at_iso: new Date().toISOString(),
      jerusalem_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      targets,
      total_candidates: recipients.length,
      sent,
      skipped_already_sent: skipped,
      failed,
      errors: errors.slice(0, 20),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
