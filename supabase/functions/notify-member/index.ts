import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_ACTIONS = ['approve', 'reject', 'admin-reset-password'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication: verify caller identity ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = claimsData.claims.sub;

    // --- Authorization: verify caller is admin ---
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);

    if (!roles?.some((r: any) => r.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Parse and validate request body ---
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, action, newPassword } = body;

    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Admin password reset action ---
    if (action === "admin-reset-password") {
      if (!newPassword || typeof newPassword !== 'string') {
        return new Response(JSON.stringify({ error: 'newPassword is required for password reset' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, message: "Password updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Approve / Reject flow ---
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();

    const name = profile?.full_name || "חבר";
    const email = user.email;

    let subject: string;
    let htmlBody: string;

    if (action === "approve") {
      subject = "ברוך הבא למועדון הגברים של ק. קריניצי!";
      htmlBody = `
        <div dir="rtl" style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background: #1a1410; color: #d9c9a8; border-radius: 12px;">
          <h1 style="color: #D4AF37; font-size: 24px; text-align: center; margin-bottom: 20px;">ברוך הבא למועדון!</h1>
          <p style="font-size: 16px; line-height: 1.8; text-align: center;">
            שלום ${name},<br/><br/>
            בקשתך לחברות במועדון <strong style="color: #D4AF37;">הגברים של ק. קריניצי</strong> אושרה!<br/>
            כעת יש לך גישה מלאה לכל הלוחות, האינדקס והאירועים.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://kcrinici-circle.lovable.app" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #D4AF37, #8B6914); color: #1a1410; text-decoration: none; border-radius: 8px; font-weight: bold;">כניסה למועדון</a>
          </div>
        </div>
      `;
    } else {
      subject = "הגברים של ק. קריניצי - עדכון בנוגע לבקשתך";
      htmlBody = `
        <div dir="rtl" style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background: #1a1410; color: #d9c9a8; border-radius: 12px;">
          <h1 style="color: #D4AF37; font-size: 24px; text-align: center; margin-bottom: 20px;">עדכון לגבי בקשתך</h1>
          <p style="font-size: 16px; line-height: 1.8; text-align: center;">
            שלום ${name},<br/><br/>
            לצערנו, הגישה למועדון <strong style="color: #D4AF37;">הגברים של ק. קריניצי</strong> מוגבלת כרגע לתושבי השכונה בלבד.<br/>
            ניתן לפנות להנהלת המועדון לבירורים נוספים.
          </p>
        </div>
      `;
    }

    // Try to send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "מועדון ק. קריניצי <onboarding@resend.dev>",
          to: [email],
          subject,
          html: htmlBody,
        }),
      });

      if (!resendRes.ok) {
        const resendData = await resendRes.json();
        console.error("Resend error:", JSON.stringify(resendData));
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Notification processed for ${email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
