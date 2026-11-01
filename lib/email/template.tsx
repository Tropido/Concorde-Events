import { Body, Button, Column, Container, Head, Heading, Hr, Html, Link, Preview, Row, Section, Text } from "@react-email/components";
import { render } from "@react-email/render";
import { BRAND_NAME } from "@/lib/brand";
import { BUSINESS_WHATSAPP_DISPLAY, waLink } from "@/lib/utils/whatsapp";
import type { Language } from "@/lib/i18n/translations";
import { emailContent, emailLabels, type EmailData, type EmailKind } from "./copy";

// One layout for every email: always the light palette, whatever the client's theme.
const INK = "#2b1d13";
const SOFT = "#6f5a4a";
const LINE = "#e9dccd";
const PAPER = "#f7f1ea";
const CARD = "#fcf9f5";

export function OrderEmail({ kind, lang, data, link }: { kind: EmailKind; lang: Language; data: EmailData; link?: string }) {
  const c = emailContent(kind, lang, data);
  const l = emailLabels(lang);
  const rtl = lang === "ar";
  const align = rtl ? "right" : "left";
  const font = rtl ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "'Inter Tight', 'Helvetica Neue', Arial, sans-serif";
  return (
    <Html lang={lang} dir={rtl ? "rtl" : "ltr"}>
      <Head />
      <Preview>{c.heading}</Preview>
      <Body style={{ backgroundColor: PAPER, color: INK, fontFamily: font, margin: 0, padding: "24px 12px" }}>
        <Container style={{ maxWidth: 560, backgroundColor: CARD, borderRadius: 20, padding: 32 }}>
          <Text style={{ fontSize: 17, fontWeight: 700, margin: "0 0 24px", textAlign: align }}>{BRAND_NAME}</Text>
          <Heading as="h1" style={{ fontSize: 24, lineHeight: "30px", fontWeight: 700, margin: "0 0 16px", textAlign: align }}>{c.heading}</Heading>
          <Text style={{ fontSize: 15, lineHeight: "22px", margin: "0 0 8px", textAlign: align }}>{l.greeting(data.name)}</Text>
          {c.paragraphs.map((p) => <Text key={p} style={{ fontSize: 15, lineHeight: "22px", margin: "0 0 8px", textAlign: align }}>{p}</Text>)}
          {c.rows.length > 0 && (
            <Section style={{ backgroundColor: PAPER, borderRadius: 14, padding: "12px 16px", margin: "16px 0" }}>
              {c.rows.map(([k, v]) => (
                <Row key={k}>
                  <Column style={{ fontSize: 13, color: SOFT, padding: "4px 0", textAlign: align }}>{k}</Column>
                  <Column style={{ fontSize: 13, fontWeight: 600, padding: "4px 0", textAlign: rtl ? "left" : "right" }} dir="auto">{v}</Column>
                </Row>
              ))}
            </Section>
          )}
          {c.cta && link && (
            <Section style={{ textAlign: "center", margin: "20px 0 4px" }}>
              <Button href={link} style={{ backgroundColor: INK, color: CARD, borderRadius: 999, padding: "13px 24px", fontSize: 14, fontWeight: 600 }}>{c.cta}</Button>
            </Section>
          )}
          <Hr style={{ borderColor: LINE, margin: "24px 0 16px" }} />
          <Text style={{ fontSize: 13, color: SOFT, margin: "0 0 4px", textAlign: align }}>{l.contact} <Link href={waLink()} style={{ color: INK }}><span dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</span></Link></Text>
          <Text style={{ fontSize: 12, color: SOFT, margin: 0, textAlign: align }}>{l.footer} · {l.rights}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderEmail(kind: EmailKind, lang: Language, data: EmailData, link?: string) {
  const element = <OrderEmail kind={kind} lang={lang} data={data} link={link} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: emailContent(kind, lang, data).subject, html, text };
}
