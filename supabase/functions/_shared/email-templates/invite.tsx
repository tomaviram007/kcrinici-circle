/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandLayout } from './_layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  whatsappGroupUrl?: string
}

export const InviteEmail = ({ confirmationUrl, whatsappGroupUrl }: InviteEmailProps) => (
  <BrandLayout
    whatsappGroupUrl={whatsappGroupUrl}
    preview="הוזמנתם להצטרף למועדון הגברים של ק. כריניצי"
    heading="הוזמנתם להצטרף"
    intro="קיבלתם הזמנה אישית להצטרף למועדון הגברים של קריית כריניצי — קהילה ייחודית של אנשי עסקים, יצירה ומקצוע."
    cta={{ label: 'קבלת ההזמנה והתחלת הרשמה', url: confirmationUrl }}
    outro="ההזמנה אישית ולא ניתנת להעברה. שמרו על הקישור."
  >
    <Text style={{ fontSize: '14px', color: '#3a3128', margin: '12px 0', lineHeight: '1.7' }}>
      ✦ אירועים מקצועיים וחברתיים
      <br />✦ רשת קשרים איכותית
      <br />✦ הטבות והזדמנויות בלעדיות לחברים
    </Text>
  </BrandLayout>
)

export default InviteEmail
