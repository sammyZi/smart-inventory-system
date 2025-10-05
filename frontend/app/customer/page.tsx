'use client'

import { useAuth } from "@/components/auth-provider"
import { RoleGuard } from "@/components/role-based/RoleGuard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Store, 
  Search, 
  ShoppingBag, 
  Star, 
  MapPin, 
  QrCode, 
  Heart,
  Filter,
  Grid,
  List,
  User,
  Gift,
  Clock,
  Truck
} from 'lucide-react'
import { useState } from "react"

interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  rating: number
  reviews: number
  category: string
  inStock: boolean
  image: string
  description: string
}

interface Order {
  id: string
  date: string
  status: 'delivered' | 'in-transit' | 'processing' | 'cancelled'
  total: number
  items: number
}

export default function CustomerPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Sample data
  const loyaltyPoints = 1250
  const nextRewardAt = 1500
  const totalSavings = 45.60

  const recentOrders: Order[] = [
    { id: 'ORD-001', date: '2024-01-15', status: 'delivered', total: 89.99, items: 5 },
    { id: 'ORD-002', date: '2024-01-12', status: 'in-transit', total: 34.50, items: 2 },
    { id: 'ORD-003', date: '2024-01-10', status: 'processing', total: 156.75, items: 8 }
  ]

  const sampleProducts: Product[] = [
    {
      id: '1',
      name: 'Premium Coffee Beans',
      price: 24.99,
      originalPrice: 29.99,
      rating: 4.8,
      reviews: 124,
      category: 'beverages',
      inStock: true,
      image: '/api/placeholder/200/200',
      description: 'Freshly roasted premium coffee beans'
    },
    {
      id: '2',
      name: 'Organic Honey',
      price: 12.99,
      rating: 4.6,
      reviews: 89,
      category: 'food',
      inStock: true,
      image: '/api/placeholder/200/200',
      description: 'Pure organic wildflower honey'
    },
    {
      id: '3',
      name: 'Wireless Earbuds',
      price: 79.99,
      originalPrice: 99.99,
      rating: 4.4,
      reviews: 256,
      category: 'electronics',
      inStock: false,
      image: '/api/placeholder/200/200',
      description: 'High-quality wireless earbuds with noise cancellation'
    },
    {
      id: '4',
      name: 'Yoga Mat',
      price: 34.99,
      rating: 4.7,
      reviews: 78,
      category: 'fitness',
      inStock: true,
      image: '/api/placeholder/200/200',
      description: 'Non-slip premium yoga mat'
    }
  ]

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'beverages', name: 'Beverages' },
    { id: 'food', name: 'Food' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'fitness', name: 'Fitness' }
  ]

  const filteredProducts = sampleProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'delivered': return 'text-green-600'
      case 'in-transit': return 'text-blue-600'
      case 'processing': return 'text-orange-600'
      case 'cancelled': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'delivered': return <Gift className="h-4 w-4" />
      case 'in-transit': return <Truck className="h-4 w-4" />
      case 'processing': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <RoleGuard allowedRoles={['CUSTOMER']}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">Welcome, {user?.firstName}!</h1>
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  CUSTOMER
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Discover great products and track your orders
              </p>
            </div>
            <Button variant="outline">
              <QrCode className="h-4 w-4 mr-2" />
              Scan Product
            </Button>
          </div>

          {/* Loyalty & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loyaltyPoints}</div>
                <p className="text-xs text-muted-foreground">
                  {nextRewardAt - loyaltyPoints} points to next reward
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                <Gift className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalSavings}</div>
                <p className="text-xs text-muted-foreground">
                  From discounts & rewards
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  +1 from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Catalog */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search and Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2" />
                    Product Catalog
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <Button variant="outline" size="icon">
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 flex-wrap">
                        {categories.map((category) => (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            {category.name}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Grid */}
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {filteredProducts.map((product) => (
                  <Card key={product.id} className={`${!product.inStock ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className={`${viewMode === 'grid' ? 'space-y-3' : 'flex gap-4'}`}>
                        <div className={`${viewMode === 'grid' ? 'w-full h-48' : 'w-24 h-24'} bg-gray-100 rounded-lg flex items-center justify-center`}>
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold">{product.name}</h3>
                            <Button variant="ghost" size="sm">
                              <Heart className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm ml-1">{product.rating}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">({product.reviews} reviews)</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">${product.price}</span>
                              {product.originalPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                  ${product.originalPrice}
                                </span>
                              )}
                            </div>
                            
                            {product.inStock ? (
                              <Button size="sm">
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                Add to Cart
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-red-600">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Track your recent purchases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{order.id}</p>
                          <p className="text-xs text-muted-foreground">{order.date}</p>
                          <div className={`flex items-center gap-1 text-xs ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.replace('-', ' ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${order.total}</p>
                          <p className="text-xs text-muted-foreground">{order.items} items</p>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full">
                      View All Orders
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Store Locator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Store Locator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded">
                      <p className="font-medium">Downtown Store</p>
                      <p className="text-sm text-muted-foreground">123 Main St</p>
                      <p className="text-sm text-green-600">Open • 0.5 miles</p>
                    </div>
                    <div className="p-3 border rounded">
                      <p className="font-medium">Mall Location</p>
                      <p className="text-sm text-muted-foreground">456 Shopping Blvd</p>
                      <p className="text-sm text-green-600">Open • 1.2 miles</p>
                    </div>
                    <Button variant="outline" className="w-full">
                      <MapPin className="h-4 w-4 mr-2" />
                      Find Stores
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <QrCode className="h-4 w-4 mr-2" />
                      Scan Product
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Star className="h-4 w-4 mr-2" />
                      Loyalty Rewards
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Account Settings
                    </Button>
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

// Placeholder Package icon component
function Package({ className }: { className?: string }) {
  return (
    <div className={`${className} bg-gray-200 rounded flex items-center justify-center`}>
      <span className="text-gray-500 text-xs">IMG</span>
    </div>
  )
}