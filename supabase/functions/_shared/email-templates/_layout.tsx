/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

// Brand constants — mirrors the site (Dark Charcoal + Dim Gold)
export const BRAND = {
  logoUrl:
    'https://wzbvdpgoyetmgluvhygf.supabase.co/storage/v1/object/public/site-assets/logo-1771366653000.png',
  siteUrl: 'https://kcrinici.com',
  whatsappGroupUrl: 'https://chat.whatsapp.com/JGaKYDD7DLzJvzyYyAJejo',
  siteTitle: 'הגברים של ק.קרניצי',
  charcoal: '#16110e',
  wood: '#4B2C20',
  gold: '#D4AF37',
  cream: '#f6f0e6',
  muted: '#968c7e',
}

interface LayoutProps {
  preview: string
  heading: string
  intro?: string
  children: React.ReactNode
  cta?: { label: string; url: string } | null
  outro?: string
  showWhatsapp?: boolean
  whatsappGroupUrl?: string
  unsubscribeUrl?: string
}

export const BrandLayout = ({
  preview,
  heading,
  intro,
  children,
  cta,
  outro,
  showWhatsapp = true,
  whatsappGroupUrl,
  unsubscribeUrl,
}: LayoutProps) => {
  const waUrl = whatsappGroupUrl || BRAND.whatsappGroupUrl
  const unsubUrl = unsubscribeUrl || `${BRAND.siteUrl}/unsubscribe`
  return (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Hero — dark band with logo & site title */}
        <Section style={hero}>
          <Img src={BRAND.logoUrl} alt={BRAND.siteTitle} width="76" height="76" style={logo} />
          <Text style={brandTitle}>{BRAND.siteTitle}</Text>
          <Text style={brandTagline}>מועדון הגברים של ק.קרניצי</Text>
        </Section>

        {/* Body card */}
        <Section style={card}>
          <Text style={eyebrow}>הודעה רשמית</Text>
          <Text style={h1}>{heading}</Text>
          {intro ? <Text style={text}>{intro}</Text> : null}

          {children}

          {cta ? (
            <Section style={{ textAlign: 'center' as const, margin: '28px 0 8px' }}>
              <Button style={button} href={cta.url}>
                {cta.label}
              </Button>
            </Section>
          ) : null}

          {outro ? <Text style={textMuted}>{outro}</Text> : null}
        </Section>

        {/* WhatsApp CTA */}
        {showWhatsapp ? (
          <Section style={waCard}>
            <Text style={waTitle}>הצטרפו לקבוצת הוואטסאפ של המועדון</Text>
            <Text style={waText}>
              עדכונים, אירועים והזדמנויות — ישירות אליכם בקבוצה הרשמית.
            </Text>
            <Button style={waButton} href={waUrl}>
              הצטרפו לקבוצה ←
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footer}>
            הודעה זו נשלחה מאת{' '}
            <Link href={BRAND.siteUrl} style={footerLink}>
              {BRAND.siteTitle}
            </Link>
            .
          </Text>
          <Text style={footer}>
            אם פנייה זו לא מוכרת לכם, ניתן להתעלם ממנה בבטחה.
          </Text>
          <Text style={footer}>
            <Link href={unsubUrl} style={footerLink}>הסרה מרשימת התפוצה</Link>
          </Text>
          <Text style={footerSmall}>© {new Date().getFullYear()} K. Krinitzi Club</Text>
        </Section>
      </Container>
    </Body>
  </Html>
  )
}


// — styles —
const main = {
  backgroundColor: '#efe9df',
  fontFamily:
    "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', Tahoma, sans-serif",
  margin: 0,
  padding: '24px 0',
}
const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0 12px',
}
const hero = {
  backgroundColor: BRAND.charcoal,
  backgroundImage: `linear-gradient(135deg, ${BRAND.charcoal} 0%, ${BRAND.wood} 100%)`,
  padding: '36px 24px 28px',
  textAlign: 'center' as const,
  borderRadius: '14px 14px 0 0',
  borderBottom: `3px solid ${BRAND.gold}`,
}
const logo = {
  display: 'block',
  margin: '0 auto 14px',
  borderRadius: '50%',
  border: `2px solid ${BRAND.gold}`,
}
const brandTitle = {
  color: BRAND.cream,
  fontSize: '22px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}
const brandTagline = {
  color: BRAND.gold,
  fontSize: '12px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: 0,
  textAlign: 'center' as const,
}
const card = {
  backgroundColor: '#ffffff',
  padding: '32px 28px',
  borderRight: `1px solid #e8e1d4`,
  borderLeft: `1px solid #e8e1d4`,
}
const eyebrow = {
  color: BRAND.gold,
  fontSize: '11px',
  fontWeight: 'bold' as const,
  letterSpacing: '3px',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: BRAND.charcoal,
  margin: '0 0 18px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: '#3a3128',
  lineHeight: '1.7',
  margin: '0 0 16px',
}
const textMuted = {
  fontSize: '13px',
  color: BRAND.muted,
  lineHeight: '1.6',
  margin: '20px 0 0',
}
const button = {
  backgroundColor: BRAND.gold,
  backgroundImage: `linear-gradient(135deg, ${BRAND.gold} 0%, #b8941f 100%)`,
  color: BRAND.charcoal,
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.5px',
  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)',
}
const waCard = {
  backgroundColor: '#0f3d2e',
  backgroundImage: 'linear-gradient(135deg, #0f3d2e 0%, #1a5c45 100%)',
  padding: '24px 28px',
  textAlign: 'center' as const,
  borderRadius: '0 0 14px 14px',
}
const waTitle = {
  color: '#ffffff',
  fontSize: '17px',
  fontWeight: 'bold' as const,
  margin: '0 0 6px',
  textAlign: 'center' as const,
}
const waText = {
  color: '#c8e6d2',
  fontSize: '13px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const waButton = {
  backgroundColor: '#25D366',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e8e1d4', margin: '28px 0 16px' }
const footerSection = { padding: '0 12px 12px', textAlign: 'center' as const }
const footer = {
  fontSize: '12px',
  color: BRAND.muted,
  margin: '0 0 6px',
  textAlign: 'center' as const,
  lineHeight: '1.5',
}
const footerLink = { color: BRAND.wood, textDecoration: 'none', fontWeight: 'bold' as const }
const footerSmall = {
  fontSize: '11px',
  color: '#b8ad9c',
  margin: '12px 0 0',
  textAlign: 'center' as const,
  letterSpacing: '1px',
}

// Inline code-style box (for OTP / token displays)
export const tokenBoxStyle = {
  display: 'block',
  textAlign: 'center' as const,
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: BRAND.charcoal,
  backgroundColor: '#f6f0e6',
  border: `2px dashed ${BRAND.gold}`,
  borderRadius: '10px',
  padding: '18px',
  margin: '20px 0',
  fontFamily: "'Courier New', monospace",
}
