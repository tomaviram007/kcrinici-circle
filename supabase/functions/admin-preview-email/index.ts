import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = 'K. Krinitzi Club'
const SAMPLE_URL = 'https://kcrinici.com/confirm?token=preview-sample'
const SAMPLE_EMAIL = 'member@example.com'

const SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  signup: { siteName: SITE_NAME, siteUrl: 'https://kcrinici.com', recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_URL },
  invite: { siteName: SITE_NAME, siteUrl: 'https://kcrinici.com', confirmationUrl: SAMPLE_URL },
  magiclink: { siteName: SITE_NAME, confirmationUrl: SAMPLE_URL },
  recovery: { siteName: SITE_NAME, confirmationUrl: SAMPLE_URL },
  email_change: { siteName: SITE_NAME, oldEmail: 'old@example.com', newEmail: 'new@example.com', email: SAMPLE_EMAIL, confirmationUrl: SAMPLE_URL },
  reauthentication: { token: '482913' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // User-context client (anon key + caller's JWT) for identity check
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    const userId = userData?.user?.id
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service-role client for privileged reads (has_role, site_settings)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const type: string = body.type || 'signup'
    const Template = TEMPLATES[type]
    if (!Template) {
      return new Response(JSON.stringify({ error: `Unknown template: ${type}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch current WhatsApp group URL
    const { data: waRow } = await supabase
      .from('site_settings').select('value').eq('key', 'whatsapp_group_url').maybeSingle()
    const whatsappGroupUrl =
      body.whatsappGroupUrl ||
      waRow?.value ||
      'https://chat.whatsapp.com/JGaKYDD7DLzJvzyYyAJejo'

    const props = { ...SAMPLE_DATA[type], whatsappGroupUrl }
    const html = await renderAsync(React.createElement(Template, props))

    return new Response(html, {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('admin-preview-email error', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
