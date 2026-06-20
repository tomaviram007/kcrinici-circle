/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandLayout } from './_layout.tsx'
import { mergeCopy, type EmailCopy } from './_copy.ts'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail?: string
  email?: string
  newEmail?: string
  confirmationUrl: string
  whatsappGroupUrl?: string
  unsubscribeUrl?: string
  copy?: Partial<EmailCopy>
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  email,
  confirmationUrl, whatsappGroupUrl, unsubscribeUrl, copy }: EmailChangeEmailProps) => {
  const c = mergeCopy('email_change', copy)
  return (
  <BrandLayout
    whatsappGroupUrl={whatsappGroupUrl}
    unsubscribeUrl={unsubscribeUrl}
    preview={c.preview}
    heading={c.heading}
    intro={c.intro}
    cta={{ label: c.ctaLabel, url: confirmationUrl }}
    outro={c.outro}
  >
    <Text style={{ fontSize: '14px', color: '#3a3128', margin: '8px 0', lineHeight: '1.7' }}>
      <strong>מ:</strong> {oldEmail || email}
      <br />
      <strong>אל:</strong> {newEmail || email}
    </Text>
  </BrandLayout>
  )
}

export default EmailChangeEmail
