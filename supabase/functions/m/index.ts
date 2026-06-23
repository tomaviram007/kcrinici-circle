// Neutral-named proxy for promo media to bypass ad-blockers that block "/ads/" URLs.
// Public, no JWT required.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Path style: /m/<bucket>/<path...>  OR  ?b=<bucket>&p=<path>&w=&q=
    let bucket = url.searchParams.get('b') || '';
    let path = url.searchParams.get('p') || '';
    const width = url.searchParams.get('w');
    const quality = url.searchParams.get('q');

    if (!bucket || !path) {
      // try path-style
      const parts = url.pathname.split('/').filter(Boolean);
      // ["m", bucket, ...path]
      if (parts.length >= 3) {
        bucket = parts[1];
        path = parts.slice(2).join('/');
      }
    }

    if (!bucket || !path) {
      return new Response('Missing bucket/path', { status: 400, headers: corsHeaders });
    }

    // Allow-list buckets that can be proxied
    const allowed = new Set(['ads', 'promos', 'site-assets', 'deals', 'announcements', 'gallery', 'events', 'avatars']);
    if (!allowed.has(bucket)) {
      return new Response('Forbidden bucket', { status: 403, headers: corsHeaders });
    }

    let upstream: string;
    if (width) {
      const q = quality || '75';
      upstream = `${SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${path}?width=${width}&quality=${q}`;
    } else {
      upstream = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    }

    const res = await fetch(upstream);
    const headers = new Headers(corsHeaders);
    const ct = res.headers.get('content-type');
    if (ct) headers.set('content-type', ct);
    headers.set('cache-control', 'public, max-age=86400');

    return new Response(res.body, { status: res.status, headers });
  } catch (err) {
    return new Response(`Proxy error: ${(err as Error).message}`, { status: 500, headers: corsHeaders });
  }
});
