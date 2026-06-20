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
  bodyHtml?: string
}

const Email = ({ subject = '', bodyHtml = '' }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>מועדון K. קריניצי</Heading>
        </Section>
        <Section style={card}>
          {subject ? <Heading style={h2}>{subject}</Heading> : null}
          <div
            style={bodyStyle as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </Section>
        <Text style={footer}>מועדון K. קריניצי</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.subject || 'הודעה ממועדון K. קריניצי',
  displayName: 'הודעת אדמין',
  previewData: { subject: 'בדיקה', bodyHtml: '<p>תוכן ההודעה</p>' },
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
  fontSize: '20px',
  margin: '0 0 16px 0',
}
const card: React.CSSProperties = {
  backgroundColor: '#fbf7f0',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #ece3d2',
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
const footer: React.CSSProperties = {
  marginTop: '24px',
  textAlign: 'center',
  color: '#968c7e',
  fontSize: '12px',
}
