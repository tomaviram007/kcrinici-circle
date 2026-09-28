// Shared helper: sends a free-form HTML email through Lovable's managed
// email API (verified sender domain notify.kcrinici.com). Server-only.
import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0'

const SITE_NAME = "מועדון ק.קרניצי"
const SENDER_DOMAIN = "notify.kcrinici.com"
const FROM_DOMAIN = "kcrinici.com"

export interface RawSendResult {
  ok: boolean
  error?: string
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function sendRawEmail(to: string, subject: string, html: string): Promise<RawSendResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    console.warn('LOVABLE_API_KEY is not configured')
    return { ok: false, error: 'no_api_key' }
  }
  try {
    await sendLovableEmail(
      {
        to,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: htmlToText(html),
        purpose: 'transactional',
        label: 'notification',
        idempotency_key: crypto.randomUUID(),
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
    return { ok: true }
  } catch (e: any) {
    const msg = String(e?.message || e)
    console.error('sendRawEmail failed:', msg)
    return { ok: false, error: msg }
  }
}
