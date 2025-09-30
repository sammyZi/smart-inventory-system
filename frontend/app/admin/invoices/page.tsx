"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Eye, Download, FileText, Calendar, DollarSign } from 'lucide-react'
import { sampleSales } from "@/lib/sample-data"
import { useState } from "react"

export default function AdminInvoicesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")

  if (!user || user.role !== "admin") {
    return <div>Access denied</div>
  }

  const filteredInvoices = sampleSales.filter(sale =>
    sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalInvoices = sampleSales.length
  const totalValue = sampleSales.reduce((sum, sale) => sum + sale.total, 0)
  const paidInvoices = sampleSales.filter(sale => sale.status === "completed").length

  return (
    <DashboardLayout sidebar={<AdminSidebar />} title="Invoice Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Invoices</h2>
            <p className="text-gray-600 mt-1">Manage and track all invoices</p>
          </div>
          
          <Button className="gradient-bg shadow-lg">
            <Download className="h-4 w-4 mr-2" />
            Export Invoices
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-3xl font-bold text-blue-600">{totalInvoices}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-3xl font-bold text-green-600">₹{totalValue.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                  <p className="text-3xl font-bold text-purple-600">{paidInvoices}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Search Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
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
                          {invoice.customerPhone && (
                            <p className="text-sm text-gray-500">{invoice.customerPhone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{invoice.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell className="font-semibold">₹{invoice.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {invoice.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === "completed" ? "default" : "secondary"}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
      </div>
    </DashboardLayout>
  )
}
