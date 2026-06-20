/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>קישור כניסה — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>קישור כניסה</Heading>
        <Text style={text}>
          לחץ על הכפתור למטה כדי להיכנס ל{siteName}. הקישור תקף לזמן מוגבל.
        </Text>
        <Button style={button} href={confirmationUrl}>
          כניסה למועדון
        </Button>
        <Text style={footer}>
          אם לא ביקשת קישור זה, ניתן להתעלם מהודעה זו.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
