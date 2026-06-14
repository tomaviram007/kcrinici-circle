import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEventDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jerusalem",
    });
  } catch {
    return value;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get("id");

  if (!eventId) {
    return new Response("Missing event id", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: event } = await supabase
    .from("events")
    .select("title, description, location, event_date, image_url, price")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  const siteUrl = "https://kcrinici.com";
  const eventPageUrl = `${siteUrl}/events/${eventId}`;
  const defaultImage = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3ffff879-a382-491e-b29e-e3225becb155/id-preview-a286eb4f--0e09a19a-a6ae-4d83-80d0-40261c28a438.lovable.app-1771330703249.png";
  const ogImage = event.image_url || defaultImage;
  const title = event.title || "אירוע במועדון ק. קריניצי";
  const description = event.description || "מפגש בלעדי לחברי המועדון";
  const dateStr = formatEventDate(event.event_date);
  const locationStr = event.location || "";

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | הגברים של ק. קריניצי</title>
  <meta name="description" content="${escapeHtml(description)}">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:url" content="${escapeHtml(req.url)}">
  <meta property="og:locale" content="he_IL">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&family=Frank+Ruhl+Libre:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Heebo', sans-serif;
      background: #0f1117;
      color: #e8e0d5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      max-width: 520px;
      width: 100%;
      background: #1a1410;
      border: 1px solid #2a2218;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(212,175,55,0.08);
    }
    .card img {
      width: 100%;
      height: 240px;
      object-fit: cover;
      display: block;
    }
    .card .content {
      padding: 28px;
    }
    .card h1 {
      font-family: 'Frank Ruhl Libre', serif;
      font-size: 1.6rem;
      margin: 0 0 10px;
      color: #f0ebe4;
    }
    .card p {
      margin: 0 0 8px;
      line-height: 1.6;
      color: #b8ae9e;
      font-size: 0.95rem;
    }
    .meta {
      margin: 16px 0 24px;
      padding: 14px 0;
      border-top: 1px solid #2a2218;
      border-bottom: 1px solid #2a2218;
      font-size: 0.9rem;
      color: #d4af37;
    }
    .meta span {
      display: block;
      margin-bottom: 4px;
    }
    .btn {
      display: inline-block;
      width: 100%;
      text-align: center;
      padding: 14px 24px;
      border-radius: 10px;
      background: #d4af37;
      color: #1a1410;
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .logo {
      text-align: center;
      margin-bottom: 24px;
      font-family: 'Frank Ruhl Libre', serif;
      font-size: 0.85rem;
      color: #8a7a5a;
      letter-spacing: 0.15em;
    }
  </style>
</head>
<body>
  <div class="logo">הגברים של ק. קריניצי</div>
  <div class="card">
    ${ogImage ? `<img src="${escapeHtml(ogImage)}" alt="${escapeHtml(title)}">` : ""}
    <div class="content">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <div class="meta">
        <span>📅 ${escapeHtml(dateStr)}</span>
        ${locationStr ? `<span>📍 ${escapeHtml(locationStr)}</span>` : ""}
        ${event.price ? `<span>💰 עלות: ₪${Number(event.price).toLocaleString()}</span>` : ""}
      </div>
      <a class="btn" href="${escapeHtml(eventPageUrl)}" target="_blank" rel="noopener noreferrer">פתח באפליקציה</a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders,
    },
  });
});
