export interface InvoiceSummary {
  customerName: string;
  invoiceNumber: string;
  items: { description: string; quantity: number; amount: number }[];
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currencySymbol: string;
  businessName: string;
}

export function generateWhatsAppLink(phone: string, data: InvoiceSummary): string {
  const itemLines = data.items
    .map((item) => `• ${item.quantity}x ${item.description} - ${data.currencySymbol}${item.amount.toLocaleString()}`)
    .join('\n');

  const text = `*Receipt from ${data.businessName}*\n` +
    `Invoice #${data.invoiceNumber}\n` +
    `Customer: ${data.customerName}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `*Total:* ${data.currencySymbol}${data.totalAmount.toLocaleString()}\n` +
    `*Amount Paid:* ${data.currencySymbol}${data.amountPaid.toLocaleString()}\n` +
    `*Balance Due:* ${data.currencySymbol}${data.balanceDue.toLocaleString()}\n\n` +
    `Thank you for your business!`;

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text);

  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}