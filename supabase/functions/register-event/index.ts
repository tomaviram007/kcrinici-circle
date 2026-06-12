import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ADMIN_EMAIL = "tomaviram2187@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PAYMENT_LABELS: Record<string, string> = {
  paid: "שולם",
  pending: "תשלום ממתין",
  unpaid: "לא שולם",
  not_required: "ללא תשלום",
};

function formatEventDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("he-IL", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem",
    });
  } catch {
    return value;
  }
}

function emailShell(title: string, rows: Array<[string, string]>, intro?: string): string {
  const rowsHtml = rows
    .map(([label, value]) => `<tr><td style="padding:6px 12px;font-weight:bold;color:#D4AF37;">${escapeHtml(label)}</td><td style="padding:6px 12px;color:#d9c9a8;">${escapeHtml(value)}</td></tr>`)
    .join("");
  return `
    <div dir="rtl" style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:30px 20px;background:#1a1410;color:#d9c9a8;border-radius:12px;">
      <h2 style="color:#D4AF37;text-align:center;margin-bottom:20px;">${escapeHtml(title)}</h2>
      ${intro ? `<p style="text-align:center;margin-bottom:20px;">${escapeHtml(intro)}</p>` : ""}
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
      <p style="text-align:center;margin-top:24px;font-size:12px;color:#8a7a5a;">מועדון הגברים של ק. קריניצי</p>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("Resend not configured, skipping email");
    return;
  }
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
    console.error("Resend error:", await res.text());
  }
}

function sendAdminEmail(registration: Record<string, any>, event: Record<string, any>): Promise<void> {
  const html = emailShell("🎟️ הרשמה חדשה לאירוע", [
    ["שם פרטי", registration.first_name],
    ["שם משפחה", registration.last_name],
    ["אימייל", registration.email],
    ["טלפון", registration.phone],
    ["אישור הגעה", registration.attendance_confirmed ? "כן" : "לא"],
    ["סטטוס תשלום", PAYMENT_LABELS[registration.payment_status] || registration.payment_status],
    ["אירוע", event.title],
  ]);
  return sendEmail(ADMIN_EMAIL, `🎟️ הרשמה חדשה לאירוע: ${event.title}`, html);
}

function sendParticipantEmail(registration: Record<string, any>, event: Record<string, any>): Promise<void> {
  const rows: Array<[string, string]> = [
    ["אירוע", event.title],
    ["תאריך ושעה", formatEventDate(event.event_date)],
  ];
  if (event.location) rows.push(["מיקום", event.location]);
  if (registration.amount_paid != null) rows.push(["סכום ששולם", `₪${Number(registration.amount_paid).toLocaleString()}`]);
  if (event.description) rows.push(["פרטים נוספים", event.description]);
  const html = emailShell(
    "✅ אישור הרשמה לאירוע",
    rows,
    `שלום ${registration.first_name}, ההרשמה שלך לאירוע הושלמה בהצלחה! נתראה שם 🎉`,
  );
  return sendEmail(registration.email, `✅ אישור הרשמה – ${event.title}`, html);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s+()-]{7,20}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const action = body.action;

    if (action === "register") {
      const first_name = String(body.first_name || "").trim();
      const last_name = String(body.last_name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const event_id = String(body.event_id || "");
      const attendance_confirmed = body.attendance_confirmed === true;

      if (!first_name || !last_name || first_name.length > 100 || last_name.length > 100) {
        return jsonResponse({ error: "שם פרטי ושם משפחה הם שדות חובה" }, 400);
      }
      if (!EMAIL_RE.test(email) || email.length > 255) {
        return jsonResponse({ error: "כתובת מייל לא תקינה" }, 400);
      }
      if (!PHONE_RE.test(phone)) {
        return jsonResponse({ error: "מספר טלפון לא תקין" }, 400);
      }
      if (!attendance_confirmed) {
        return jsonResponse({ error: "יש לאשר הגעה לאירוע" }, 400);
      }

      const { data: event, error: eventError } = await admin
        .from("events")
        .select("id, title, description, event_date, location, price, payment_link, max_participants")
        .eq("id", event_id)
        .maybeSingle();
      if (eventError || !event) {
        return jsonResponse({ error: "האירוע לא נמצא" }, 404);
      }

      const paymentRequired = !!event.price && Number(event.price) > 0;

      // Identify a logged-in user if an auth header was provided (optional for guests)
      let userId: string | null = null;
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = data?.user?.id || null;
      }

      const { data: registration, error: insertError } = await admin
        .from("event_registrations")
        .insert({
          event_id: event.id,
          user_id: userId,
          first_name,
          last_name,
          email,
          phone,
          attendance_confirmed,
          payment_status: paymentRequired ? "pending" : "not_required",
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return jsonResponse({ error: "כתובת המייל הזו כבר רשומה לאירוע" }, 409);
        }
        if (insertError.message?.includes("EVENT_FULL")) {
          return jsonResponse({ error: "האירוע מלא — לא נותרו מקומות פנויים" }, 409);
        }
        console.error("Insert error:", insertError);
        return jsonResponse({ error: "שגיאה בשמירת ההרשמה" }, 500);
      }

      const emails: Promise<void>[] = [sendAdminEmail(registration, event)];
      if (!paymentRequired) {
        emails.push(sendParticipantEmail(registration, event));
      }
      await Promise.allSettled(emails);

      return jsonResponse({
        success: true,
        registration_id: registration.id,
        confirm_token: registration.confirm_token,
        payment_required: paymentRequired,
        payment_link: event.payment_link || null,
        price: event.price || null,
      });
    }

    if (action === "confirm-payment") {
      const registration_id = String(body.registration_id || "");
      const confirm_token = String(body.confirm_token || "");
      const transaction_ref = body.transaction_ref ? String(body.transaction_ref).slice(0, 100) : null;

      if (!registration_id || !confirm_token) {
        return jsonResponse({ error: "Missing registration_id or confirm_token" }, 400);
      }

      const { data: registration } = await admin
        .from("event_registrations")
        .select("*")
        .eq("id", registration_id)
        .eq("confirm_token", confirm_token)
        .maybeSingle();
      if (!registration) {
        return jsonResponse({ error: "הרשמה לא נמצאה" }, 404);
      }

      const { data: event } = await admin
        .from("events")
        .select("id, title, description, event_date, location, price")
        .eq("id", registration.event_id)
        .single();

      const { data: updated, error: updateError } = await admin
        .from("event_registrations")
        .update({
          payment_status: "paid",
          amount_paid: event?.price ?? null,
          transaction_ref,
        })
        .eq("id", registration.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        return jsonResponse({ error: "שגיאה בעדכון התשלום" }, 500);
      }

      if (event) {
        await Promise.allSettled([sendParticipantEmail(updated, event)]);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Invalid action. Must be 'register' or 'confirm-payment'" }, 400);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("register-event error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
