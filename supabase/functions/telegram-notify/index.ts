import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("MAKE_WEBHOOK_URL is not configured");
    }

    const body = await req.json();
    const { event_type, data } = body;

    if (!event_type || !data) {
      return new Response(
        JSON.stringify({ error: "Missing event_type or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward to Make.com webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Make.com webhook failed [${response.status}]: ${text}`);
    } else {
      await response.text(); // consume body
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telegram notify error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
