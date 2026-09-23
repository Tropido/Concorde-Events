import { RequestItem } from "../types";

export interface WhatsAppData {
  customerName: string;
  phone: string;
  companyName?: string;
  startDate: string;
  endDate: string;
  items: RequestItem[];
  notes?: string;
  targetPhone?: string; // Business WhatsApp Number
}

export function generateWhatsAppMessage(data: WhatsAppData): string {
  const itemsList = data.items
    .map(
      (item) =>
        `• ${item.quantity}x ${item.title} (${item.startDate || data.startDate} to ${item.endDate || data.endDate}, ${item.totalDays || 1} days)`
    )
    .join("\n");

  const text = `Hello Concorde Events,

I would like a quotation for an upcoming event rental.

🛋 *FURNITURE & DATES REQUESTED:*
${itemsList}

🗓 *OVERALL RENTAL WINDOW:*
${data.startDate} to ${data.endDate}

👤 *CONTACT DETAILS:*
• Name: ${data.customerName}
• Phone: ${data.phone}
${data.companyName ? `• Company: ${data.companyName}\n` : ""}${
    data.notes ? `\n📝 *SPECIAL NOTES:* ${data.notes}` : ""
  }

Please review availability and provide a quotation. Thank you!`;

  return text;
}

export function openWhatsAppQuotation(data: WhatsAppData) {
  const message = generateWhatsAppMessage(data);
  const encoded = encodeURIComponent(message);
  const phone = data.targetPhone || "447700900999";
  const url = `https://wa.me/${phone}?text=${encoded}`;

  if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
  return url;
}
