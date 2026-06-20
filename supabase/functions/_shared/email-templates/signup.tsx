/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandLayout } from './_layout.tsx'
import { EMAIL_COPY_DEFAULTS, mergeCopy, type EmailCopy } from './_copy.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  whatsappGroupUrl?: string
  unsubscribeUrl?: string
  copy?: Partial<EmailCopy>
}

export const SignupEmail = ({ confirmationUrl, whatsappGroupUrl, unsubscribeUrl, copy }: SignupEmailProps) => {
  const c = mergeCopy('signup', copy)
  return (
  <BrandLayout
    whatsappGroupUrl={whatsappGroupUrl}
    unsubscribeUrl={unsubscribeUrl}
    preview={c.preview}
    heading={c.heading}
    intro={c.intro}
    cta={{ label: c.ctaLabel || EMAIL_COPY_DEFAULTS.signup.ctaLabel, url: confirmationUrl }}
    outro={c.outro}
  >
    <Text style={{ fontSize: '13px', color: '#968c7e', margin: '8px 0 0' }}>
      תהליך האישור הוא חלק מהאופי הייחודי של המועדון שלנו — אנו שומרים על קהילה איכותית וערכית.
    </Text>
  </BrandLayout>
  )
}

export default SignupEmail
