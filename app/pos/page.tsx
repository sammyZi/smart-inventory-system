"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { POSSidebar } from "@/components/pos/pos-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, GlassCard } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, ScanBarcode, XCircle } from 'lucide-react'
import { sampleProducts, type Product, type SaleItem } from "@/lib/sample-data"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface CartItem extends SaleItem {
  product: Product
}

export default function POSPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [products] = useState<Product[]>(sampleProducts)
  const [productSearchInput, setProductSearchInput] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" })
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash")
  const [discount, setDiscount] = useState(0)

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user && user.role !== "pos_staff") {
      router.push("/login")
    }
  }, [user, router])

  if (!user || user.role !== "pos_staff") {
    return <div>Loading...</div>
  }

  const findProduct = (query: string): Product | undefined => {
    const lowerCaseQuery = query.toLowerCase()
    return products.find(product =>
      product.name.toLowerCase().includes(lowerCaseQuery) ||
      product.sku.toLowerCase() === lowerCaseQuery ||
      product.barcode === query
    )
  }

  const handleAddProductToCart = () => {
    if (!productSearchInput) return

    const productToAdd = findProduct(productSearchInput)

    if (!productToAdd) {
      toast({
        title: "Product Not Found",
        description: `No product found for "${productSearchInput}".`,
        variant: "destructive"
      })
      return
    }

    const existingItem = cart.find(item => item.productId === productToAdd.id)
    
    if (existingItem) {
      if (existingItem.quantity < productToAdd.stock) {
        setCart(cart.map(item =>
          item.productId === productToAdd.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        ))
      } else {
        toast({
          title: "Insufficient Stock",
          description: `Only ${productToAdd.stock} items of ${productToAdd.name} available.`,
          variant: "destructive"
        })
      }
    } else {
      if (productToAdd.stock > 0) {
        const cartItem: CartItem = {
          productId: productToAdd.id,
          productName: productToAdd.name,
          sku: productToAdd.sku,
          quantity: 1,
          price: productToAdd.price,
          total: productToAdd.price,
          product: productToAdd
        }
        setCart([...cart, cartItem])
      } else {
        toast({
          title: "Out of Stock",
          description: `${productToAdd.name} is currently out of stock.`,
          variant: "destructive"
        })
      }
    }
    setProductSearchInput("")
    searchInputRef.current?.focus()
  }

  const handleScanBarcode = () => {
    const scannedValue = prompt("Simulate Barcode Scan: Enter barcode, SKU, or product name:")
    if (scannedValue) {
      setProductSearchInput(scannedValue)
      setTimeout(() => {
        handleAddProductToCart()
      }, 100);
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    if (newQuantity > product.stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.stock} items of ${product.name} available.`,
        variant: "destructive"
      })
      return
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
        : item
    ))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const taxRate = 0.18
  const tax = subtotal * taxRate
  const total = subtotal + tax - discount

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before checkout.",
        variant: "destructive"
      })
      return
    }

    const invoiceNumber = `INV-${Date.now()}`
    
    toast({
      title: "Sale Completed",
      description: `Invoice ${invoiceNumber} generated successfully.`,
    })

    setCart([])
    setCustomer({ name: "", email: "", phone: "" })
    setDiscount(0)
    setPaymentMethod("cash")
    
    router.push(`/pos/invoice/${invoiceNumber}`)
  }

  return (
    <DashboardLayout sidebar={<POSSidebar />} title="Point of Sale">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Section: Product Search & Cart */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
              <CardDescription>Search by name, SKU, or barcode.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Type or scan product..."
                  value={productSearchInput}
                  onChange={(e) => setProductSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProductToCart()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleAddProductToCart}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
              <Button variant="outline" onClick={handleScanBarcode}>
                <ScanBarcode className="h-4 w-4 mr-2" />
                Scan
              </Button>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Sale</CardTitle>
                  <CardDescription>
                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                  </CardDescription>
                </div>
                <Badge variant="secondary">Subtotal: ₹{subtotal.toLocaleString()}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Cart is empty</h3>
                  <p>Add products to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-muted-foreground">₹{item.price.toLocaleString()} each</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">₹{item.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Right Section: Customer Info & Payment */}
        <div className="flex flex-col space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Name</Label>
                <Input id="customerName" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Walk-in Customer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input id="customerPhone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Optional" />
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(value: "cash" | "card" | "upi") => setPaymentMethod(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (₹)</Label>
                  <Input id="discount" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0" />
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({taxRate * 100}%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">-₹{discount.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCheckout}
                size="lg"
                className="w-full"
                disabled={cart.length === 0}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Complete Sale
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
