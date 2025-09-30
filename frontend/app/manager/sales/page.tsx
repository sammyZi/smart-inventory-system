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
import { Search, Eye, Download, ShoppingCart, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { sampleSales, sampleStores } from "@/lib/sample-data"
import { useState } from "react"
import Link from "next/link"

export default function ManagerSalesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("all")

  if (!user || user.role !== "store_manager") {
    return <div>Access denied</div>
  }

  // Filter sales to show only current store manager's store
  const storeSales = sampleSales.filter(sale => 
    user.storeId ? sale.storeId === user.storeId : true
  )

  const filteredSales = storeSales.filter(sale =>
    (selectedStoreFilter === "all" || sale.storeId === selectedStoreFilter) &&
    (sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
  const todaySales = filteredSales.filter(sale => 
    sale.createdAt.toDateString() === new Date().toDateString()
  )
  const avgOrderValue = totalRevenue / filteredSales.length || 0

  return (
    <DashboardLayout sidebar={<ManagerSidebar />} title="Sales Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Sales</h2>
            <p className="text-gray-600 mt-1">Track and manage store sales performance</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-3xl font-bold text-blue-600">{filteredSales.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                  <p className="text-3xl font-bold text-purple-600">{todaySales.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-3xl font-bold text-orange-600">₹{Math.round(avgOrderValue).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">Search & Filter Sales</CardTitle>
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
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Sales</CardTitle>
            <CardDescription className="text-gray-600">
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
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.slice(0, 10).map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.customerName || "Walk-in Customer"}</p>
                          {sale.customerEmail && (
                            <p className="text-sm text-gray-600">{sale.customerEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{sale.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>{sale.items.length}</TableCell>
                      <TableCell className="font-semibold">₹{sale.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={sale.status === "completed" ? "default" : sale.status === "pending" ? "secondary" : "destructive"}
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
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
