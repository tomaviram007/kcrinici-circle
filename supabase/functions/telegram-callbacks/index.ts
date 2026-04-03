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
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current offset
    const { data: state, error: stateErr } = await supabase
      .from("telegram_bot_state")
      .select("update_offset")
      .eq("id", 1)
      .single();

    if (stateErr) throw new Error(`State read error: ${stateErr.message}`);

    let currentOffset = state.update_offset;
    let processed = 0;

    // Poll for updates (short poll, no long timeout since this runs on cron)
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset: currentOffset,
        timeout: 0,
        allowed_updates: ["callback_query"],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Telegram getUpdates failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    const updates = data.result ?? [];

    for (const update of updates) {
      if (!update.callback_query) continue;

      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;

      if (!callbackData) continue;

      const [action, userId] = callbackData.split(":");
      if (!userId || !["approve", "reject"].includes(action)) continue;

      // Get member profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, user_id")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        // Answer callback and skip
        await answerCallback(botToken, callbackQuery.id, "❌ חבר לא נמצא");
        continue;
      }

      let responseText: string;

      if (action === "approve") {
        // Approve member
        const { error } = await supabase
          .from("profiles")
          .update({ is_approved: true, is_removed: false })
          .eq("user_id", userId);

        if (error) {
          await answerCallback(botToken, callbackQuery.id, `❌ שגיאה: ${error.message}`);
          continue;
        }

        // Send approval email via notify-member
        try {
          await fetch(`${supabaseUrl}/functions/v1/notify-member`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ userId, action: "approve" }),
          });
        } catch (e) {
          console.error("Failed to send approval email:", e);
        }

        responseText = `✅ ${profile.full_name} אושר בהצלחה!`;
      } else {
        // Reject member
        const { error } = await supabase
          .from("profiles")
          .update({ is_approved: false })
          .eq("user_id", userId);

        if (error) {
          await answerCallback(botToken, callbackQuery.id, `❌ שגיאה: ${error.message}`);
          continue;
        }

        // Send rejection email
        try {
          await fetch(`${supabaseUrl}/functions/v1/notify-member`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ userId, action: "reject" }),
          });
        } catch (e) {
          console.error("Failed to send rejection email:", e);
        }

        responseText = `❌ הבקשה של ${profile.full_name} נדחתה`;
      }

      // Answer the callback query
      await answerCallback(botToken, callbackQuery.id, responseText);

      // Update the original message to remove buttons and show result
      if (callbackQuery.message) {
        const originalText = callbackQuery.message.text || "";
        const statusLine = action === "approve"
          ? `\n\n✅ <b>אושר</b> על ידי ${callbackQuery.from.first_name || "מנהל"}`
          : `\n\n❌ <b>נדחה</b> על ידי ${callbackQuery.from.first_name || "מנהל"}`;

        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: callbackQuery.message.chat.id,
            message_id: callbackQuery.message.message_id,
            text: originalText + statusLine,
            parse_mode: "HTML",
          }),
        });
      }

      processed++;
    }

    // Update offset
    if (updates.length > 0) {
      const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
      await supabase
        .from("telegram_bot_state")
        .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
        .eq("id", 1);
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telegram callbacks error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function answerCallback(botToken: string, callbackQueryId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: true }),
  });
  await res.text();
}
