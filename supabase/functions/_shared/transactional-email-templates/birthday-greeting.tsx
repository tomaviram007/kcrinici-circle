/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  subject?: string
  heading?: string
  bodyHtml?: string
  signature?: string
  clubName?: string
  logoUrl?: string
}

const Email = ({
  subject = 'מזל טוב ליום הולדתך!',
  heading = '',
  bodyHtml = '',
  signature = '',
  clubName = 'מועדון K. קריניצי',
  logoUrl = '',
}: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          {logoUrl ? (
            <img src={logoUrl} alt="" style={logoImg} />
          ) : (
            <Heading style={h1}>{clubName}</Heading>
          )}
        </Section>
        <Section style={card}>
          <Heading style={h2}>{heading || subject}</Heading>
          <div
            style={bodyStyle as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
          {signature ? (
            <div style={signatureStyle as React.CSSProperties}>
              {signature.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ) : null}
        </Section>
        <Text style={footer}>{clubName}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.subject || 'מזל טוב ליום הולדתך! 🎂',
  displayName: 'ברכת יום הולדת',
  previewData: {
    subject: 'מזל טוב ליום הולדתך! 🎂',
    heading: 'מזל טוב ישראל!',
    bodyHtml: '<p>היום אנחנו חוגגים אותך 🎉 שתהיה שנה מלאת בריאות, אושר והצלחה.</p>',
    signature: 'באהבה,\nמועדון K. קריניצי',
    clubName: 'מועדון K. קריניצי',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '24px',
}
const header: React.CSSProperties = {
  textAlign: 'center',
  paddingBottom: '16px',
}
const h1: React.CSSProperties = {
  color: '#4B2C20',
  fontSize: '22px',
  margin: 0,
}
const h2: React.CSSProperties = {
  color: '#4B2C20',
  fontSize: '22px',
  margin: '0 0 16px 0',
  textAlign: 'right',
}
const logoImg: React.CSSProperties = {
  maxWidth: '140px',
  height: 'auto',
  display: 'inline-block',
}
const card: React.CSSProperties = {
  backgroundColor: '#fbf7f0',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #D4AF37',
  color: '#2b2018',
  lineHeight: '1.7',
  fontSize: '15px',
  direction: 'rtl',
  textAlign: 'right',
}
const bodyStyle: React.CSSProperties = {
  color: '#2b2018',
  fontSize: '15px',
  lineHeight: '1.7',
}
const signatureStyle: React.CSSProperties = {
  marginTop: '18px',
  paddingTop: '14px',
  borderTop: '1px solid #ece3d2',
  color: '#5b4636',
  fontSize: '14px',
  lineHeight: '1.6',
}
const footer: React.CSSProperties = {
  marginTop: '24px',
  textAlign: 'center',
  color: '#968c7e',
  fontSize: '12px',
}
