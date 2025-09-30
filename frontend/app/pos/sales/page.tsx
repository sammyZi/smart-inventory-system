"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { POSSidebar } from "@/components/pos/pos-sidebar"
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
import { Search, Eye, Receipt, ShoppingCart, DollarSign, Calendar } from 'lucide-react'
import { sampleSales } from "@/lib/sample-data"
import { useState } from "react"

export default function POSSalesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")

  if (!user || user.role !== "pos_staff") {
    return <div>Access denied</div>
  }

  const filteredSales = sampleSales.filter(sale =>
    sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const todaySales = sampleSales.filter(sale => 
    sale.createdAt.toDateString() === new Date().toDateString()
  )
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0)

  return (
    <DashboardLayout sidebar={<POSSidebar />} title="Sales History">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Sales History</h2>
            <p className="text-gray-600 mt-1">View and manage your sales transactions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                  <p className="text-3xl font-bold text-blue-600">{todaySales.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                  <p className="text-3xl font-bold text-green-600">₹{todayRevenue.toLocaleString()}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-3xl font-bold text-purple-600">{sampleSales.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Receipt className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Search Sales</CardTitle>
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

        {/* Sales Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>
              {filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono font-medium">{sale.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.customerName || "Walk-in Customer"}</p>
                          {sale.customerPhone && (
                            <p className="text-sm text-gray-500">{sale.customerPhone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{sale.items.length} items</TableCell>
                      <TableCell className="font-semibold">₹{sale.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {sale.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>{sale.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
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
