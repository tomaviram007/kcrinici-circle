/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { BrandLayout } from './_layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  whatsappGroupUrl?: string
}

export const MagicLinkEmail = ({ confirmationUrl, whatsappGroupUrl }: MagicLinkEmailProps) => (
  <BrandLayout
    whatsappGroupUrl={whatsappGroupUrl}
    preview="קישור כניסה למועדון"
    heading="הכניסה שלכם מחכה"
    intro="לחיצה אחת על הכפתור — וכבר אתם בפנים. אין צורך בסיסמה."
    cta={{ label: 'כניסה למועדון', url: confirmationUrl }}
    outro="הקישור תקף לזמן קצר ולשימוש חד-פעמי בלבד. לא ביקשתם להתחבר? אפשר להתעלם מההודעה."
  >
    <></>
  </BrandLayout>
)

export default MagicLinkEmail
