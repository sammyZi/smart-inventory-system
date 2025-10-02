/**
 * PDF Receipt Generator
 * Generates PDF receipts with tenant branding
 */

import { ReceiptData } from '../services/billingService';

export class PDFGenerator {
  /**
   * Generate PDF receipt with tenant branding
   * In production, use libraries like puppeteer, pdfkit, or jsPDF
   */
  static async generateReceipt(receiptData: ReceiptData): Promise<Buffer> {
    // For now, return a mock PDF
    // In production, implement actual PDF generation with:
    // - Tenant logo and branding colors
    // - QR code for verification
    // - Itemized list with prices
    // - Tax breakdown
    // - Payment information
    
    const htmlContent = this.generateReceiptHTML(receiptData);
    
    // Mock PDF generation
    // In production: const pdf = await htmlToPDF(htmlContent);
    const mockPDF = Buffer.from(`PDF Receipt for ${receiptData.transaction.transactionNo}`);
    
    return mockPDF;
  }

  /**
   * Generate HTML template for receipt
   */
  private static generateReceiptHTML(receiptData: ReceiptData): string {
    const { transaction, tenantBranding, locationInfo } = receiptData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${transaction.transactionNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            max-width: 80mm; 
            margin: 0 auto; 
            padding: 10mm;
            font-size: 12px;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #000; 
            padding-bottom: 10px; 
            margin-bottom: 10px;
          }
          .logo { max-width: 100px; margin-bottom: 10px; }
          .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .company-info { font-size: 10px; line-height: 1.4; }
          .transaction-info { margin: 10px 0; font-size: 10px; }
          .transaction-info div { margin: 3px 0; }
          .items { margin: 10px 0; }
          .items-header { 
            display: flex; 
            justify-content: space-between; 
            font-weight: bold; 
            border-bottom: 1px solid #000; 
            padding-bottom: 5px; 
            margin-bottom: 5px;
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0; 
            font-size: 11px;
          }
          .item-details { flex: 1; }
          .item-price { text-align: right; min-width: 60px; }
          .totals { 
            border-top: 1px solid #000; 
            padding-top: 10px; 
            margin-top: 10px;
          }
          .total-line { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0; 
          }
          .total-line.grand-total { 
            font-weight: bold; 
            font-size: 14px; 
            border-top: 2px solid #000; 
            padding-top: 5px; 
            margin-top: 5px;
          }
          .payment-info { 
            margin: 10px 0; 
            padding: 10px 0; 
            border-top: 1px dashed #000; 
            font-size: 10px;
          }
          .qr-code { 
            text-align: center; 
            margin: 15px 0; 
          }
          .qr-code img { 
            max-width: 100px; 
            height: auto; 
          }
          .footer { 
            text-align: center; 
            margin-top: 15px; 
            padding-top: 10px; 
            border-top: 2px dashed #000; 
            font-size: 10px;
          }
          .footer-message { 
            margin: 5px 0; 
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${tenantBranding.logo ? `<img src="${tenantBranding.logo}" alt="Logo" class="logo">` : ''}
          <div class="company-name">${tenantBranding.companyName}</div>
          <div class="company-info">
            ${tenantBranding.address}<br>
            ${tenantBranding.phone ? `Tel: ${tenantBranding.phone}<br>` : ''}
            ${tenantBranding.email ? `Email: ${tenantBranding.email}<br>` : ''}
            ${tenantBranding.taxNumber ? `Tax ID: ${tenantBranding.taxNumber}` : ''}
          </div>
        </div>

        <div class="transaction-info">
          <div><strong>Receipt #:</strong> ${transaction.transactionNo}</div>
          <div><strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleString()}</div>
          <div><strong>Location:</strong> ${locationInfo.name}</div>
          <div><strong>Cashier:</strong> Staff #${transaction.staffId.substring(0, 8)}</div>
        </div>

        <div class="items">
          <div class="items-header">
            <span>Item</span>
            <span>Amount</span>
          </div>
          ${transaction.items.map(item => `
            <div class="item">
              <div class="item-details">
                ${item.productName}<br>
                <small>${item.quantity} x $${item.unitPrice.toFixed(2)}</small>
                ${item.discountAmount > 0 ? `<br><small>Discount: -$${item.discountAmount.toFixed(2)}</small>` : ''}
              </div>
              <div class="item-price">$${item.totalPrice.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>$${transaction.subtotal.toFixed(2)}</span>
          </div>
          ${transaction.discountAmount > 0 ? `
            <div class="total-line">
              <span>Discount:</span>
              <span>-$${transaction.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-line">
            <span>Tax:</span>
            <span>$${transaction.taxAmount.toFixed(2)}</span>
          </div>
          <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>$${transaction.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-info">
          <div><strong>Payment Method:</strong> ${transaction.paymentMethod}</div>
          <div><strong>Payment Status:</strong> ${transaction.paymentStatus}</div>
        </div>

        ${receiptData.qrCode ? `
          <div class="qr-code">
            <img src="${receiptData.qrCode}" alt="QR Code">
            <div><small>Scan for verification</small></div>
          </div>
        ` : ''}

        <div class="footer">
          <div class="footer-message">Thank you for your business!</div>
          <div><small>Please keep this receipt for your records</small></div>
          ${tenantBranding.website ? `<div><small>${tenantBranding.website}</small></div>` : ''}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate invoice PDF (more detailed than receipt)
   */
  static async generateInvoice(invoiceData: any): Promise<Buffer> {
    // Similar to receipt but with more details
    // Include: payment terms, due date, itemized breakdown, etc.
    const mockPDF = Buffer.from(`PDF Invoice for ${invoiceData.invoiceNo}`);
    return mockPDF;
  }
}
