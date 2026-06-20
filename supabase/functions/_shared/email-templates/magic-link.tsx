/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { BrandLayout } from './_layout.tsx'
import { mergeCopy, type EmailCopy } from './_copy.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  whatsappGroupUrl?: string
  unsubscribeUrl?: string
  copy?: Partial<EmailCopy>
}

export const MagicLinkEmail = ({ confirmationUrl, whatsappGroupUrl, unsubscribeUrl, copy }: MagicLinkEmailProps) => {
  const c = mergeCopy('magiclink', copy)
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
    <></>
  </BrandLayout>
  )
}

export default MagicLinkEmail
