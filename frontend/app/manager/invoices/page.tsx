"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ManagerSidebar } from "@/components/manager/manager-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Eye, Download, FileText, Plus, Calendar, DollarSign, CreditCard, CheckCircle } from 'lucide-react'
import { sampleSales } from "@/lib/sample-data"
import { useState } from "react"
import Link from "next/link"

export default function ManagerInvoicesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [invoiceDialog, setInvoiceDialog] = useState(false)

  if (!user || user.role !== "store_manager") {
    return <div>Access denied</div>
  }

  // Filter invoices for current store
  const storeInvoices = sampleSales.filter(sale => 
    user.storeId ? sale.storeId === user.storeId : true
  )

  const filteredInvoices = storeInvoices.filter(invoice =>
    (statusFilter === "all" || invoice.status === statusFilter) &&
    (invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalInvoices = filteredInvoices.length
  const paidInvoices = filteredInvoices.filter(invoice => invoice.status === "completed")
  const pendingInvoices = filteredInvoices.filter(invoice => invoice.status === "pending")
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0)

  const viewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setInvoiceDialog(true)
  }

  const downloadInvoice = (invoice: any) => {
    console.log(`Downloading invoice: ${invoice.invoiceNumber}`)
  }

  return (
    <DashboardLayout sidebar={<ManagerSidebar />} title="Invoice Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Invoice Management</h2>
            <p className="text-gray-600 mt-1">Manage store invoices and billing</p>
          </div>
          <Link href="/pos">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-3xl font-bold text-blue-600">{totalInvoices}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                  <p className="text-3xl font-bold text-green-600">{paidInvoices.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingInvoices.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-3xl font-bold text-purple-600">₹{totalAmount.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">Search & Filter Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search-invoices" className="text-gray-700">Search Invoices</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-invoices"
                    placeholder="Search by invoice number, customer name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div className="space-y-2 min-w-[200px]">
                <Label htmlFor="status-filter" className="text-gray-700">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">Invoice List</CardTitle>
            <CardDescription className="text-gray-600">
              {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.customerName || "Walk-in Customer"}</p>
                          {invoice.customerEmail && (
                            <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{invoice.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.items.length} items</TableCell>
                      <TableCell className="font-semibold">₹{invoice.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            invoice.status === "completed" 
                              ? "default" 
                              : invoice.status === "pending" 
                              ? "secondary" 
                              : "destructive"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => viewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => downloadInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details Dialog */}
        <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>
                Invoice #{selectedInvoice?.invoiceNumber}
              </DialogDescription>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Customer Information</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedInvoice.customerName || "Walk-in Customer"}
                    </p>
                    {selectedInvoice.customerEmail && (
                      <p className="text-sm text-gray-600">{selectedInvoice.customerEmail}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className="font-semibold text-gray-900">Invoice Info</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Date: {selectedInvoice.createdAt.toLocaleDateString()}
                    </p>
                    <Badge 
                      variant={
                        selectedInvoice.status === "completed" 
                          ? "default" 
                          : selectedInvoice.status === "pending" 
                          ? "secondary" 
                          : "destructive"
                      }
                    >
                      {selectedInvoice.status}
                    </Badge>
                  </div>
                </div>

                {/* Invoice Items */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.price.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{(item.quantity * item.price).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Invoice Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{selectedInvoice.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setInvoiceDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => downloadInvoice(selectedInvoice)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
