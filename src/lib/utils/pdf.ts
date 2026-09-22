import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
export async function generateReceiptImage(elementId: string): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  return canvas.toDataURL('image/png');
}

export async function downloadReceiptPDF(elementId: string, filename: string = 'receipt.pdf'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);
}