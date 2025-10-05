"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Package, ScanBarcode } from 'lucide-react'
import { sampleProducts, sampleStores, type Product } from "@/lib/sample-data" // Import sampleStores
import { useToast } from "@/hooks/use-toast"

export default function AdminProductsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>(sampleProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 0,
    description: "",
    storeId: "" // Added storeId
  })
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("all") // For filtering products by store

  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators and managers can view products.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const isAdmin = user.role === "ADMIN"
  const canEdit = user.role === "MANAGER"

  const filteredProducts = products.filter(product =>
    (selectedStoreFilter === "all" || product.storeId === selectedStoreFilter) &&
    (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCreateProduct = () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.barcode || !newProduct.category || newProduct.price <= 0 || newProduct.stock < 0 || !newProduct.storeId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required product details, including store.",
        variant: "destructive"
      })
      return
    }

    const product: Product = {
      id: (products.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...newProduct
    }
    
    setProducts([...products, product])
    setNewProduct({ name: "", sku: "", barcode: "", category: "", price: 0, cost: 0, stock: 0, minStock: 0, description: "", storeId: "" })
    setIsCreateDialogOpen(false)
    
    toast({
      title: "Product created",
      description: "New product has been added successfully.",
    })
  }

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

  const handleSimulateBarcodeScan = (isEditing: boolean) => {
    const scannedBarcode = "9876543210987" // Example barcode
    if (isEditing && editingProduct) {
      setEditingProduct(prev => prev ? { ...prev, barcode: scannedBarcode } : null)
    } else {
      setNewProduct(prev => ({ ...prev, barcode: scannedBarcode }))
    }
    toast({
      title: "Barcode Scanned",
      description: `Barcode ${scannedBarcode} added.`,
    })
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />} title="Product Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Products</h2>
            <p className="text-gray-600 mt-1">Manage your product inventory</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>
                  Add a new product to your inventory.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter product name" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input 
                    id="sku" 
                    placeholder="Enter SKU" 
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="barcode">Barcode</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="barcode" 
                      placeholder="Enter barcode manually or scan" 
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    />
                    <Button type="button" variant="outline" onClick={() => handleSimulateBarcodeScan(false)}>
                      <ScanBarcode className="h-4 w-4 mr-2" />
                      Scan
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input 
                    id="category" 
                    placeholder="e.g., Electronics, Apparel" 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    placeholder="0.00" 
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost (₹)</Label>
                  <Input 
                    id="cost" 
                    type="number" 
                    placeholder="0.00" 
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    placeholder="0" 
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Min Stock</Label>
                  <Input 
                    id="minStock" 
                    type="number" 
                    placeholder="0" 
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input 
                    id="description" 
                    placeholder="Short description of the product" 
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="store">Assign to Store</Label>
                  <Select value={newProduct.storeId} onValueChange={(value) => setNewProduct({ ...newProduct, storeId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleStores.map(store => (
                        <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProduct} className="gradient-bg">Create Product</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900">{filteredProducts.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {filteredProducts.filter(p => p.stock <= p.minStock).length}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-3xl font-bold text-red-600">
                    {filteredProducts.filter(p => p.stock === 0).length}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <Package className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-3xl font-bold text-green-600">
                    {new Set(filteredProducts.map(p => p.category)).size}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Search & Filter Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, SKU, barcode, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-store">Filter by Store</Label>
                <Select value={selectedStoreFilter} onValueChange={setSelectedStoreFilter}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
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

        {/* Products Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All Products</CardTitle>
            <CardDescription>
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
                    <TableHead>Store</TableHead> {/* Added Store column */}
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
                      <TableCell>{sampleStores.find(s => s.id === product.storeId)?.name || "N/A"}</TableCell> {/* Display store name */}
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
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
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

        {/* Edit Product Dialog */}
        {editingProduct && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Product: {editingProduct.name}</DialogTitle>
                <DialogDescription>
                  Update product details and stock levels.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Product Name</Label>
                  <Input 
                    id="edit-name" 
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input 
                    id="edit-sku" 
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="edit-barcode">Barcode</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="edit-barcode" 
                      value={editingProduct.barcode}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    />
                    <Button type="button" variant="outline" onClick={() => handleSimulateBarcodeScan(true)}>
                      <ScanBarcode className="h-4 w-4 mr-2" />
                      Scan
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Input 
                    id="edit-category" 
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price (₹)</Label>
                  <Input 
                    id="edit-price" 
                    type="number" 
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cost">Cost (₹)</Label>
                  <Input 
                    id="edit-cost" 
                    type="number" 
                    value={editingProduct.cost}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock Quantity</Label>
                  <Input 
                    id="edit-stock" 
                    type="number" 
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-minStock">Min Stock</Label>
                  <Input 
                    id="edit-minStock" 
                    type="number" 
                    value={editingProduct.minStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Input 
                    id="edit-description" 
                    value={editingProduct.description || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="edit-store">Assign to Store</Label>
                  <Select value={editingProduct.storeId} onValueChange={(value) => setEditingProduct({ ...editingProduct, storeId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleStores.map(store => (
                        <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
