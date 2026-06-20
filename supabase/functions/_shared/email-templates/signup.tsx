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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>אשר את כתובת האימייל שלך — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>ברוך הבא למועדון</Heading>
        <Text style={text}>
          תודה שנרשמת ל
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          נא לאשר את כתובת האימייל שלך (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) על ידי לחיצה על הכפתור:
        </Text>
        <Button style={button} href={confirmationUrl}>
          אשר אימייל
        </Button>
        <Text style={footer}>
          אם לא ביצעת רישום, ניתן להתעלם מהודעה זו.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
