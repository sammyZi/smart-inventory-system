"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ManagerSidebar } from "@/components/manager/manager-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Edit, Package, AlertTriangle, ScanBarcode } from 'lucide-react'
import { sampleProducts, type Product } from "@/lib/sample-data"
import { useToast } from "@/hooks/use-toast"

export default function ManagerProductsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>(sampleProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  if (!user || user.role !== "store_manager") {
    return <div>Access denied</div>
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowStockProducts = products.filter(p => p.stock <= p.minStock)

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsEditDialogOpen(true)
  }

  const handleSaveProduct = () => {
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? { ...editingProduct, updatedAt: new Date() } : p))
      setIsEditDialogOpen(false)
      setEditingProduct(null)
      toast({
        title: "Product Updated",
        description: `${editingProduct.name} has been updated successfully.`,
      })
    }
  }

  const handleSimulateBarcodeScan = () => {
    // Simulate scanning a barcode
    const scannedBarcode = "9876543210987" // Example barcode
    if (editingProduct) {
      setEditingProduct(prev => prev ? { ...prev, barcode: scannedBarcode } : null)
    }
    toast({
      title: "Barcode Scanned",
      description: `Barcode ${scannedBarcode} added.`,
    })
  }

  return (
    <DashboardLayout sidebar={<ManagerSidebar />} title="Product Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Products</h2>
            <p className="text-gray-600 mt-1">Manage product inventory and stock levels</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-3xl font-bold text-blue-600">{products.length}</p>
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
                  <p className={`text-3xl font-bold ${lowStockProducts.length > 5 ? 'text-red-600' : 'text-orange-600'}`}>{lowStockProducts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className={`text-3xl font-bold ${products.filter(p => p.stock === 0).length > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {products.filter(p => p.stock === 0).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-3xl font-bold text-green-600">
                    {new Set(products.map(p => p.category)).size}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
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
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, SKU, barcode, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">All Products</CardTitle>
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
                    <TableHead>Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">₹{product.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{product.stock}</span>
                          {product.stock <= product.minStock && (
                            <Badge variant="destructive" className="text-xs">Low</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                          {product.stock > 0 ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditProduct(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Product Dialog */}
        {editingProduct && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-gray-200/50">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Edit Product: {editingProduct.name}</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Update product details and stock levels.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-gray-700">Product Name</Label>
                  <Input 
                    id="edit-name" 
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sku" className="text-gray-700">SKU</Label>
                  <Input 
                    id="edit-sku" 
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="edit-barcode" className="text-gray-700">Barcode</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="edit-barcode" 
                      value={editingProduct.barcode}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                    <Button type="button" variant="outline" onClick={handleSimulateBarcodeScan}>
                      <ScanBarcode className="h-4 w-4 mr-2" />
                      Scan
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category" className="text-gray-700">Category</Label>
                  <Input 
                    id="edit-category" 
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="text-gray-700">Price (₹)</Label>
                  <Input 
                    id="edit-price" 
                    type="number" 
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cost" className="text-gray-700">Cost (₹)</Label>
                  <Input 
                    id="edit-cost" 
                    type="number" 
                    value={editingProduct.cost}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost: parseFloat(e.target.value) || 0 })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock" className="text-gray-700">Stock Quantity</Label>
                  <Input 
                    id="edit-stock" 
                    type="number" 
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-minStock" className="text-gray-700">Min Stock</Label>
                  <Input 
                    id="edit-minStock" 
                    type="number" 
                    value={editingProduct.minStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: parseInt(e.target.value) || 0 })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="edit-description" className="text-gray-700">Description (Optional)</Label>
                  <Input 
                    id="edit-description" 
                    value={editingProduct.description || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProduct} className="gradient-bg">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}
