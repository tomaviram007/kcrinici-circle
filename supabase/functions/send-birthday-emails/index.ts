import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jerusalemHour(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10);
}

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
  return (tpl || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

interface TemplateRow {
  subject: string;
  body_html: string;
  is_active: boolean;
  preview_text?: string | null;
  heading?: string | null;
  signature?: string | null;
  from_name?: string | null;
  reply_to?: string | null;
  logo_url?: string | null;
}

async function sendOne(opts: {
  supabaseUrl: string;
  serviceRoleKey: string;
  to: string;
  subject: string;
  templateData: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<{ ok: boolean; status: number; body: any }> {
  const resp = await fetch(`${opts.supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.serviceRoleKey}`,
      apikey: opts.serviceRoleKey,
    },
    body: JSON.stringify({
      templateName: "birthday-greeting",
      recipientEmail: opts.to,
      idempotencyKey: opts.idempotencyKey,
      purpose: "transactional",
      templateData: opts.templateData,
    }),
  });
  const body = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, body };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const isTest = url.searchParams.get("test") === "1";
  const resend = url.searchParams.get("resend") === "1";
  const onlyUserId = url.searchParams.get("user_id");
  const testTo = url.searchParams.get("to");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Auth: cron secret OR service-role bearer OR authenticated admin
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let isAuthed = false;
  if (cronSecret && provided === cronSecret) isAuthed = true;
  if (!isAuthed && token && token === serviceRoleKey) isAuthed = true;
  if (!isAuthed && token) {
    const { data: userRes } = await supabase.auth.getUser(token);
    if (userRes?.user) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) isAuthed = true;
    }
  }
  if (!isAuthed) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load settings
  const { data: settingsRows } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["birthday_send_hour", "birthday_leap_mode", "club_name"]);
  const settings: Record<string, string> = {};
  for (const r of settingsRows ?? []) settings[(r as any).key] = (r as any).value ?? "";
  const sendHour = parseInt(settings.birthday_send_hour || "8", 10);
  const leapMode = settings.birthday_leap_mode || "feb_28";
  const clubName = settings.club_name || "מועדון הגברים";

  // Load template
  const { data: tplRow } = await supabase
    .from("birthday_email_template")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!tplRow || !(tplRow as any).is_active) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: "template_inactive" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const tpl = tplRow as unknown as TemplateRow;

  // TEST MODE
  if (isTest) {
    if (!testTo) {
      return new Response(JSON.stringify({ error: "missing_to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { year, month, day } = jerusalemDateParts();
    const vars: Record<string, string> = {
      first_name: "ישראל",
      last_name: "ישראלי",
      full_name: "ישראל ישראלי",
      birthday_date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
      club_name: clubName,
      current_year: String(year),
    };
    const subject = "[בדיקה] " + renderTemplate(tpl.subject || "", vars);
    const res = await sendOne({
      supabaseUrl,
      serviceRoleKey,
      to: testTo,
      subject,
      idempotencyKey: `bday-test-${Date.now()}`,
      templateData: {
        subject,
        heading: renderTemplate(tpl.heading || "", vars),
        bodyHtml: renderTemplate(tpl.body_html || "", vars),
        signature: renderTemplate(tpl.signature || "", vars),
        clubName,
        logoUrl: tpl.logo_url || "",
      },
    });
    return new Response(
      JSON.stringify({ ok: res.ok, test: true, to: testTo, status: res.status, body: res.body }),
      {
        status: res.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Real run — hour gate
  const hour = jerusalemHour();
  if (!force && hour !== sendHour) {
    return new Response(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: `not configured send hour (now=${hour}, configured=${sendHour})`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { year, month, day } = jerusalemDateParts();

  // Targets for today + leap-year handling
  const targets: Array<{ m: number; d: number }> = [{ m: month, d: day }];
  if (!isLeapYear(year)) {
    if (leapMode === "feb_28" && month === 2 && day === 28) {
      targets.push({ m: 2, d: 29 });
    } else if (leapMode === "mar_1" && month === 3 && day === 1) {
      targets.push({ m: 2, d: 29 });
    }
  }

  const recipients: Array<{
    user_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    birth_m: number;
    birth_d: number;
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
    for (const r of (data ?? []) as any[]) {
      if (!r.is_approved) continue;
      if (!r.send_birthday_email) continue;
      if (!r.email_opt_in) continue;
      if (!r.email) continue;
      if (onlyUserId && r.user_id !== onlyUserId) continue;
      recipients.push({
        user_id: r.user_id,
        first_name: r.first_name || "",
        last_name: "",
        full_name: r.full_name || "",
        email: r.email,
        birth_m: t.m,
        birth_d: t.d,
      });
    }
  }

  // Manual force for a specific user even if not matching today
  if (onlyUserId && force && recipients.length === 0) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, full_name, birth_date, is_approved, email_opt_in, send_birthday_email")
      .eq("user_id", onlyUserId)
      .maybeSingle();
    if (prof) {
      const { data: authUser } = await supabase.auth.admin.getUserById(onlyUserId);
      const email = authUser?.user?.email;
      if (email && prof.is_approved && prof.email_opt_in && prof.send_birthday_email && prof.birth_date) {
        const bd = new Date(prof.birth_date as string);
        recipients.push({
          user_id: prof.user_id,
          first_name: prof.first_name || prof.full_name?.split(" ")[0] || "",
          last_name: prof.last_name || "",
          full_name: prof.full_name || "",
          email,
          birth_m: bd.getUTCMonth() + 1,
          birth_d: bd.getUTCDate(),
        });
      }
    }
  }

  if (recipients.length > 0) {
    const ids = recipients.map((r) => r.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, last_name")
      .in("user_id", ids);
    const lastNameMap: Record<string, string> = {};
    for (const p of (profs ?? []) as any[]) lastNameMap[p.user_id] = p.last_name || "";
    for (const r of recipients) if (!r.last_name) r.last_name = lastNameMap[r.user_id] || "";
  }

  if (resend && onlyUserId) {
    await supabase
      .from("birthday_email_log")
      .delete()
      .eq("user_id", onlyUserId)
      .eq("sent_year", year);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const r of recipients) {
    // Dedupe via unique log insert
    const { error: insertErr } = await supabase.from("birthday_email_log").insert({
      user_id: r.user_id,
      recipient_email: r.email,
      sent_year: year,
      status: "pending",
    });

    if (insertErr) {
      if ((insertErr as any).code === "23505") {
        skipped++;
        continue;
      }
      failed++;
      errors.push({ email: r.email, error: insertErr.message });
      continue;
    }

    const vars: Record<string, string> = {
      first_name: r.first_name,
      last_name: r.last_name,
      full_name: r.full_name,
      birthday_date: `${String(r.birth_d).padStart(2, "0")}/${String(r.birth_m).padStart(2, "0")}`,
      club_name: clubName,
      current_year: String(year),
    };

    const subject = renderTemplate(tpl.subject || "", vars);

    try {
      const res = await sendOne({
        supabaseUrl,
        serviceRoleKey,
        to: r.email,
        subject,
        idempotencyKey: `bday-${r.user_id}-${year}`,
        templateData: {
          subject,
          heading: renderTemplate(tpl.heading || "", vars),
          bodyHtml: renderTemplate(tpl.body_html || "", vars),
          signature: renderTemplate(tpl.signature || "", vars),
          clubName,
          logoUrl: tpl.logo_url || "",
        },
      });

      if (!res.ok) {
        const msg = (res.body?.error || res.body?.message || `HTTP ${res.status}`).toString().slice(0, 500);
        await supabase
          .from("birthday_email_log")
          .update({ status: "failed", error_message: msg })
          .eq("user_id", r.user_id)
          .eq("sent_year", year);
        failed++;
        errors.push({ email: r.email, error: msg });
      } else {
        await supabase
          .from("birthday_email_log")
          .update({ status: "sent", resend_id: res.body?.messageId ?? res.body?.id ?? null })
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
      configured_hour: sendHour,
      leap_mode: leapMode,
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
