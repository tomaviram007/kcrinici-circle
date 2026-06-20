/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandLayout } from './_layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail?: string
  email?: string
  newEmail?: string
  confirmationUrl: string
  whatsappGroupUrl?: string
  unsubscribeUrl?: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  email,
  confirmationUrl, whatsappGroupUrl, unsubscribeUrl }: EmailChangeEmailProps) => (
  <BrandLayout
    whatsappGroupUrl={whatsappGroupUrl}
    unsubscribeUrl={unsubscribeUrl}
    preview="אישור החלפת כתובת האימייל"
    heading="אישור החלפת אימייל"
    intro="התקבלה בקשה להחליף את כתובת האימייל המקושרת לחשבונכם במועדון. אנא אשרו את הבקשה כדי להשלים את התהליך."
    cta={{ label: 'אישור החלפת האימייל', url: confirmationUrl }}
    outro="אם לא ביקשתם את ההחלפה, אנא התעלמו מהודעה זו או פנו אלינו מיד — חשבונכם לא יוחלף."
  >
    <Text style={{ fontSize: '14px', color: '#3a3128', margin: '8px 0', lineHeight: '1.7' }}>
      <strong>מ:</strong> {oldEmail || email}
      <br />
      <strong>אל:</strong> {newEmail || email}
    </Text>
  </BrandLayout>
)

export default EmailChangeEmail
