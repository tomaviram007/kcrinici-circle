// Shared helper: sends a registered template through Lovable's managed email
// API and records the outcome in the project's email_send_log table.
import { sendTemplateEmail } from './send-email.ts'

export interface LoggedSendResult {
  ok: boolean
  suppressed: boolean
  error?: string
}

export async function sendAndLog(
  supabase: any,
  templateName: string,
  to: string,
  options: { templateData?: Record<string, any>; idempotencyKey?: string } = {},
): Promise<LoggedSendResult> {
  try {
    const result = await sendTemplateEmail(templateName, to, options)

    if (!result.sent) {
      const { error } = await supabase.from('email_send_log').insert({
        template_name: templateName,
        recipient_email: to,
        status: 'suppressed',
      })
      if (error) console.error('email_send_log insert failed', error)
      return { ok: false, suppressed: true }
    }

    const { error } = await supabase.from('email_send_log').insert({
      template_name: templateName,
      recipient_email: to,
      status: 'sent',
    })
    if (error) console.error('email_send_log insert failed', error)
    return { ok: true, suppressed: false }
  } catch (e: any) {
    const message = (e?.message || String(e)).slice(0, 500)
    const { error } = await supabase.from('email_send_log').insert({
      template_name: templateName,
      recipient_email: to,
      status: 'failed',
      error_message: message,
    })
    if (error) console.error('email_send_log insert failed', error)
    return { ok: false, suppressed: false, error: message }
  }
}
