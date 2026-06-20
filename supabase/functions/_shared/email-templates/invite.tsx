/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandLayout } from './_layout.tsx'
import { mergeCopy, type EmailCopy } from './_copy.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  whatsappGroupUrl?: string
  unsubscribeUrl?: string
  copy?: Partial<EmailCopy>
}

export const InviteEmail = ({ confirmationUrl, whatsappGroupUrl, unsubscribeUrl, copy }: InviteEmailProps) => {
  const c = mergeCopy('invite', copy)
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
    <Text style={{ fontSize: '14px', color: '#3a3128', margin: '12px 0', lineHeight: '1.7' }}>
      ✦ אירועים מקצועיים וחברתיים
      <br />✦ רשת קשרים איכותית
      <br />✦ הטבות והזדמנויות בלעדיות לחברים
    </Text>
  </BrandLayout>
  )
}

export default InviteEmail
