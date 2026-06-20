/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>הוזמנת להצטרף — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>הוזמנת להצטרף</Heading>
        <Text style={text}>
          הוזמנת להצטרף ל
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . לחץ על הכפתור למטה כדי לקבל את ההזמנה וליצור חשבון.
        </Text>
        <Button style={button} href={confirmationUrl}>
          קבל הזמנה
        </Button>
        <Text style={footer}>
          אם לא ציפית להזמנה זו, ניתן להתעלם מהודעה זו.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#16110e',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#968c7e',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const link = { color: '#D4AF37', textDecoration: 'none' }
const button = {
  backgroundColor: '#D4AF37',
  color: '#16110e',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#968c7e', margin: '30px 0 0' }
