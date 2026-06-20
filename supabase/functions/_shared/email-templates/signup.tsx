/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandLayout } from './_layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  whatsappGroupUrl?: string
}

export const SignupEmail = ({ confirmationUrl, whatsappGroupUrl }: SignupEmailProps) => (
  <BrandLayout
    whatsappGroupUrl={whatsappGroupUrl}
    preview="ברוכים הבאים — אשרו את כתובת האימייל שלכם"
    heading="ברוכים הבאים למועדון"
    intro="אנחנו שמחים שהצטרפתם אלינו. כדי להשלים את ההרשמה ולהמשיך בתהליך האישור, אשרו את כתובת האימייל שלכם בלחיצה על הכפתור הבא:"
    cta={{ label: 'אישור כתובת האימייל', url: confirmationUrl }}
    outro="לאחר אישור האימייל, צוות המועדון יבחן את הבקשה שלכם. תקבלו עדכון ברגע שהחשבון יאושר."
  >
    <Text style={{ fontSize: '13px', color: '#968c7e', margin: '8px 0 0' }}>
      תהליך האישור הוא חלק מהאופי הייחודי של המועדון שלנו — אנו שומרים על קהילה איכותית וערכית.
    </Text>
  </BrandLayout>
)

export default SignupEmail
