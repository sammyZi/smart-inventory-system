"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { POSSidebar } from "@/components/pos/pos-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Download, PrinterIcon as Print, ArrowLeft } from 'lucide-react'
import Link from "next/link"
import { generatePDF } from "@/lib/pdf-generator"
import { generateBarcode } from "@/lib/barcode-generator"

export default function InvoicePage() {
  const params = useParams()
  const invoiceId = params.id as string
  const [barcodeUrl, setBarcodeUrl] = useState<string>("")

  // Sample invoice data - in real app, fetch from API
  const invoice = {
    id: invoiceId,
    invoiceNumber: invoiceId,
    date: new Date(),
    customerName: "John Doe",
    customerPhone: "+1234567890",
    customerEmail: "john@example.com",
    items: [
      {
        name: "Wireless Bluetooth Headphones",
        sku: "WBH001",
        quantity: 1,
        price: 2999,
        total: 2999
      },
      {
        name: "Smartphone Case",
        sku: "SPC002",
        quantity: 2,
        price: 599,
        total: 1198
      }
    ],
    subtotal: 4197,
    tax: 755.46,
    discount: 200,
    total: 4752.46,
    paymentMethod: "card"
  }

  useEffect(() => {
    // Generate barcode for invoice
    const barcode = generateBarcode(invoiceId)
    setBarcodeUrl(barcode)
  }, [invoiceId])

  const handleDownloadPDF = () => {
    generatePDF(invoice, barcodeUrl)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <DashboardLayout sidebar={<POSSidebar />} title="Invoice">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/pos">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to POS
            </Button>
          </Link>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handlePrint}>
              <Print className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Invoice */}
        <Card className="print:shadow-none">
          <CardContent className="p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-primary">INVOICE</h1>
                <p className="text-lg font-semibold mt-2">{invoice.invoiceNumber}</p>
                <p className="text-muted-foreground">Date: {invoice.date.toLocaleDateString()}</p>
              </div>
              
              <div className="text-right">
                <h2 className="text-2xl font-bold">InvBill System</h2>
                <p className="text-muted-foreground">123 Business Street</p>
                <p className="text-muted-foreground">City, State 12345</p>
                <p className="text-muted-foreground">Phone: +1 (555) 123-4567</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
              <div className="text-muted-foreground">
                <p className="font-medium text-foreground">{invoice.customerName}</p>
                {invoice.customerPhone && <p>Phone: {invoice.customerPhone}</p>}
                {invoice.customerEmail && <p>Email: {invoice.customerEmail}</p>}
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Item</th>
                    <th className="text-left py-2">SKU</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-muted-foreground">{item.sku}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">₹{item.price.toLocaleString()}</td>
                      <td className="py-2 text-right">₹{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>₹{invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tax (18%):</span>
                  <span>₹{invoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Discount:</span>
                  <span>-₹{invoice.discount.toLocaleString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between py-1 text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Info & Barcode */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">
                  Payment Method: <span className="font-medium capitalize">{invoice.paymentMethod}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Thank you for your business!
                </p>
              </div>
              
              {barcodeUrl && (
                <div className="text-center">
                  <img src={barcodeUrl || "/placeholder.svg"} alt="Invoice Barcode" className="mb-2" />
                  <p className="text-xs text-muted-foreground">{invoice.invoiceNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
