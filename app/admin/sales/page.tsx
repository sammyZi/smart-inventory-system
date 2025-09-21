"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
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
import { Search, Eye, Download, ShoppingCart, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { sampleSales, sampleStores } from "@/lib/sample-data"
import { useState } from "react"
import Link from "next/link"

export default function AdminSalesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("all") // For filtering sales by store

  if (!user || user.role !== "admin") {
    return <div>Access denied</div>
  }

  const filteredSales = sampleSales.filter(sale =>
    (selectedStoreFilter === "all" || sale.storeId === selectedStoreFilter) &&
    (sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
  const todaySales = filteredSales.filter(sale => 
    sale.createdAt.toDateString() === new Date().toDateString()
  )
  const avgOrderValue = totalRevenue / filteredSales.length

  return (
    <DashboardLayout sidebar={<AdminSidebar />} title="Sales Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Sales</h2>
            <p className="text-gray-600 mt-1">Monitor and manage all sales transactions</p>
          </div>
          
          <Button className="gradient-bg shadow-lg">
            <Download className="h-4 w-4 mr-2" />
            Export Sales
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
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
                  <p className="text-3xl font-bold text-blue-600">{filteredSales.length}</p>
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
                  <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                  <p className="text-3xl font-bold text-purple-600">{todaySales.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-3xl font-bold text-orange-600">₹{avgOrderValue.toFixed(0)}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Search & Filter Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search-sales" className="text-gray-700">Search Sales</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-sales"
                    placeholder="Search by invoice number, customer name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div className="w-full lg:w-64 space-y-2">
                <Label htmlFor="filter-store" className="text-gray-700">Filter by Store</Label>
                <Select value={selectedStoreFilter} onValueChange={setSelectedStoreFilter}>
                  <SelectTrigger id="filter-store" className="h-12 bg-white/80 border-gray-200/70">
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border border-gray-200/50">
                    <SelectItem value="all">All Stores</SelectItem>
                    {sampleStores.map(store => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All Sales</CardTitle>
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
                    <TableHead>Store</TableHead> {/* Added Store column */}
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
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
                          {sale.customerEmail && (
                            <p className="text-sm text-gray-500">{sale.customerEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{sampleStores.find(s => s.id === sale.storeId)?.name || "N/A"}</TableCell> {/* Display store name */}
                      <TableCell>{sale.items.length} items</TableCell>
                      <TableCell className="font-semibold">₹{sale.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {sale.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.status === "completed" ? "default" : "secondary"}>
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{sale.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/pos/invoice/${sale.invoiceNumber}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
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
