"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ManagerSidebar } from "@/components/manager/manager-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Settings, 
  User, 
  Store, 
  Bell, 
  Shield, 
  Palette, 
  Monitor,
  Save,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Clock,
  CreditCard
} from 'lucide-react'
import { useState } from "react"

export default function ManagerSettingsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Store settings state
  const [storeSettings, setStoreSettings] = useState({
    name: "Downtown Store",
    address: "123 Main Street, City, State 12345",
    phone: "+1 234 567 8900",
    email: "downtown@store.com",
    operatingHours: {
      weekdays: "9:00 AM - 9:00 PM",
      weekends: "10:00 AM - 8:00 PM"
    },
    taxRate: "8.5",
    currency: "INR"
  })

  // Notification settings state
  const [notifications, setNotifications] = useState({
    lowStockAlerts: true,
    dailyReports: true,
    salesNotifications: false,
    emailNotifications: true,
    smsNotifications: false,
    thresholds: {
      lowStock: "20",
      criticalStock: "5"
    }
  })

  // Display settings state
  const [display, setDisplay] = useState({
    theme: "light",
    density: "comfortable",
    sidebarCollapsed: false,
    showStockInPOS: true,
    defaultView: "dashboard"
  })

  // Profile settings state
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    role: user?.role || "",
    preferredLanguage: "en",
    timezone: "UTC+05:30"
  })

  if (!user || user.role !== "store_manager") {
    return <div>Access denied</div>
  }

  const handleSave = async (section: string) => {
    setIsLoading(true)
    try {
      console.log(`Saving ${section} settings...`)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log(`${section} settings saved successfully`)
    } catch (error) {
      console.error(`Error saving ${section} settings:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout sidebar={<ManagerSidebar />} title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-600 mt-1">Manage store and account preferences</p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Store
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Display
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Store Settings */}
          <TabsContent value="store">
            <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Store Configuration
                </CardTitle>
                <CardDescription>
                  Manage store information and operational settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="store-name" className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Store Name
                    </Label>
                    <Input
                      id="store-name"
                      value={storeSettings.name}
                      onChange={(e) => setStoreSettings({...storeSettings, name: e.target.value})}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="store-phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="store-phone"
                      value={storeSettings.phone}
                      onChange={(e) => setStoreSettings({...storeSettings, phone: e.target.value})}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="store-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Store Email
                  </Label>
                  <Input
                    id="store-email"
                    type="email"
                    value={storeSettings.email}
                    onChange={(e) => setStoreSettings({...storeSettings, email: e.target.value})}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="store-address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Store Address
                  </Label>
                  <Textarea
                    id="store-address"
                    value={storeSettings.address}
                    onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="weekday-hours" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Weekday Hours
                    </Label>
                    <Input
                      id="weekday-hours"
                      value={storeSettings.operatingHours.weekdays}
                      onChange={(e) => setStoreSettings({
                        ...storeSettings, 
                        operatingHours: {...storeSettings.operatingHours, weekdays: e.target.value}
                      })}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="weekend-hours" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Weekend Hours
                    </Label>
                    <Input
                      id="weekend-hours"
                      value={storeSettings.operatingHours.weekends}
                      onChange={(e) => setStoreSettings({
                        ...storeSettings, 
                        operatingHours: {...storeSettings.operatingHours, weekends: e.target.value}
                      })}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      step="0.1"
                      value={storeSettings.taxRate}
                      onChange={(e) => setStoreSettings({...storeSettings, taxRate: e.target.value})}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Currency
                    </Label>
                    <Select value={storeSettings.currency} onValueChange={(value) => 
                      setStoreSettings({...storeSettings, currency: value})
                    }>
                      <SelectTrigger className="bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="GBP">British Pound (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleSave("store")} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Store Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure alerts and notification settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Low Stock Alerts</Label>
                      <p className="text-sm text-gray-600">Get notified when products are running low</p>
                    </div>
                    <Switch
                      checked={notifications.lowStockAlerts}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, lowStockAlerts: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Daily Reports</Label>
                      <p className="text-sm text-gray-600">Receive daily sales and inventory reports</p>
                    </div>
                    <Switch
                      checked={notifications.dailyReports}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, dailyReports: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sales Notifications</Label>
                      <p className="text-sm text-gray-600">Get instant notifications for sales</p>
                    </div>
                    <Switch
                      checked={notifications.salesNotifications}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, salesNotifications: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, emailNotifications: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={notifications.smsNotifications}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, smsNotifications: checked})
                      }
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="low-stock-threshold">Low Stock Threshold</Label>
                    <Input
                      id="low-stock-threshold"
                      type="number"
                      value={notifications.thresholds.lowStock}
                      onChange={(e) => setNotifications({
                        ...notifications,
                        thresholds: {...notifications.thresholds, lowStock: e.target.value}
                      })}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="critical-stock-threshold">Critical Stock Threshold</Label>
                    <Input
                      id="critical-stock-threshold"
                      type="number"
                      value={notifications.thresholds.criticalStock}
                      onChange={(e) => setNotifications({
                        ...notifications,
                        thresholds: {...notifications.thresholds, criticalStock: e.target.value}
                      })}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleSave("notifications")} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Settings */}
          <TabsContent value="display">
            <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Display Preferences
                </CardTitle>
                <CardDescription>
                  Customize the appearance and behavior of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={display.theme} onValueChange={(value) => 
                      setDisplay({...display, theme: value})
                    }>
                      <SelectTrigger className="bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Density</Label>
                    <Select value={display.density} onValueChange={(value) => 
                      setDisplay({...display, density: value})
                    }>
                      <SelectTrigger className="bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Stock in POS</Label>
                      <p className="text-sm text-gray-600">Display current stock levels in POS system</p>
                    </div>
                    <Switch
                      checked={display.showStockInPOS}
                      onCheckedChange={(checked) => 
                        setDisplay({...display, showStockInPOS: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Collapsed Sidebar</Label>
                      <p className="text-sm text-gray-600">Start with sidebar collapsed by default</p>
                    </div>
                    <Switch
                      checked={display.sidebarCollapsed}
                      onCheckedChange={(checked) => 
                        setDisplay({...display, sidebarCollapsed: checked})
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Default View</Label>
                  <Select value={display.defaultView} onValueChange={(value) => 
                    setDisplay({...display, defaultView: value})
                  }>
                    <SelectTrigger className="bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="pos">POS System</SelectItem>
                      <SelectItem value="products">Products</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={() => handleSave("display")} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Display Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Full Name</Label>
                    <Input
                      id="profile-name"
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email Address</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Phone Number</Label>
                    <Input
                      id="profile-phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profile-role">Role</Label>
                    <Input
                      id="profile-role"
                      value={profile.role}
                      disabled
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Preferred Language</Label>
                    <Select value={profile.preferredLanguage} onValueChange={(value) => 
                      setProfile({...profile, preferredLanguage: value})
                    }>
                      <SelectTrigger className="bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={profile.timezone} onValueChange={(value) => 
                      setProfile({...profile, timezone: value})
                    }>
                      <SelectTrigger className="bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC+05:30">India Standard Time</SelectItem>
                        <SelectItem value="UTC+00:00">UTC</SelectItem>
                        <SelectItem value="UTC-05:00">Eastern Time</SelectItem>
                        <SelectItem value="UTC-08:00">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleSave("profile")} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
