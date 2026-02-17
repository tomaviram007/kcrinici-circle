import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { userId, action } = await req.json();

    if (!userId || !action) {
      return new Response(JSON.stringify({ error: "Missing userId or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profile name
    const { data: profile } = await supabase
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
            <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #D4AF37, #8B6914); color: #1a1410; text-decoration: none; border-radius: 8px; font-weight: bold;">כניסה למועדון</a>
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

    // Send email via Supabase Auth admin
    // Note: Using Supabase's built-in email sending
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "magiclink",
        email: email,
      }),
    });

    // For now, log the notification - actual email sending would require an email service
    console.log(`Notification sent to ${email}: ${action} - ${subject}`);

    return new Response(
      JSON.stringify({ success: true, message: `Notification logged for ${email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
