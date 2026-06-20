/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandLayout, tokenBoxStyle } from './_layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandLayout
    preview="קוד אימות לחשבון שלכם"
    heading="קוד אימות חד-פעמי"
    intro="להמשך הפעולה במועדון, הזינו את הקוד הבא במסך האימות:"
    cta={null}
    outro="הקוד תקף ל-10 דקות בלבד. לא ביקשתם אותו? צרו איתנו קשר מיד."
    showWhatsapp={false}
  >
    <Text style={tokenBoxStyle}>{token}</Text>
  </BrandLayout>
)

export default ReauthenticationEmail
