"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ManagerSidebar } from "@/components/manager/manager-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Plus, Minus, AlertTriangle, Package, TrendingDown, TrendingUp, Boxes } from 'lucide-react'
import { sampleProducts } from "@/lib/sample-data"
import { useState } from "react"

export default function ManagerStockPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [adjustmentDialog, setAdjustmentDialog] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase")
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")

  if (!user || user.role !== "store_manager") {
    return <div>Access denied</div>
  }

  const filteredProducts = sampleProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowStockProducts = filteredProducts.filter(product => product.stock < 20)
  const outOfStockProducts = filteredProducts.filter(product => product.stock === 0)
  const totalStockValue = filteredProducts.reduce((sum, product) => sum + (product.price * product.stock), 0)

  const handleStockAdjustment = () => {
    if (!selectedProduct || !adjustmentQuantity) return
    
    const qty = parseInt(adjustmentQuantity)
    if (isNaN(qty) || qty <= 0) return

    console.log(`Adjusting stock for ${selectedProduct.name}:`, {
      type: adjustmentType,
      quantity: qty,
      reason: adjustmentReason
    })
    
    setAdjustmentDialog(false)
    setSelectedProduct(null)
    setAdjustmentQuantity("")
    setAdjustmentReason("")
  }

  const openAdjustmentDialog = (product: any, type: "increase" | "decrease") => {
    setSelectedProduct(product)
    setAdjustmentType(type)
    setAdjustmentDialog(true)
  }

  return (
    <DashboardLayout sidebar={<ManagerSidebar />} title="Stock Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Stock Management</h2>
            <p className="text-gray-600 mt-1">Monitor and adjust inventory levels</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-3xl font-bold text-blue-600">{filteredProducts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-3xl font-bold text-orange-600">{lowStockProducts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-3xl font-bold text-red-600">{outOfStockProducts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Stock Value</p>
                  <p className="text-3xl font-bold text-green-600">₹{Math.round(totalStockValue).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Boxes className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">Search Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="search-stock" className="text-gray-700">Search by name, SKU, or category</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search-stock"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Table */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">Current Stock Levels</CardTitle>
            <CardDescription className="text-gray-600">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Stock Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{product.sku}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="font-semibold">{product.stock}</TableCell>
                      <TableCell>
                        {product.stock === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : product.stock < 20 ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell>₹{product.price.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">
                        ₹{(product.price * product.stock).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openAdjustmentDialog(product, "increase")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openAdjustmentDialog(product, "decrease")}
                            disabled={product.stock === 0}
                          >
                            <Minus className="h-4 w-4" />
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

        {/* Stock Adjustment Dialog */}
        <Dialog open={adjustmentDialog} onOpenChange={setAdjustmentDialog}>
          <DialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <DialogHeader>
              <DialogTitle>
                {adjustmentType === "increase" ? "Increase" : "Decrease"} Stock
              </DialogTitle>
              <DialogDescription>
                {adjustmentType === "increase" ? "Add" : "Remove"} stock for {selectedProduct?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Stock</Label>
                  <p className="text-2xl font-bold text-blue-600">{selectedProduct?.quantity || 0}</p>
                </div>
                <div>
                  <Label htmlFor="adjustment-qty">
                    {adjustmentType === "increase" ? "Add" : "Remove"} Quantity
                  </Label>
                  <Input
                    id="adjustment-qty"
                    type="number"
                    min="1"
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(e.target.value)}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="adjustment-reason">Reason for Adjustment</Label>
                <Textarea
                  id="adjustment-reason"
                  placeholder="Enter reason for stock adjustment..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustmentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleStockAdjustment}>
                {adjustmentType === "increase" ? (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Increase Stock
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Decrease Stock
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
