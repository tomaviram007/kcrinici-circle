/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandLayout, tokenBoxStyle } from './_layout.tsx'
import { mergeCopy, type EmailCopy } from './_copy.ts'

interface ReauthenticationEmailProps {
  token: string
  whatsappGroupUrl?: string
  unsubscribeUrl?: string
  copy?: Partial<EmailCopy>
}

export const ReauthenticationEmail = ({ token, whatsappGroupUrl, unsubscribeUrl, copy }: ReauthenticationEmailProps) => {
  const c = mergeCopy('reauthentication', copy)
  return (
  <BrandLayout
    whatsappGroupUrl={whatsappGroupUrl}
    unsubscribeUrl={unsubscribeUrl}
    preview={c.preview}
    heading={c.heading}
    intro={c.intro}
    cta={null}
    outro={c.outro}
    showWhatsapp={false}
  >
    <Text style={tokenBoxStyle}>{token}</Text>
  </BrandLayout>
  )
}

export default ReauthenticationEmail
