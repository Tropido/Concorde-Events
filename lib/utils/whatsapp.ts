// The only business WhatsApp number (owner-confirmed). wa.me links open a chat; they do
// not prove anything was sent, delivered or read.
export const BUSINESS_WHATSAPP = "21623040424";
export const BUSINESS_WHATSAPP_DISPLAY = "+216 23 040 424";

export function waLink(text?: string) {
  return `https://wa.me/${BUSINESS_WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
