import { RentalRequest } from "../types";
import { formatCurrency, formatDate } from "./formatters";

export function generateQuotationHTML(request: RentalRequest): string {
  const itemsRows = request.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <strong>${item.title}</strong>
        <div style="font-size: 11px; color: #718096; margin-top: 2px;">
          🗓 Dates: ${item.startDate || request.start_date} → ${item.endDate || request.end_date} (${item.totalDays || 1} days)
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.professional_price)} / day</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.professional_price * item.quantity * (item.totalDays || 1))}</td>
    </tr>
  `
    )
    .join("");

  let badgeColor = "#b09b5b";
  let statusLabel = request.status.toUpperCase().replace("_", " ");

  if (request.status === "validated" || request.status === "confirmed") {
    badgeColor = "#10b981"; // emerald
  } else if (request.status === "rejected") {
    badgeColor = "#ef4444"; // rose
  } else if (request.status === "reprogramed") {
    badgeColor = "#f59e0b"; // amber
  } else if (request.status === "under_review") {
    badgeColor = "#3b82f6"; // blue
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Concorde Events Quotation ${request.reference_code}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b09b5b; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #1a1a1a; }
        .badge { background: ${badgeColor}; color: white; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .details { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { background: #fdfbf7; border: 1px solid #e6dfc8; padding: 16px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        th { background: #1a1a1a; color: white; padding: 12px; text-align: left; font-size: 13px; text-transform: uppercase; }
        .total { margin-top: 30px; text-align: right; font-size: 18px; font-weight: bold; color: #b09b5b; }
        .footer { margin-top: 50px; font-size: 12px; color: #718096; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">CONCORDE EVENTS</div>
          <div style="color: #b09b5b; font-size: 12px;">LUXURY EVENT CATALOGUE & QUOTATIONS</div>
        </div>
        <div style="text-align: right;">
          <span class="badge">${statusLabel}</span>
          <div style="margin-top: 8px; font-size: 13px;">Ref: <strong>${request.reference_code}</strong></div>
        </div>
      </div>

      <div class="details">
        <div class="card">
          <strong style="color: #b09b5b;">CLIENT & EVENT DETAILS</strong>
          <div style="margin-top: 8px;"><strong>${request.customer_name}</strong></div>
          <div>${request.company_name || 'Private Client'}</div>
          <div>${request.customer_email} | ${request.customer_phone}</div>
        </div>
        <div class="card">
          <strong style="color: #b09b5b;">RENTAL WINDOW</strong>
          <div style="margin-top: 8px;">Start Date: ${formatDate(request.start_date)}</div>
          <div>End Date: ${formatDate(request.end_date)}</div>
          <div>Total Days: ${request.total_days} Day(s)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Daily Rate</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="total">
        ESTIMATED TOTAL: ${formatCurrency(request.estimated_subtotal)}
      </div>

      <div class="footer">
        This document is an official estimation generated via the Concorde Events Professional Portal.<br />
        Current Status: <strong>${statusLabel}</strong>. Subject to manual stock lock & delivery inspection.
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;
}

export function downloadQuotationPDF(request: RentalRequest) {
  if (typeof window === "undefined") return;
  const html = generateQuotationHTML(request);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
