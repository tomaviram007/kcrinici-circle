/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { BrandLayout } from './_layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <BrandLayout
    preview="איפוס סיסמה למועדון"
    heading="איפוס סיסמה"
    intro="התקבלה בקשה לאיפוס הסיסמה לחשבון שלכם במועדון. לחצו על הכפתור הבא כדי לבחור סיסמה חדשה. הקישור תקף ל-60 דקות."
    cta={{ label: 'בחירת סיסמה חדשה', url: confirmationUrl }}
    outro="לא ביקשתם איפוס? ניתן להתעלם מההודעה — הסיסמה הנוכחית שלכם לא תשתנה."
  >
    <></>
  </BrandLayout>
)

export default RecoveryEmail
