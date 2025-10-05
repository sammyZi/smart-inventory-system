'use client'

import { useAuth } from "@/components/auth-provider"
import { RoleGuard } from "@/components/role-based/RoleGuard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { 
  Calculator, 
  Search, 
  QrCode, 
  ShoppingCart, 
  CreditCard, 
  Printer, 
  Phone, 
  Plus,
  Minus,
  Trash2,
  DollarSign
} from 'lucide-react'
import { useState } from "react"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  total: number
}

interface POSState {
  cart: CartItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  searchQuery: string
}

export default function POSPage() {
  const { user } = useAuth()
  const [posState, setPosState] = useState<POSState>({
    cart: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    searchQuery: ''
  })

  const [currentSale, setCurrentSale] = useState({
    transactionId: '',
    customerInfo: '',
    paymentMethod: 'cash'
  })

  // Sample products for demonstration
  const sampleProducts = [
    { id: '1', name: 'Coffee - Large', price: 4.99, barcode: '123456789' },
    { id: '2', name: 'Sandwich - Turkey', price: 8.99, barcode: '123456790' },
    { id: '3', name: 'Water Bottle', price: 1.99, barcode: '123456791' },
    { id: '4', name: 'Energy Drink', price: 3.49, barcode: '123456792' },
    { id: '5', name: 'Chips - BBQ', price: 2.99, barcode: '123456793' },
    { id: '6', name: 'Candy Bar', price: 1.49, barcode: '123456794' }
  ]

  const addToCart = (product: typeof sampleProducts[0]) => {
    const existingItem = posState.cart.find(item => item.id === product.id)
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      }
      
      const newCart = [...posState.cart, newItem]
      updateCartTotals(newCart)
    }
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    const newCart = posState.cart.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
        : item
    )
    updateCartTotals(newCart)
  }

  const removeFromCart = (itemId: string) => {
    const newCart = posState.cart.filter(item => item.id !== itemId)
    updateCartTotals(newCart)
  }

  const updateCartTotals = (cart: CartItem[]) => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.08 // 8% tax
    const total = subtotal + tax - posState.discount

    setPosState({
      ...posState,
      cart,
      subtotal,
      tax,
      total
    })
  }

  const clearCart = () => {
    setPosState({
      cart: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      searchQuery: ''
    })
  }

  const processPayment = () => {
    // Simulate payment processing
    const transactionId = 'TXN-' + Date.now()
    setCurrentSale({ ...currentSale, transactionId })
    
    // In a real app, this would process the payment
    alert(`Payment processed! Transaction ID: ${transactionId}`)
    clearCart()
  }

  const callManager = () => {
    alert('Manager assistance requested. Please wait for help.')
  }

  const filteredProducts = sampleProducts.filter(product =>
    product.name.toLowerCase().includes(posState.searchQuery.toLowerCase()) ||
    product.barcode.includes(posState.searchQuery)
  )

  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF']}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Point of Sale</h1>
              <Badge variant="outline" className="flex items-center gap-1">
                <Calculator className="h-3 w-3" />
                {user?.role}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={callManager}>
                <Phone className="h-4 w-4 mr-2" />
                Call Manager
              </Button>
              <Button variant="outline">
                <QrCode className="h-4 w-4 mr-2" />
                Scan
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Search and Selection */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search Bar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Search className="h-5 w-5 mr-2" />
                    Product Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Search products by name or scan barcode..."
                    value={posState.searchQuery}
                    onChange={(e) => setPosState({ ...posState, searchQuery: e.target.value })}
                    className="text-lg"
                  />
                </CardContent>
              </Card>

              {/* Product Grid */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Products</CardTitle>
                  <CardDescription>Click to add items to cart</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <Button
                        key={product.id}
                        variant="outline"
                        className="h-20 flex-col p-4"
                        onClick={() => addToCart(product)}
                      >
                        <span className="font-medium text-sm">{product.name}</span>
                        <span className="text-lg font-bold">${product.price}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Shopping Cart and Checkout */}
            <div className="space-y-4">
              {/* Current Cart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Current Sale
                    </span>
                    {posState.cart.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearCart}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {posState.cart.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                      <p>No items in cart</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {posState.cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="w-16 text-right font-medium">
                            ${item.total.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary */}
              {posState.cart.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${posState.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (8%):</span>
                        <span>${posState.tax.toFixed(2)}</span>
                      </div>
                      {posState.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-${posState.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>${posState.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Options */}
              {posState.cart.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={currentSale.paymentMethod === 'cash' ? 'default' : 'outline'}
                          onClick={() => setCurrentSale({ ...currentSale, paymentMethod: 'cash' })}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Cash
                        </Button>
                        <Button
                          variant={currentSale.paymentMethod === 'card' ? 'default' : 'outline'}
                          onClick={() => setCurrentSale({ ...currentSale, paymentMethod: 'card' })}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Card
                        </Button>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={processPayment}
                      >
                        Process Payment (${posState.total.toFixed(2)})
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => alert('Receipt printed!')}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Receipt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Staff Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Staff Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Cashier:</span>
                      <span>{user?.firstName} {user?.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Role:</span>
                      <Badge variant="outline">{user?.role}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Shift:</span>
                      <span className="text-green-600">Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}